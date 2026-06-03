# Design Document: LCLS Virtual Accelerator Lab

## Project Overview

This is a web application for a 2-hour high school STEM lab at SLAC National Accelerator Laboratory. Students explore neural network surrogate models of the Linac Coherent Light Source (LCLS) particle accelerator via interactive sliders, observing how accelerator parameters affect beam shape and X-ray pulse intensity in real time.

The app runs on a shared classroom server with 4-5 student groups (2-3 students each) working simultaneously.

## Architecture

```
Browser (React/Vite)  -->  FastAPI Backend  -->  Model Instances (1 per group)
                                                  ├── Injector+Bmad (beam image)
                                                  └── FEL surrogate (pulse intensity)
```

### Backend: FastAPI with Session Pool

Each student group gets a dedicated model instance pair (injector + FEL). This is necessary because:

- **Bmad/Tao is stateful**: The injector model wraps Bmad via pytao, which maintains internal lattice state. Concurrent access from multiple groups would corrupt the state.
- **Bmad is not thread-safe**: Even with locks, pytao cannot be safely shared across threads.
- **Group routing**: Students connect with `?group=N` in the URL. The backend maps this to a pre-allocated model instance.

The session pool pre-creates all instances at startup (each takes ~5 seconds). This front-loads the cost so students never wait for initialization.

### Frontend: React + Vite + TypeScript

The UI uses direct canvas rendering for the beam image (not Plotly). The FEL output displays as a simple bar gauge. Sliders use HTML range inputs with real-time debounced API calls.

### Models

1. **Injector + Bmad staged model** (from `virtual-accelerator` package): Takes accelerator magnet settings, runs particle tracking through a Bmad lattice, and produces a 2D histogram of particle positions at the OTR4 screen. Output is a beam cross-section image.

2. **FEL surrogate model** (from `lcls-fel-model` package): A PyTorch neural network trained on LCLS operational data. Takes accelerator parameters and predicts hard X-ray pulse intensity in millijoules.

## Key Architecture Decisions

### 1. Canvas Rendering Instead of Plotly

**Problem**: Plotly caused visible flashing on every re-render. Each slider change triggered full SVG DOM recreation, producing a white flash before the new image appeared.

**Solution**: Direct canvas pixel drawing with a "Hot" colormap. The backend sends a normalized 2D array; the frontend writes pixels directly to a canvas ImageData buffer. Result: instant updates with zero DOM manipulation.

### 2. No Loading Overlay

**Problem**: A "Computing..." overlay was added to indicate processing, but it caused its own visual flashing — the overlay appearing/disappearing was more distracting than helpful.

**Solution**: The previous result stays visible until the new one arrives. With ~200ms round-trip times, the slight staleness is imperceptible.

### 3. FEL Intensity Cap at 4 mJ

The physical maximum for LCLS HXR is approximately 4 mJ. The neural network can extrapolate beyond this for extreme input combinations, producing unphysical values. All displayed values are clamped to 4 mJ.

### 4. Narrow Slider Ranges in Combined Tab

**Problem**: The FEL model was trained on a narrow operating range (the accelerator only operates in a small region of parameter space). The injector model accepts a much wider range for educational exploration.

**Solution**: The Combined tab restricts all shared slider ranges to the intersection — specifically, the FEL model's training range. This keeps predictions physically consistent. The Injector-only tab retains wide ranges for free exploration.

### 5. Split Evaluation in Combined Tab

**Problem**: In Combined mode, changing FEL-only sliders would trigger re-evaluation of the injector model. Because Bmad uses random particle sampling, the beam image would flicker slightly even with identical injector inputs.

**Solution**: FEL-only slider changes call only the FEL model endpoint. The beam image is not re-rendered unless an injector-relevant slider changes. This required the backend to identify which sliders are "FEL-only" vs "shared."

### 6. Sensitivity-Based Slider Selection

**Problem**: The FEL model has many input parameters, but students should only see the 5 most impactful ones as interactive sliders.

**Solution**: A sensitivity analysis sweeps each FEL input across its full range while holding others at defaults, measuring the output variance. The top 5 most sensitive non-overlapping inputs become the FEL-only sliders.

**Why dynamic (not hardcoded)**: The FEL model weights are fixed for this lab, so the top-5 results won't change between runs. However, if the model is retrained on new data (which happens periodically as LCLS operating conditions evolve), the most impactful inputs may shift. Keeping the analysis as a cached computation means updating the model only requires deleting `.cache/fel_sensitivity.json` and restarting — no code changes needed.

**Cache behavior**: Results are committed to the repo at `backend/.cache/fel_sensitivity.json` and included in the Docker image. Loaded instantly at startup. If missing, the analysis runs (~60s) and regenerates it. To update after a model change: delete the file, run the compute script, and commit the new version.

### 7. Image Processing Pipeline

The raw OTR4 output is a 1392x1040 pixel histogram in Coulombs (electron charge units). The backend:
1. Normalizes to 0-1 range
2. Crops to the beam region (non-zero area + 10% padding)
3. Downsamples to ~150-200px on the longest axis

This reduces transfer size from ~5.5MB to ~120KB per evaluation while retaining visual detail.

## Tab Behavior

### Injector Tab
- **Sliders**: Solenoid strength, quadrupole magnets, other upstream optics
- **Output**: 2D beam cross-section image (heatmap) at OTR4 screen location
- **Ranges**: Wide — allows exploration beyond normal operating conditions
- **Secondary output**: Beam size (sigma_x, sigma_y) in mm

### FEL Tab
- **Sliders**: Top 5 most impactful FEL parameters (determined by sensitivity analysis)
- **Output**: Pulse intensity bar gauge (0-4 mJ)
- **Ranges**: FEL model training range only

### Combined Tab
- **Sliders**: Shared parameters (injector + FEL overlap) plus FEL-only sliders
- **Output**: Beam image (left) + pulse intensity (right), side-by-side
- **Ranges**: Restricted to FEL training range for consistency
- **Evaluation logic**: Shared slider change triggers both models; FEL-only slider change triggers only FEL model

## Known Limitations

1. **Beam can be lost**: Extreme slider values can steer the beam off-screen entirely. The backend returns a blank 50x50 array in this case. Students see an empty heatmap.

2. **Stochastic beam image**: Bmad particle tracking uses random sampling. Identical inputs produce slightly different images. This is physically correct but can confuse students expecting deterministic output.

3. **Sensitivity analysis cache staleness**: If model weights or input definitions change, the cached sensitivity results become invalid. The cache file must be manually deleted.

4. **Memory footprint**: Each model instance pair uses ~2GB. With 6 groups, that is ~12GB of RAM just for models, plus the base application overhead.

5. **Cold start time**: Pre-creating 6 model instances takes ~30 seconds. The server does not accept requests until all instances are ready.

6. **No persistence**: Student slider states are not saved. Refreshing the page resets to defaults.

## Deployment: SLAC Kubernetes

### Architecture: One Pod Per Group

Each student group gets its own pod with exactly one model instance. This avoids:
- **Torch double-load segfaults** (multiple torch contexts in one process)
- **Cascading failures** (one group's crash doesn't affect others)
- **Thread contention** (each pod's resource limit matches its thread count)

This follows the same pattern as `lume-visualizations` (StatefulSet + per-pod Services + Ingress routing) but is simpler: no allocator needed since groups are pre-assigned.

### Target Environment

SLAC's S3DF runs Kubernetes. Deployed to the same cluster and host as lume-visualizations (`ard-modeling-service.slac.stanford.edu`), under the path `/ai-lab/`.

### Infrastructure

| Component | Purpose |
|-----------|---------|
| StatefulSet (6 replicas) | One pod per group, predictable names (`lcls-lab-worker-0` through `-5`) |
| Per-pod Services (`lcls-lab-g1` through `g6`) | Route ingress paths to specific pods |
| Headless Service | Required by StatefulSet for pod DNS |
| Ingress | Path-based routing: `/ai-lab/g1` → worker-0, etc. |
| ConfigMap | Env vars + pre-computed sensitivity cache |
| PVC | lcls-lattice volume (shared read-only across all pods) |

### Thread Pinning (Critical)

In K8s, `os.cpu_count()` returns the host CPU count (e.g., 64) but pods are cgroup-limited to 2 cores. Without thread pinning, PyTorch and OpenMP spawn 64 threads on 2 cores → **30-50x slowdown** (5-10s per eval instead of 180ms).

Env vars set in StatefulSet:
```
OMP_NUM_THREADS=2
MKL_NUM_THREADS=2
OPENBLAS_NUM_THREADS=2
TORCH_NUM_THREADS=2
```

The backend also calls `torch.set_num_threads(2)` at import time.

### Resources Per Pod

- **Memory**: request 2Gi, limit 3Gi
- **CPU**: request 1000m, limit 2000m
- **Startup time**: ~30s (model loading + sensitivity cache read)

### Network Topology

```
Students → https://ard-modeling-service.slac.stanford.edu/ai-lab/g1/
                                                            /ai-lab/g2/
                                                            ...
                                                            /ai-lab/g6/
         → nginx Ingress (same as lume-visualizations)
         → per-pod Service → StatefulSet pod (FastAPI + models)
```

### Deployment Commands

```bash
# Build and push image
docker build -t ghcr.io/slaclab/lcls-surrogate-lab:latest .
docker push ghcr.io/slaclab/lcls-surrogate-lab:latest

# Deploy
cd deploy/kubernetes
kubectl apply -k .

# Verify
kubectl get pods -n lcls-surrogate-lab
kubectl logs -n lcls-surrogate-lab lcls-lab-worker-0
```

### Health Checks

- **Startup probe**: GET `/api/config`, allows up to 3 min for model loading
- **Readiness probe**: GET `/api/config`, marks pod ready for traffic
- **Liveness probe**: GET `/api/config`, restarts pod if unresponsive

### Failure Modes

| Scenario | Behavior |
|----------|----------|
| One pod OOM/segfault | Only that group loses state. Pod auto-restarts in ~30s. Others unaffected. |
| All pods restart | All groups see "Waiting for data..." for ~30s, then resume. |
| Slider causes model error | Backend returns 500, frontend shows error message. Other groups unaffected. |
| Pod exceeds CPU | Evaluation slows but doesn't crash (thread pinning prevents worst case). |
