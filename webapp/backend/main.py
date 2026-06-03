import os

os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")

import torch  # noqa: E402
torch.set_num_threads(int(os.environ.get("TORCH_NUM_THREADS", "2")))

import logging  # noqa: E402
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import COMBINED_SHARED_SLIDERS, INJECTOR_SLIDERS, MAX_FEL_INTENSITY
from schemas import (
    CombinedResponse,
    ConfigResponse,
    EvaluateRequest,
    FELResponse,
    InjectorResponse,
    SliderConfig,
)
from sensitivity import get_top_fel_sliders
from session_pool import pool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FEL_EXTRA_SLIDERS: list[dict] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    global FEL_EXTRA_SLIDERS
    logger.info("Starting up — initializing model pool...")
    pool.initialize()
    logger.info("Computing FEL sensitivity analysis...")
    FEL_EXTRA_SLIDERS = get_top_fel_sliders(n=5)
    logger.info(f"FEL extra sliders: {[s['id'] for s in FEL_EXTRA_SLIDERS]}")
    yield
    logger.info("Shutting down.")


app = FastAPI(title="LCLS Surrogate Lab", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def cap_intensity(value: float) -> float:
    return min(max(value, 0.0), MAX_FEL_INTENSITY)


@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    injector = [SliderConfig(**s) for s in INJECTOR_SLIDERS]
    fel = [SliderConfig(**s) for s in INJECTOR_SLIDERS + FEL_EXTRA_SLIDERS]
    combined_shared = [SliderConfig(**s) for s in COMBINED_SHARED_SLIDERS]
    combined_fel = [SliderConfig(**s) for s in FEL_EXTRA_SLIDERS]
    return ConfigResponse(
        injector_sliders=injector,
        fel_sliders=fel,
        combined_shared_sliders=combined_shared,
        combined_fel_sliders=combined_fel,
    )


@app.post("/api/injector/evaluate", response_model=InjectorResponse)
async def evaluate_injector(req: EvaluateRequest):
    session = pool.get_injector(req.group)
    async with session.lock:
        try:
            result = session.evaluate(req.inputs)
        except Exception as e:
            logger.error(f"Injector eval error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    return InjectorResponse(**result)


@app.post("/api/fel/evaluate", response_model=FELResponse)
async def evaluate_fel(req: EvaluateRequest):
    session = pool.get_fel(req.group)
    async with session.lock:
        try:
            result = session.evaluate(req.inputs)
        except Exception as e:
            logger.error(f"FEL eval error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    return FELResponse(pulse_intensity=cap_intensity(result["pulse_intensity"]))


@app.post("/api/combined/evaluate", response_model=CombinedResponse)
async def evaluate_combined(req: EvaluateRequest):
    injector_session = pool.get_injector(req.group)
    fel_session = pool.get_fel(req.group)

    injector_inputs = {
        k: v for k, v in req.inputs.items()
        if k in {s["id"] for s in INJECTOR_SLIDERS}
    }
    fel_inputs = req.inputs.copy()

    async with injector_session.lock:
        try:
            inj_result = injector_session.evaluate(injector_inputs)
        except Exception as e:
            logger.error(f"Combined injector eval error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async with fel_session.lock:
        try:
            fel_result = fel_session.evaluate(fel_inputs)
        except Exception as e:
            logger.error(f"Combined FEL eval error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return CombinedResponse(
        **inj_result,
        pulse_intensity=cap_intensity(fel_result["pulse_intensity"]),
    )


@app.post("/api/reset")
async def reset_models(req: EvaluateRequest):
    injector_session = pool.get_injector(req.group)
    fel_session = pool.get_fel(req.group)
    async with injector_session.lock:
        injector_session.reset()
    async with fel_session.lock:
        fel_session.reset()
    return {"status": "ok"}


# Serve frontend static files in production
static_dir = Path(__file__).parent.parent / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
