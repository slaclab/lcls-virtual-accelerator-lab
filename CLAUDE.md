# CLAUDE.md — AI Development Guide

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app, lifespan (pool init), all endpoints, cache-control middleware
│   ├── session_pool.py      # Model instance management (one injector + one FEL per container)
│   ├── sensitivity.py       # FEL sensitivity sweep + caching logic
│   ├── schemas.py           # Pydantic models for request/response
│   ├── config.py            # Slider definitions, ranges (wide for injector, narrow for combined), env vars
│   ├── requirements.txt     # pip deps (excludes virtual-accelerator, lcls-fel-model)
│   └── .cache/
│       └── fel_sensitivity.json  # Committed to repo, baked into Docker image
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Tab navigation, group detection from URL path or ?group=N
│   │   ├── App.css           # All styles (single file, compact for 13" screens)
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── api/client.ts     # fetch wrappers, API_BASE = "." for relative URLs
│   │   └── components/
│   │       ├── InjectorPanel.tsx   # Injector tab (evaluates on mount + slider change)
│   │       ├── FELPanel.tsx        # FEL tab
│   │       ├── CombinedPanel.tsx   # Combined tab (split eval: shared vs FEL-only)
│   │       ├── BeamImage.tsx       # Canvas-based 2D heatmap (Hot colormap)
│   │       ├── IntensityGauge.tsx  # FEL output bar (0-4 mJ, color-coded)
│   │       ├── SliderControl.tsx   # Reusable labeled slider
│   │       └── ScalarDisplay.tsx   # Beam size readout
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts        # base: './', proxy /api -> localhost:8000
├── deploy/
│   ├── kubernetes/           # StatefulSet + Services + Ingress for SLAC S3DF
│   ├── nginx.conf            # Routing config for docker-compose deployment
│   ├── fly_deploy.sh         # Script to deploy 6 Fly.io apps
│   └── ...
├── docs/
│   ├── student-worksheet.md  # Printable lab worksheet (30 questions)
│   ├── answer-key.md         # Instructor answer key
│   ├── lab-plan.md           # Full lab plan (schedule, pedagogy, webapp requirements)
│   ├── talk-outlines.md      # Outlines for the two 30-min talks
│   ├── deploy-ec2.md         # Step-by-step EC2 deployment
│   └── deploy-flyio.md       # Step-by-step Fly.io deployment
├── Dockerfile                # Multi-stage: node build + conda/pytao/bmad runtime
├── docker-compose.yml        # 6 containers + nginx (for VM deployment)
├── fly.toml                  # Fly.io config (per-group: min_machines=1)
├── environment.yml           # Conda env spec (reproduces the full dev environment)
├── .github/workflows/
│   └── build-container.yml   # CI: builds and pushes to ghcr.io on push to main
├── DESIGN.md                 # Architecture decisions and deployment options
└── README.md                 # Setup, usage, troubleshooting
```

## Model Interfaces

### Injector Model (virtual-accelerator)

The injector model is a staged model wrapping Bmad/Tao via pytao. Key facts:

- **Instantiation**: `get_cu_hxr_staged_model(track_beam=True, end_element="OTR4")`
- **Stateful**: Each instance maintains internal Bmad lattice state. One instance per container.
- **Thread-unsafe**: pytao calls are not thread-safe. Accessed sequentially via asyncio lock.
- **Set inputs**: `model.set({"SOLN:IN20:121:BCTRL": 0.478, ...})`
- **Get image**: `model.get("OTRS:IN20:711:Image:ArrayData")` returns 2D numpy array (1392x1040, values in Coulombs)
- **Get particles**: `model.get("OTR4_beam")` returns ParticleGroup with `.x`, `.y` arrays
- **Stochastic**: Random particle sampling means identical inputs produce slightly different outputs.
- **Can return zeros**: If beam is lost (extreme settings), the histogram is all zeros.
- **Requires subtree**: The `virtual-accelerator` package must be cloned (not pip installed from URL) because the injector NN weights live in `subtrees/lcls_cu_injector_ml_model/`.

### FEL Model (lcls-fel-model)

A PyTorch neural network surrogate. Key facts:

- **Instantiation**: `from lcls_fel_model import load_model; model = load_model()`
- **Evaluation**: `model.evaluate({"ACCL:LI25:1:ADES": 6260.0})`
- **Output key**: `GDET:FEE1:241:ENRC`. NOT `hxr_pulse_intensity`.
- **`input_variables` is a list**, not a dict. Each element is a `TorchScalarVariable` with:
  - `.name` (str)
  - `.value_range` (tuple of min, max)
  - `.default_value` (float)
- **341 inputs total**, but most have narrow ranges. Sensitivity analysis picks the top 5.
- **Trained on narrow range**: Extrapolation produces unphysical values. Always cap output at 4 mJ.
- **Deterministic**: Same inputs always produce same output.

## Environment Setup

### Create the conda environment from `environment.yml`

```bash
conda env create -f environment.yml
conda activate lcls-surrogate-lab
```

The `environment.yml` specifies:
- Python 3.12
- `pytao` from conda-forge (provides `libtao` shared library)
- pip packages: torch, fastapi, uvicorn, virtual-accelerator[surrogate,bmad] (GitHub), lcls-fel-model (GitHub)

You CANNOT use pip alone. The `pytao` package requires `libtao.so`/`libtao.dylib` which is only distributed via conda-forge.

### Required environment variables

```bash
export LCLS_LATTICE=/path/to/lcls-lattice  # Clone from https://github.com/slaclab/lcls-lattice
export KMP_DUPLICATE_LIB_OK=TRUE
export NUM_GROUPS=1  # For development
```

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError: pytao` | Wrong conda env | `conda activate lcls-surrogate-lab` |
| `libtao not found` | Wrong conda env or missing conda package | `conda env create -f environment.yml` then activate |
| `OMP: Error #15` | torch and bmad both ship libomp | `export KMP_DUPLICATE_LIB_OK=TRUE` |
| `LCLS_LATTICE not set` | Missing env var | Export the path to lcls-lattice repo |
| `TAO INITIALIZATION FILE NOT FOUND` | Wrong `LCLS_LATTICE` path | Verify path contains `bmad/models/cu_hxr/tao.init` |
| Server startup timeout | Sensitivity cache missing (~60s recompute) | File should be committed at `backend/.cache/fel_sensitivity.json` |
| `KeyError: 'hxr_pulse_intensity'` | Wrong output key | Use `GDET:FEE1:241:ENRC` |
| `TypeError: 'list' object has no attribute 'keys'` | Treating `input_variables` as dict | It is a list of objects, iterate with `.name` attribute |
| Server hangs during startup | `import torch` at top of main.py | Do NOT import torch explicitly; just set env vars. Let model packages handle it. |
| Blank beam image in UI | Beam lost (zeros array) | Expected at extreme slider values. Backend handles gracefully. |
| Blank page after deploy | Absolute asset paths (`/assets/...`) | Ensure `base: './'` in `vite.config.ts` |
| Blank page (cached) | Browser cached old 404 responses | Cache-control headers prevent this; hard refresh (Cmd+Shift+R) for existing sessions |
| Docker build: `input_beam` error | lume-bmad version mismatch | Force-reinstall pinned lume-bmad AFTER virtual-accelerator (see Dockerfile) |
| Docker build: `bmad` not found | Building on arm64 | Must use `--platform linux/amd64` (bmad only on x86) |
| Group number shows "1" for all | URL path not detected | `App.tsx` reads group from path (`/gN/`) or `?group=N` param |

## What NOT To Do (Failed Approaches)

1. **Do NOT use react-plotly.js or Plotly for the beam image.** CJS/ESM interop is broken under Vite, and even when it works, Plotly re-creates the entire SVG DOM on every update causing visible flashing.

2. **Do NOT add a loading overlay or spinner on model evaluation.** The overlay causes more visual disruption than the brief wait.

3. **Do NOT run multiple groups in one container.** Torch double-load segfaults and cascading failures. Always one model instance per container.

4. **Do NOT use wide slider ranges in the Combined tab.** The FEL model extrapolates wildly outside its training range.

5. **Do NOT re-evaluate the injector model when only FEL-only sliders change.** Random particle resampling causes beam image flicker even with identical inputs.

6. **Do NOT install pytao via pip.** It requires the libtao shared library which is only available from conda-forge.

7. **Do NOT delete the sensitivity cache without regenerating.** The file is committed to the repo and baked into the Docker image. Only delete+regenerate when the FEL model is updated.

8. **Do NOT send the full 1392x1040 image to the frontend.** Crop and downsample to ~150-200px in the backend.

9. **Do NOT `import torch` at the top of main.py.** It causes a deadlock with the model loading during startup. Set thread-pinning env vars only.

10. **Do NOT install virtual-accelerator via pip URL.** It must be git-cloned in the Docker image because the injector model weights live in a subtree directory that pip doesn't include.

11. **Do NOT use absolute paths in the frontend.** Asset paths must be relative (`base: './'`) and API calls must use `API_BASE = "."` to work behind any path-based routing.

## Dockerfile Pinning

The Docker image pins specific commits for compatibility (version mismatches cause `input_beam` validation errors):
- `virtual-accelerator`: commit `77bbda8`
- `lume-bmad`: commit `e49c6891` (force-reinstalled after virtual-accelerator)
- `lume-torch`: commit `acd21eb1` (force-reinstalled after virtual-accelerator)
- `lcls-lattice`: commit `52ad1a5d`
- Platform: forced `linux/amd64`
- PyTorch: CPU-only from `download.pytorch.org/whl/cpu`

When updating any of these, test the Docker build end-to-end before pushing.

## Testing Patterns

- **Backend**: Use `NUM_GROUPS=1` for fast startup. Test endpoints with curl:
  ```bash
  curl http://localhost:8000/api/config
  curl -X POST http://localhost:8000/api/injector/evaluate \
    -H "Content-Type: application/json" \
    -d '{"group": 1, "inputs": {"SOLN:IN20:121:BCTRL": 0.478}}'
  ```

- **Frontend dev**: `npm run dev` with hot reload. Browser at `http://localhost:5173/?group=1`.

- **Production mode locally**: Build frontend (`npm run build`), run uvicorn, open `http://localhost:8000/`.

- **Docker locally**: `docker build -t lcls-surrogate-lab:test . && docker run -p 8080:8000 lcls-surrogate-lab:test` (takes ~120s on Apple Silicon due to x86 emulation; ~30s on native x86).

- **Quick validation checklist**:
  1. `/api/config` returns slider definitions for all 4 groups (injector, fel, combined_shared, combined_fel)
  2. Injector evaluate returns a non-empty 2D array with beam_size > 0
  3. FEL evaluate returns a value between 0 and 4
  4. Combined evaluate returns both (and changing FEL-only slider doesn't change the image)
  5. Beam image renders on canvas without flashing
  6. Group number in header matches URL path

## Deployment Summary

| Method | Use case | Routing | Command |
|--------|----------|---------|---------|
| Local dev | Development | Vite proxy | `uvicorn main:app` + `npm run dev` |
| Docker compose | AWS EC2 / single VM | nginx strips `/gN/` | `docker compose up` |
| Fly.io | Public cloud (recommended for lab) | Each app = own URL | `./deploy/fly_deploy.sh` |
| K8s | SLAC internal (requires auth) | Ingress rewrite strips `/ai-lab/gN/` | `kubectl apply -k deploy/kubernetes/` |

## Frontend Rendering Details

The `BeamImage.tsx` component:
1. Receives a 2D array (already normalized 0-1, cropped, downsampled)
2. Maps values through a "Hot" colormap (black -> red -> yellow -> white)
3. Writes directly to canvas ImageData pixel buffer via OffscreenCanvas
4. Scales to display size (400x300) via `drawImage`

This avoids all DOM manipulation; just raw pixel writes.

## Backend Evaluation Flow

1. Request arrives with `{group: N, inputs: {...}}`
2. `session_pool` retrieves the pre-allocated model instance
3. Asyncio lock acquired (prevents concurrent Tao access)
4. Input values applied via `model.set(inputs)`
5. Model runs (Bmad tracking for injector, forward pass for FEL)
6. Post-processing: normalize, crop, downsample (injector) or cap at 4mJ (FEL)
7. Response sent as JSON
8. Lock released
