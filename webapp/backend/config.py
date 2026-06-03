import os

LCLS_LATTICE = os.environ.get("LCLS_LATTICE", "/Users/smiskov/SLAC/lcls-lattice")
NUM_GROUPS = int(os.environ.get("NUM_GROUPS", "6"))
MAX_FEL_INTENSITY = 4.0  # mJ — physical cap

# Full ranges for the Injector-only tab (wide exploration)
INJECTOR_SLIDERS = [
    {
        "id": "SOLN:IN20:121:BCTRL",
        "label": "Solenoid Current",
        "description": "Controls how strongly the beam is focused near the electron source",
        "min": 0.377,
        "max": 0.498,
        "default": 0.478,
        "unit": "kG·m",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:425:BCTRL",
        "label": "Upstream Quad",
        "description": "Sets the beam envelope entering the final focus",
        "min": -7.56,
        "max": -1.08,
        "default": -1.76,
        "unit": "kG",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:441:BCTRL",
        "label": "Upstream Quad 2",
        "description": "Partners with the first to shape the beam",
        "min": -1.08,
        "max": 7.56,
        "default": -0.12,
        "unit": "kG",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:511:BCTRL",
        "label": "Final Focus H",
        "description": "The last magnet controlling horizontal beam size",
        "min": -1.08,
        "max": 7.56,
        "default": 3.29,
        "unit": "kG",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:525:BCTRL",
        "label": "Final Focus V",
        "description": "The last magnet controlling vertical beam size",
        "min": -7.56,
        "max": -1.08,
        "default": -2.90,
        "unit": "kG",
        "model": "both",
    },
]

# Narrower ranges for the Combined tab — restricted to FEL model's training range
# so that predictions are physically consistent
COMBINED_SHARED_SLIDERS = [
    {
        "id": "SOLN:IN20:121:BCTRL",
        "label": "Solenoid Current",
        "description": "Controls how strongly the beam is focused near the electron source",
        "min": 0.4766,
        "max": 0.4808,
        "default": 0.4775,
        "unit": "kG·m",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:425:BCTRL",
        "label": "Upstream Quad",
        "description": "Sets the beam envelope entering the final focus",
        "min": -2.17,
        "max": -1.43,
        "default": -1.76,
        "unit": "kG",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:441:BCTRL",
        "label": "Upstream Quad 2",
        "description": "Partners with the first to shape the beam",
        "min": -0.32,
        "max": -0.001,
        "default": -0.12,
        "unit": "kG",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:511:BCTRL",
        "label": "Final Focus H",
        "description": "The last magnet controlling horizontal beam size",
        "min": 2.84,
        "max": 3.56,
        "default": 3.29,
        "unit": "kG",
        "model": "both",
    },
    {
        "id": "QUAD:IN20:525:BCTRL",
        "label": "Final Focus V",
        "description": "The last magnet controlling vertical beam size",
        "min": -3.09,
        "max": -2.34,
        "default": -2.90,
        "unit": "kG",
        "model": "both",
    },
]

INJECTOR_SLIDER_IDS = [s["id"] for s in INJECTOR_SLIDERS]
