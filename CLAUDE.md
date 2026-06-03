# CLAUDE.md — AI Development Guide

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app, lifespan (pool init), all endpoints
│   ├── session_pool.py      # SessionPool class: manages per-group model instances
│   ├── sensitivity.py       # FEL sensitivity sweep + caching logic
│   ├── schemas.py           # Pydantic models for request/response
│   ├── config.py            # Slider definitions, ranges, env var loading
│   ├── requirements.txt     # pip deps (excludes virtual-accelerator, lcls-fel-model)
│   └── .cache/
│       └── fel_sensitivity.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Tab navigation, loads /api/config on mount
│   │   ├── App.css           # All styles (single file)
│   │   ├── types.ts          # TypeScript interfaces (SliderConfig, EvalResponse, etc.)
│   │   ├── api/client.ts     # fetch wrappers + debounce logic
│   │   └── components/
│   │       ├── InjectorPanel.tsx   # Injector tab container
│   │       ├── FELPanel.tsx        # FEL tab container
│   │       ├── CombinedPanel.tsx   # Combined tab (split eval logic)
│   │       ├── BeamImage.tsx       # Canvas-based 2D heatmap renderer
│   │       ├── IntensityGauge.tsx  # FEL output bar (0-4 mJ)
│   │       ├── SliderControl.tsx   # Reusable labeled slider component
│   │       └── ScalarDisplay.tsx   # Beam size sigma readout
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts        # Includes proxy config for /api -> localhost:8000
├── Dockerfile
├── docker-compose.yml
├── README.md
└── DESIGN.md
```

## Model Interfaces

### Injector Model (virtual-accelerator)

The injector model is a staged model wrapping Bmad/Tao via pytao. Key facts:

- **Stateful**: Each instance maintains internal Bmad lattice state. You cannot share instances across requests from different groups.
- **Thread-unsafe**: pytao calls are not thread-safe. One instance per group, accessed sequentially.
- **Output**: A 2D numpy array (histogram of particle positions at OTR4). Raw size is 1392x1040, values in Coulombs.
- **Stochastic**: Random particle sampling means identical inputs produce slightly different outputs.
- **Can return zeros**: If beam is lost (extreme settings), the histogram is all zeros.

### FEL Model (lcls-fel-model)

A PyTorch neural network surrogate. Key facts:

- **Output key**: `GDET:FEE1:241:ENRC` — this is the actual output variable name. Not `hxr_pulse_intensity` or any other alias.
- **`input_variables` is a list**, not a dict. Each element is a `TorchScalarVariable` with attributes:
  - `.name` (str)
  - `.value_range` (tuple of min, max)
  - `.default_value` (float)
- **Trained on narrow range**: The model only saw a small operating region. Extrapolation produces unphysical values. Always cap output at 4 mJ.
- **Deterministic**: Same inputs always produce same output (no stochasticity).

## Environment Setup

### Create the conda environment from `environment.yml`

```bash
conda env create -f environment.yml
conda activate lcls-surrogate-lab
```

The `environment.yml` at the repo root specifies:
- Python 3.12
- `pytao` from conda-forge (provides `libtao` shared library — Bmad's Fortran simulation engine)
- pip packages: torch, fastapi, uvicorn, virtual-accelerator (GitHub), lcls-fel-model (GitHub)

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
| Server startup timeout | Sensitivity analysis running | Pre-compute: check `backend/.cache/fel_sensitivity.json` exists |
| `KeyError: 'hxr_pulse_intensity'` | Wrong output key | Use `GDET:FEE1:241:ENRC` |
| `TypeError: 'list' object has no attribute 'keys'` | Treating `input_variables` as dict | It is a list of objects, iterate with `.name` attribute |
| Blank beam image in UI | Beam lost (zeros array) | Expected — handle gracefully in frontend |
| Frontend Plotly flash/flicker | Using react-plotly.js | Already removed — use canvas rendering in BeamImage.tsx |

## What NOT To Do (Failed Approaches)

1. **Do NOT use react-plotly.js or Plotly for the beam image.** CJS/ESM interop is broken under Vite, and even when it works, Plotly re-creates the entire SVG DOM on every update causing visible flashing.

2. **Do NOT add a loading overlay or spinner on model evaluation.** The round-trip is ~200ms. An overlay causes more visual disruption than the brief wait. Just leave the previous image visible.

3. **Do NOT share Bmad model instances across groups.** Bmad is stateful and not thread-safe. Always use one instance per group.

4. **Do NOT use wide slider ranges in the Combined tab.** The FEL model extrapolates wildly outside its training range. Combined tab must use FEL-constrained ranges.

5. **Do NOT re-evaluate the injector model when only FEL-only sliders change in Combined mode.** Random particle resampling causes beam image flicker even with identical inputs.

6. **Do NOT install pytao via pip.** It requires the libtao shared library which is only available from conda-forge.

7. **Do NOT skip the sensitivity cache.** Computing sensitivity takes ~60 seconds and will cause startup timeouts in production. Always ensure `.cache/fel_sensitivity.json` exists.

8. **Do NOT send the full 1392x1040 image to the frontend.** It is ~5.5MB per frame. Crop and downsample to ~150-200px in the backend.

## Testing Patterns

- **Backend**: Use `NUM_GROUPS=1` for fast startup. Test endpoints with curl or httpie:
  ```bash
  curl http://localhost:8000/api/config
  curl -X POST http://localhost:8000/api/injector/evaluate \
    -H "Content-Type: application/json" \
    -d '{"group": 1, "inputs": {}}'
  ```

- **Frontend**: `npm run dev` with hot reload. Browser at `http://localhost:5173/?group=1`.

- **Quick validation**: After changes, verify:
  1. `/api/config` returns slider definitions for all 3 tabs
  2. Injector evaluate returns a non-empty 2D array
  3. FEL evaluate returns a value between 0 and 4
  4. Combined evaluate returns both
  5. Beam image renders on canvas without flashing
  6. Slider changes produce visible output changes within ~300ms

## Frontend Rendering Details

The `BeamImage.tsx` component:
1. Receives a 2D array (already normalized 0-1, cropped, downsampled)
2. Maps values through a "Hot" colormap (black -> red -> yellow -> white)
3. Writes directly to canvas ImageData pixel buffer
4. Scales canvas display size via CSS (actual pixel data is small)

This avoids all DOM manipulation — just raw pixel writes followed by `putImageData`.

## Backend Evaluation Flow

1. Request arrives with `{group: N, inputs: {...}}`
2. `session_pool` retrieves the pre-allocated model instance for group N
3. Input values are applied to the model
4. Model runs (Bmad tracking for injector, forward pass for FEL)
5. Post-processing: normalize, crop, downsample (injector) or cap at 4mJ (FEL)
6. Response sent as JSON

## Build and Deploy

```bash
# Development
cd backend && uvicorn main:app --reload --port 8000
cd frontend && npm run dev

# Production Docker
docker compose up --build
# Serves frontend static files from FastAPI, no separate frontend server needed
```
