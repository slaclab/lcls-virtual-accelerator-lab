# LCLS Virtual Accelerator Lab

Interactive web application for high school students to explore neural network surrogate models of the LCLS particle accelerator at SLAC. Students adjust accelerator parameters via sliders and observe real-time changes to beam shape and X-ray pulse intensity.

## Prerequisites

- **Conda** (miniconda or mambaforge)
- **Node.js** 18+ and npm
- **lcls-lattice** repository cloned locally (`git clone https://github.com/slaclab/lcls-lattice`)

## Local Development Setup

### 1. Create the conda environment

```bash
conda env create -f environment.yml
conda activate lcls-surrogate-lab
```

This installs Python 3.12, `pytao` (with the Bmad shared library `libtao` from conda-forge), PyTorch, FastAPI, and both model packages (`virtual-accelerator`, `lcls-fel-model`).

**Why conda?** The `pytao` package wraps the Bmad accelerator simulation library, which ships a compiled Fortran shared library (`libtao`). This is only distributed via conda-forge — it cannot be installed with pip alone.

### 2. Set environment variables

```bash
export LCLS_LATTICE=/path/to/lcls-lattice
export KMP_DUPLICATE_LIB_OK=TRUE
export NUM_GROUPS=1  # Use 1 for development (each instance takes ~5s to create)
```

### 3. Pre-compute sensitivity cache (first time only)

The FEL tab exposes the 5 most impactful model inputs as sliders. These are determined by a sensitivity analysis that sweeps all inputs and ranks them by output impact. Results are cached so they only need to be computed once — but if the FEL model is updated (retrained on new data), delete the cache file and regenerate to pick up any shift in the most impactful parameters.

If `backend/.cache/fel_sensitivity.json` does not exist, the server will compute it on first startup (~60 seconds). To avoid timeouts, generate it manually:

```bash
cd backend
python -c "from sensitivity import compute_sensitivity; compute_sensitivity()"
```

### 4. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Wait for "Application startup complete" — model pool initialization takes a few seconds.

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Open in browser

```
http://localhost:5173/?group=1
```

The `?group=N` parameter routes to a specific model instance. Use `group=1` for development.

## Production Deployment

### Docker Compose

```bash
export LCLS_LATTICE_PATH=/path/to/lcls-lattice
export NUM_GROUPS=6  # One per student group
docker compose up --build
```

Students access: `http://<server-ip>:8000/?group=N` (N = 1 through NUM_GROUPS)

The Docker image uses conda-forge for pytao and bundles the frontend as static files served by FastAPI.

### Docker Build Notes

- The image is large (~4GB) due to conda + Bmad + PyTorch
- The `lcls-lattice` directory is mounted as a volume, not baked into the image
- Pre-computed `fel_sensitivity.json` should be included in `backend/.cache/` before building

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `LCLS_LATTICE` | Yes | — | Path to lcls-lattice directory |
| `KMP_DUPLICATE_LIB_OK` | Yes | — | Set to `TRUE` to suppress OpenMP duplicate library error |
| `NUM_GROUPS` | No | 6 | Number of model instances to pre-create |

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
2. **FEL**: Adjust accelerator parameters, maximize X-ray pulse energy (0-4 mJ)
3. **Combined**: Shared sliders show how upstream changes affect both beam shape and FEL output simultaneously

## Architecture

- **Backend**: FastAPI (Python) with session-pooled model instances (one per student group)
- **Frontend**: React + Vite + TypeScript with canvas-based beam image rendering
- **Models**:
  - Injector + Bmad staged model from `virtual-accelerator` (beam image at OTR4)
  - FEL surrogate model from `lcls-fel-model` (pulse intensity in mJ)
- **Session management**: One model instance pair per student group, routed via `?group=N` URL parameter

## Troubleshooting

### "No module named 'pytao'" or "libtao not found"

You are not in the correct conda environment. Run `conda activate va-dev-2`.

### "LCLS_LATTICE environment variable not set"

Export the path: `export LCLS_LATTICE=/path/to/lcls-lattice`

### "OMP: Error #15: Initializing libomp, but found libiomp5 already initialized"

Set `export KMP_DUPLICATE_LIB_OK=TRUE`. This happens because both PyTorch and Bmad link their own copy of OpenMP.

### Server hangs on startup

The sensitivity analysis is computing (~60 seconds). Either wait, or pre-compute it (see setup step 3).

### Blank beam image

The beam is "lost" — extreme slider values steered particles off the OTR4 screen. This is expected behavior. Reset sliders or move them to less extreme values.

### Frontend shows connection errors

Ensure the backend is running on port 8000. The Vite dev server proxies `/api` requests to `localhost:8000`.

### Docker: "Killed" during startup

The container ran out of memory. Each model instance needs ~2GB. For 6 groups, allocate at least 16GB to the container.
