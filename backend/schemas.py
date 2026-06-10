from pydantic import BaseModel


class EvaluateRequest(BaseModel):
    group: int
    inputs: dict[str, float]


class InjectorResponse(BaseModel):
    image_b64: str
    image_shape: list[int]
    beam_size_x: float
    beam_size_y: float


class FELResponse(BaseModel):
    pulse_intensity: float


class CombinedResponse(BaseModel):
    image_b64: str
    image_shape: list[int]
    beam_size_x: float
    beam_size_y: float
    pulse_intensity: float


class SliderConfig(BaseModel):
    id: str
    label: str
    description: str
    min: float
    max: float
    default: float
    unit: str
    model: str


class ConfigResponse(BaseModel):
    injector_sliders: list[SliderConfig]
    fel_sliders: list[SliderConfig]
    combined_shared_sliders: list[SliderConfig]
    combined_fel_sliders: list[SliderConfig]
