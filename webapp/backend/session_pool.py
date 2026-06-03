import asyncio
import logging
import os

import numpy as np

from config import LCLS_LATTICE, NUM_GROUPS

os.environ["LCLS_LATTICE"] = LCLS_LATTICE

logger = logging.getLogger(__name__)


class InjectorSession:
    def __init__(self):
        from virtual_accelerator.models.staged_model import get_cu_hxr_staged_model

        self.model = get_cu_hxr_staged_model(track_beam=True, end_element="OTR4")
        self.lock = asyncio.Lock()

    def evaluate(self, inputs: dict[str, float]) -> dict:
        self.model.set(inputs)
        image = self.model.get("OTRS:IN20:711:Image:ArrayData")
        beam = self.model.get("OTR4_beam")

        beam_x = np.asarray(beam.x) * 1e6  # convert m → µm
        beam_y = np.asarray(beam.y) * 1e6

        if len(beam_x) == 0:
            return {
                "image": np.zeros((50, 50)).tolist(),
                "beam_x": [],
                "beam_y": [],
                "beam_size_x": 0.0,
                "beam_size_y": 0.0,
            }

        beam_size_x = float(np.std(beam_x))
        beam_size_y = float(np.std(beam_y))

        # Normalize image for display and crop to beam region
        image_norm = self._process_image(image)

        # Subsample particles for scatter plot
        n_particles = len(beam_x)
        idx = np.random.choice(n_particles, min(500, n_particles), replace=False)

        return {
            "image": image_norm.tolist(),
            "beam_x": beam_x[idx].tolist(),
            "beam_y": beam_y[idx].tolist(),
            "beam_size_x": beam_size_x,
            "beam_size_y": beam_size_y,
        }

    @staticmethod
    def _process_image(image: np.ndarray) -> np.ndarray:
        """Normalize image and crop to region with signal."""
        if image.max() == 0:
            return np.zeros((100, 100))

        # Normalize to 0-1
        img = image / image.max()

        # Find bounding box of signal with padding
        nonzero = np.argwhere(img > 0)
        if len(nonzero) == 0:
            return np.zeros((100, 100))

        y_min, x_min = nonzero.min(axis=0)
        y_max, x_max = nonzero.max(axis=0)

        # Add 10% padding
        pad_y = max(10, int((y_max - y_min) * 0.1))
        pad_x = max(10, int((x_max - x_min) * 0.1))
        y_min = max(0, y_min - pad_y)
        y_max = min(image.shape[0], y_max + pad_y)
        x_min = max(0, x_min - pad_x)
        x_max = min(image.shape[1], x_max + pad_x)

        cropped = img[y_min:y_max, x_min:x_max]

        # Downsample to ~150x200 for transfer
        h, w = cropped.shape
        step_h = max(1, h // 150)
        step_w = max(1, w // 200)
        return cropped[::step_h, ::step_w]

    def reset(self):
        self.model.reset()


class FELSession:
    def __init__(self):
        from lcls_fel_model import load_model

        self.model = load_model()
        self.lock = asyncio.Lock()

    def evaluate(self, inputs: dict[str, float]) -> dict:
        result = self.model.evaluate(inputs)
        intensity = result.get("GDET:FEE1:241:ENRC", 0.0)
        if hasattr(intensity, "item"):
            intensity = intensity.item()
        elif hasattr(intensity, "flatten"):
            intensity = float(intensity.flatten()[0])
        return {"pulse_intensity": float(intensity)}

    def reset(self):
        self.model.reset()


class SessionPool:
    def __init__(self):
        self.injector_sessions: dict[int, InjectorSession] = {}
        self.fel_sessions: dict[int, FELSession] = {}
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        logger.info(f"Creating {NUM_GROUPS} model instances...")
        for i in range(NUM_GROUPS):
            logger.info(f"  Creating injector session {i}...")
            self.injector_sessions[i] = InjectorSession()
            logger.info(f"  Creating FEL session {i}...")
            self.fel_sessions[i] = FELSession()
        self._initialized = True
        logger.info("Session pool ready.")

    def get_injector(self, group: int) -> InjectorSession:
        group_idx = group % NUM_GROUPS
        return self.injector_sessions[group_idx]

    def get_fel(self, group: int) -> FELSession:
        group_idx = group % NUM_GROUPS
        return self.fel_sessions[group_idx]


pool = SessionPool()
