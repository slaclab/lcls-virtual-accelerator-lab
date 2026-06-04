# LCLS Virtual Accelerator Lab

Interactive web application for high school students to explore neural network surrogate models of the LCLS particle accelerator at SLAC. Students adjust accelerator parameters via sliders and observe real-time changes to beam shape and X-ray pulse intensity.

## Prerequisites

- **Conda** (miniconda or mambaforge)
- **Node.js** 18+ and npm (for frontend development only; not needed for Docker deployment)

## Key Packages (installed via `environment.yml`)

| Package | Source | Purpose |
|---------|--------|---------|
| `pytao` | conda-forge | Python interface to Bmad/Tao accelerator simulation (includes `libtao` shared library) |
| `bmad` | conda-forge | Accelerator lattice simulation engine |
| `torch` | pip (CPU) | Neural network inference |
| `virtual-accelerator[surrogate,bmad]` | [GitHub](https://github.com/slaclab/virtual-accelerator) | Staged model: injector NN + Bmad beam tracking |
| `lcls-fel-model` | [GitHub](https://github.com/slaclab/LCLS_FEL_Surrogate) | FEL pulse intensity surrogate model |
| `fastapi` / `uvicorn` | pip | Backend web server |

## Local Development Setup

### 1. Create the conda environment

```bash
conda env create -f environment.yml
conda activate lcls-surrogate-lab
```

**Why conda?** The `pytao` package wraps the Bmad accelerator simulation library, which ships a compiled Fortran shared library (`libtao`). This is only distributed via conda-forge — it cannot be installed with pip alone.

### 2. Set environment variables

```bash
export LCLS_LATTICE=/path/to/lcls-lattice
export KMP_DUPLICATE_LIB_OK=TRUE
export NUM_GROUPS=1  # Use 1 for development (each instance takes ~5s to create)
```

The `lcls-lattice` repo contains Bmad lattice definition files. Clone it from https://github.com/slaclab/lcls-lattice if you don't have it.

### 3. Sensitivity cache (usually no action needed)

The FEL tab exposes the 5 most impactful model inputs as sliders, determined by a sensitivity analysis. The results are committed to the repo at `backend/.cache/fel_sensitivity.json` and loaded instantly at startup.

**Regenerate only if the FEL model is updated** (retrained on new data):

```bash
cd backend
rm .cache/fel_sensitivity.json
python -c "from sensitivity import compute_sensitivity; compute_sensitivity()"
```

Then commit the updated file. If the cache file is missing at startup, the server will recompute it (~60 seconds).

### 4. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Wait for "Application startup complete" — model pool initialization takes ~25 seconds.

### 5. Start the frontend (development)

```bash
cd frontend
npm install
npm run dev
```

### 6. Open in browser

```
http://localhost:5173/?group=1
```

The Vite dev server proxies `/api` requests to the backend at `localhost:8000`.

### Production mode (no separate frontend server)

```bash
cd frontend && npm run build && cd ..
cd backend
uvicorn main:app --port 8000
```

Open `http://localhost:8000/` — FastAPI serves the built frontend directly.

## Kubernetes Deployment

The app deploys on SLAC's S3DF Kubernetes cluster as a StatefulSet with one pod per student group.

### Architecture

- 6-replica StatefulSet (one pod per group, each with one model instance)
- Per-pod Services with path-based Ingress routing
- Served at `https://ard-modeling-service.slac.stanford.edu/ai-lab/g1/` through `/ai-lab/g6/`
- Docker image bakes in `lcls-lattice` and the sensitivity cache — no volumes needed

### Deploy

```bash
# Build and push (or let CI handle this via .github/workflows/build-container.yml)
docker build -t ghcr.io/slaclab/lcls-surrogate-lab:latest .
docker push ghcr.io/slaclab/lcls-surrogate-lab:latest

# Apply manifests
cd deploy/kubernetes
kubectl apply -k .

# Verify
kubectl get pods -n lcls-surrogate-lab -w
```

### Docker Build Notes

- Image is ~5.6GB (conda + Bmad + PyTorch)
- Forced `linux/amd64` platform (Bmad not available for arm64)
- `lcls-lattice` is cloned into the image at `/opt/lcls-lattice`
- `virtual-accelerator` is cloned at `/opt/virtual-accelerator` (subtree directory needed at runtime)
- `lume-bmad` and `lume-torch` are pinned to specific commits for compatibility

### CI

Pushing to `main` or creating a version tag triggers `.github/workflows/build-container.yml`, which builds and pushes to `ghcr.io/slaclab/lcls-surrogate-lab`.

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `LCLS_LATTICE` | Yes | `/opt/lcls-lattice` (in Docker) | Path to lcls-lattice directory |
| `KMP_DUPLICATE_LIB_OK` | Yes | `TRUE` (in Docker) | Suppress OpenMP duplicate library error |
| `NUM_GROUPS` | No | `1` | Number of model instances to pre-create per pod |
| `OMP_NUM_THREADS` | No | `2` | Thread pinning for OpenMP (critical in K8s) |
| `MKL_NUM_THREADS` | No | `2` | Thread pinning for MKL |
| `TORCH_NUM_THREADS` | No | `2` | Thread pinning for PyTorch |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Slider configurations for all tabs |
| `/api/injector/evaluate` | POST | Evaluate injector model (beam image) |
| `/api/fel/evaluate` | POST | Evaluate FEL model (pulse intensity) |
| `/api/combined/evaluate` | POST | Evaluate both models |
| `/api/reset` | POST | Reset models to default values |

Request body for evaluate endpoints: `{"group": 1, "inputs": {"param_name": value, ...}}`

## Tabs

1. **Injector**: Adjust solenoid and quadrupole settings, observe beam cross-section changes in real time
2. **FEL**: Adjust accelerator parameters, maximize X-ray pulse energy (0–4 mJ)
3. **Combined**: Shared sliders (restricted to FEL training range) show how upstream changes affect both beam shape and FEL output simultaneously

## Architecture

- **Backend**: FastAPI (Python) with one model instance per pod
- **Frontend**: React + Vite + TypeScript with canvas-based beam image rendering
- **Models**:
  - Injector + Bmad staged model from `virtual-accelerator` (beam image at OTR4 screen)
  - FEL surrogate model from `lcls-fel-model` (pulse intensity in mJ)
- **K8s deployment**: StatefulSet with per-pod Services, path-based Ingress routing (`/ai-lab/gN/`)
- **Thread pinning**: Critical in K8s — without it, PyTorch/OpenMP spawn 64 threads on 2 cores causing 30–50x slowdown

## Troubleshooting

### "No module named 'pytao'" or "libtao not found"

You are not in the correct conda environment. Run `conda activate lcls-surrogate-lab` (or recreate with `conda env create -f environment.yml`).

### "TAO INITIALIZATION FILE NOT FOUND"

`LCLS_LATTICE` is pointing to the wrong path. Verify the directory exists and contains `bmad/models/cu_hxr/tao.init`.

### "OMP: Error #15: Initializing libomp, but found libiomp5 already initialized"

Set `export KMP_DUPLICATE_LIB_OK=TRUE`. This happens because both PyTorch and Bmad link their own copy of OpenMP.

### Server takes ~25s to start

Normal — Bmad lattice initialization takes time. The K8s startup probe allows up to 180 seconds.

### Blank beam image

The beam is "lost" — extreme slider values steered particles off the OTR4 screen. This is expected behavior. Reset sliders or move them to less extreme values.

### Blank page in K8s deployment

Check that `base: './'` is set in `frontend/vite.config.ts`. Without it, asset paths are absolute (`/assets/...`) which don't work behind path-based ingress rewriting.

### Frontend shows connection errors (local dev)

Ensure the backend is running on port 8000. The Vite dev server proxies `/api` requests to `localhost:8000`.

### Docker: "Killed" during startup

The container ran out of memory. Each model instance needs ~2GB. Ensure the pod has at least 2Gi memory limit.

### K8s: CrashLoopBackOff

Check logs with `kubectl logs <pod> -n lcls-surrogate-lab`. Common causes:
- Wrong `LCLS_LATTICE` path (should be `/opt/lcls-lattice` in the Docker image)
- Package version mismatch (check pinned commits in Dockerfile)
