import json
import logging
import os
from pathlib import Path

import numpy as np

from config import INJECTOR_SLIDER_IDS

logger = logging.getLogger(__name__)
CACHE_PATH = Path(__file__).parent / ".cache" / "fel_sensitivity.json"
MIN_RANGE_THRESHOLD = 0.01  # skip inputs with range < 1% of their abs value


def compute_sensitivity(n_points: int = 20) -> list[dict]:
    """Compute FEL output sensitivity to each input by sweeping across its range."""
    from lcls_fel_model import load_model

    model = load_model()

    input_vars = model.input_variables  # list of TorchScalarVariable
    results = []

    for var in input_vars:
        var_name = var.name
        if var_name in INJECTOR_SLIDER_IDS:
            continue

        vrange = var.value_range
        if vrange is None:
            continue

        lo, hi = float(vrange[0]), float(vrange[1])
        if abs(hi - lo) < MIN_RANGE_THRESHOLD * max(abs(lo), abs(hi), 1e-10):
            continue

        sweep_values = np.linspace(lo, hi, n_points)
        outputs = []
        for val in sweep_values:
            result = model.evaluate({var_name: float(val)})
            intensity = result.get("GDET:FEE1:241:ENRC", 0.0)
            if hasattr(intensity, "item"):
                intensity = intensity.item()
            elif hasattr(intensity, "flatten"):
                intensity = float(intensity.flatten()[0])
            outputs.append(float(intensity))

        output_range = max(outputs) - min(outputs)
        default_val = float(var.default_value) if var.default_value is not None else (lo + hi) / 2
        results.append({
            "id": var_name,
            "sensitivity": output_range,
            "min": lo,
            "max": hi,
            "default": default_val,
        })

    results.sort(key=lambda x: x["sensitivity"], reverse=True)
    return results


def _beamline_sort_key(item: dict) -> tuple:
    """Sort PVs by beamline location: linac sections first, then undulator."""
    parts = item["id"].split(":")
    if parts[1].startswith("LI"):
        section = int(parts[1][2:])
        element = int(parts[2])
        return (0, section, element)
    elif parts[1] == "UNDH":
        segment = int(parts[2])
        return (1, segment, 0)
    return (2, 0, 0)


def get_top_fel_sliders(n: int = 5) -> list[dict]:
    """Get the top N most sensitive FEL-only sliders, using cache if available."""
    if CACHE_PATH.exists():
        logger.info("Loading cached FEL sensitivity results.")
        with open(CACHE_PATH) as f:
            results = json.load(f)
    else:
        logger.info("Computing FEL sensitivity (this may take a moment)...")
        results = compute_sensitivity()
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_PATH, "w") as f:
            json.dump(results, f, indent=2)
        logger.info(f"Cached sensitivity results to {CACHE_PATH}")

    top = results[:n]
    top.sort(key=_beamline_sort_key)

    FEL_LABELS = {
        "ACCL:LI25:1:ADES": ("Linac Energy", "Main accelerator energy setting", "MeV"),
        "ACCL:LI22:1:ADES": ("Linac 2 Energy", "Accelerator section 2 energy", "MeV"),
        "ACCL:LI21:1:L1S_S_AV": ("L1 Amplitude", "First linac section amplitude", "MV"),
        "ACCL:LI21:1:L1S_S_PV": ("L1 Phase", "First linac section phase", "deg"),
        "ACCL:LI22:1:PDES": ("L2 Phase", "Linac 2 RF phase for compression", "deg"),
        "ACCL:LI25:1:PDES": ("L3 Phase", "Linac 3 RF phase", "deg"),
        "QUAD:LI25:901:BCTRL": ("Mid-Linac Quad", "Focuses the beam in the middle of the linear accelerator", "kG"),
        "QUAD:LI29:401:BCTRL": ("Pre-Undulator Quad", "Final focusing before the beam enters the undulator", "kG"),
        "USEG:UNDH:4150:GapAct": ("Undulator Gap 1", "Magnetic gap of upstream undulator segment; narrower gap = stronger field", "mm"),
        "USEG:UNDH:4250:GapAct": ("Undulator Gap 2", "Magnetic gap of middle undulator segment", "mm"),
        "USEG:UNDH:4650:GapAct": ("Undulator Gap 3", "Magnetic gap of downstream undulator segment", "mm"),
    }

    sliders = []
    for item in top:
        pv = item["id"]
        label_info = FEL_LABELS.get(pv)
        if label_info:
            label, desc, unit = label_info
        else:
            parts = pv.split(":")
            label = f"{parts[0]} {parts[2]}"
            desc = f"Accelerator component {parts[1]}:{parts[2]}"
            unit = "kG" if "QUAD" in pv else ("mm" if "USEG" in pv else "")

        sliders.append({
            "id": pv,
            "label": label,
            "description": desc,
            "min": item["min"],
            "max": item["max"],
            "default": item["default"],
            "unit": unit,
            "model": "fel",
        })

    return sliders
