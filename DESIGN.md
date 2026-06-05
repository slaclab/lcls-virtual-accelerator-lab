# Design Document: LCLS Virtual Accelerator Lab

## Project Overview

This is a web application for a 2-hour high school STEM lab at SLAC National Accelerator Laboratory. Students (ages 14-17, groups of 2-3, 11 students total) explore neural network surrogate models of the Linac Coherent Light Source (LCLS) particle accelerator via interactive sliders, observing how accelerator parameters affect beam shape and X-ray pulse intensity in real time.

The lab sits within a larger session: 30 min intro-to-AI talk, 30 min intro-to-lab talk, 2 hours hands-on lab, 30 min wrap-up talk.

## Architecture

```
Browser (React/Vite)  -->  FastAPI Backend  -->  Model Instance (1 per container)
                                                  ├── Injector+Bmad (beam image)
                                                  └── FEL surrogate (pulse intensity)
```

Each student group connects to its own isolated container. Routing is handled externally (nginx, K8s ingress, or separate cloud hosted apps depending on deployment method).

### Backend: FastAPI

Each container runs one model instance pair (injector + FEL). This is necessary because:

- **Bmad/Tao is stateful**: The injector model wraps Bmad via pytao, which maintains internal lattice state.
- **Bmad is not thread-safe**: pytao cannot be safely shared across threads.
- **Torch double-load risk**: Multiple torch model instances in a single process can segfault (observed in lume-visualizations).
- **Fault isolation**: If one group's container crashes, others are unaffected.

### Frontend: React + Vite + TypeScript

The UI uses direct canvas rendering for the beam image (not Plotly; see decision #1 below). The FEL output displays as a bar gauge. Sliders use HTML range inputs with debounced API calls (300ms). Asset paths are relative (`base: './'` in Vite config) to work behind any path-based routing prefix.

Group number is detected from the URL path (`/g1/`, `/ai-lab/g3/`, etc.) or `?group=N` query param as fallback.

### Models

1. **Injector + Bmad staged model** (from `virtual-accelerator` package): Takes accelerator magnet settings, runs particle tracking through a Bmad lattice, and produces a 2D histogram of particle positions at the OTR4 screen. Output is a beam cross-section image.

2. **FEL surrogate model** (from `lcls-fel-model` package): A PyTorch neural network trained on LCLS operational data. Takes accelerator parameters and predicts hard X-ray pulse intensity in millijoules. Output key: `GDET:FEE1:241:ENRC`.

## Key Architecture Decisions

### 1. Canvas Rendering Instead of Plotly

**Problem**: Plotly caused visible flashing on every re-render. Each slider change triggered full SVG DOM recreation, producing a white flash before the new image appeared. Additionally, `react-plotly.js` has CJS/ESM interop issues with Vite that prevented it from loading at all.

**Solution**: Direct canvas pixel drawing with a "Hot" colormap. The backend sends a normalized 2D array; the frontend writes pixels directly to a canvas ImageData buffer. Result: instant updates with zero DOM manipulation.

### 2. No Loading Overlay

**Problem**: A "Computing..." overlay was added to indicate processing, but it caused its own visual flashing.

**Solution**: The previous result stays visible until the new one arrives. With ~200ms round-trip times, the slight staleness is imperceptible.

### 3. FEL Intensity Cap at 4 mJ

The physical maximum for LCLS HXR is approximately 4 mJ. The neural network can extrapolate beyond this for extreme input combinations, producing unphysical values. All displayed values are clamped to 4 mJ.

### 4. Narrow Slider Ranges in Combined Tab

**Problem**: The FEL model was trained on a narrow operating range (the accelerator only operates in a small region of parameter space). The injector model accepts a much wider range for educational exploration.

**Solution**: The Combined tab restricts all shared slider ranges to the FEL model's training range. This keeps predictions physically consistent (small beam correlates with high intensity). The Injector-only tab retains wide ranges for free exploration.

### 5. Split Evaluation in Combined Tab

**Problem**: In Combined mode, changing FEL-only sliders would trigger re-evaluation of the injector model. Because Bmad uses random particle sampling, the beam image would flicker slightly even with identical injector inputs.

**Solution**: FEL-only slider changes call only the FEL model endpoint. The beam image is not re-rendered unless a shared slider changes.

### 6. Sensitivity-Based Slider Selection

**Problem**: The FEL model has 341 input parameters, but students should only see the 5 most impactful ones as interactive sliders.

**Solution**: A sensitivity analysis sweeps each FEL input across its full range while holding others at defaults, measuring the output variance. The top 5 most sensitive non-overlapping inputs become the FEL-only sliders.

**Why dynamic (not hardcoded)**: If the model is retrained on new data, the most impactful inputs may shift. Keeping the analysis as a cached computation means updating the model only requires deleting the cache and rerunning.

**Cache behavior**: Results are committed to the repo at `backend/.cache/fel_sensitivity.json` and included in the Docker image. Loaded instantly at startup. If missing, the analysis runs (~60s) and regenerates it.

### 7. Image Processing Pipeline

The raw OTR4 output is a 1392x1040 pixel histogram in Coulombs (electron charge units). The backend:
1. Normalizes to 0-1 range
2. Crops to the beam region (non-zero area + 10% padding)
3. Downsamples to ~150-200px on the longest axis

This reduces transfer size from ~5.5MB to ~120KB per evaluation while retaining visual detail.

### 8. One Container Per Group

**Problem**: Running all 6 groups in a single process (`NUM_GROUPS=6`) risks torch double-load segfaults and cascading failures (one crash kills all groups).

**Solution**: Each group gets its own container with exactly one model instance. This mirrors the lume-visualizations architecture (which hit this exact problem with marimo). Routing is handled externally.

### 9. Thread Pinning

**Problem**: In containerized environments, `os.cpu_count()` returns the host CPU count (e.g., 64) but the container is cgroup-limited to 2 cores. PyTorch and OpenMP spawn 64 threads on 2 cores, causing 30-50x slowdown.

**Solution**: Set `OMP_NUM_THREADS=2`, `MKL_NUM_THREADS=2`, `OPENBLAS_NUM_THREADS=2`, `TORCH_NUM_THREADS=2` in all deployment configurations. The backend also sets these via `os.environ.setdefault()` at the top of `main.py`.

### 10. Relative Asset Paths

**Problem**: Default Vite builds produce absolute asset paths (`/assets/index.js`). Behind path-based routing (`/g1/`, `/ai-lab/g1/`), the browser requests assets at the wrong path and gets 404s.

**Solution**: `base: './'` in `vite.config.ts` produces relative paths (`./assets/index.js`). The browser resolves these relative to the current page URL, which correctly routes through the proxy/ingress.

### 11. Cache-Control Headers

**Problem**: Browsers cache 404 responses for assets, causing blank pages after redeployment.

**Solution**: Backend middleware sets `Cache-Control: no-cache` on HTML (always revalidate) and `Cache-Control: public, max-age=31536000, immutable` on hashed assets (safe to cache forever since filenames change on each build).

## Tab Behavior

### Injector Tab
- **Sliders**: Solenoid current + 4 quadrupole magnets (511, 525, 425, 441)
- **Output**: 2D beam cross-section image (canvas heatmap) at OTR4 screen
- **Ranges**: Wide (full injector model range for educational exploration)
- **Secondary output**: Beam size (sigma_x, sigma_y) in micrometers

### FEL Tab
- **Sliders**: 5 shared injector inputs + 5 most impactful FEL-only inputs (from sensitivity analysis)
- **Output**: Pulse intensity gauge (0-4 mJ)
- **Ranges**: Full model range

### Combined Tab
- **Sliders**: 5 shared (restricted to FEL training range) + 5 FEL-only
- **Output**: Beam image + pulse intensity, side by side
- **Evaluation logic**: Shared slider change triggers both models; FEL-only slider change triggers only FEL model

## Known Limitations

1. **Beam can be lost**: Extreme slider values can steer the beam off-screen entirely. The backend returns a blank array. Students see an empty heatmap.

2. **Stochastic beam image**: Bmad particle tracking uses random sampling. Identical inputs produce slightly different images.

3. **No persistence**: Student slider states are not saved. Refreshing the page resets to defaults.

4. **Cold start time**: Model initialization takes ~25-30s per container. Health probes allow up to 3 minutes.

5. **Image size is 5.6GB**: The Docker image is large due to conda + Bmad + PyTorch + lcls-lattice. CI builds take ~5-10 minutes.

## Deployment Options

The same Docker image is used for all deployment methods. The only difference is how routing is handled.

### Option A: SLAC Kubernetes

- StatefulSet with 6 replicas
- Per-pod Services + path-based Ingress with rewrite-target
- Served at `https://ard-modeling-service.slac.stanford.edu/ai-lab/g1/` through `/g6/`
- Need to remove whitelist from ingress to make it public + run by IT
- Manifests: `deploy/kubernetes/`

### Option A: Fly.io (public, per-group apps)

Best for the student lab (public access, no SLAC login required).

- 6 separate Fly.io apps (`lcls-lab-g1` through `g6`)
- Each app runs one machine with the Docker image
- Students access `https://lcls-lab-g1.fly.dev/` through `g6`
- Deploy/teardown via `deploy/fly_deploy.sh`
- Cost: under $1 for a 4-hour lab
- Scale to 0 between labs (no billing)

### Option B: AWS EC2 + Docker Compose (public, single VM)

Alternative for public access via SLAC AWS.

- Single `r6i.xlarge` instance (32GB RAM)
- 6 containers + nginx reverse proxy via `docker-compose.yml`
- Students access `http://<ip>/g1/` through `/g6/`
- Deploy instructions: `docs/deploy-ec2.md`
- Cost: under $2 for a 4-hour lab


### Thread Pinning (all deployments)

Required in all containerized deployments:
```
OMP_NUM_THREADS=2
MKL_NUM_THREADS=2
OPENBLAS_NUM_THREADS=2
TORCH_NUM_THREADS=2
```

### Health Checks

- **Startup probe**: GET `/api/config`, allows up to 3 min for model loading
- **Readiness probe**: GET `/api/config`, marks container ready for traffic
- **Liveness probe**: GET `/api/config`, restarts container if unresponsive

### Failure Modes

| Scenario | Behavior |
|----------|----------|
| One container crashes | Only that group affected. Auto-restarts in ~30s. Others unaffected. |
| All containers restart | All groups see "Waiting for data..." for ~30s, then resume. |
| Slider causes model error | Backend returns 500, frontend shows error message. Other groups unaffected. |
| Container exceeds CPU | Evaluation slows but doesn't crash (thread pinning prevents worst case). |

## Dockerfile Pinning

The Docker image pins specific commits for compatibility:
- `virtual-accelerator`: commit `77bbda8` (cloned to `/opt/virtual-accelerator`, subtree needed at runtime)
- `lume-bmad`: commit `e49c6891` (force-reinstalled after virtual-accelerator to override)
- `lume-torch`: commit `acd21eb1` (same reason)
- `lcls-lattice`: commit `52ad1a5d` (cloned to `/opt/lcls-lattice`)
- Platform: forced `linux/amd64` (Bmad not available for arm64)
- PyTorch: CPU-only from `download.pytorch.org/whl/cpu`
