export interface SliderConfig {
  id: string;
  label: string;
  description: string;
  min: number;
  max: number;
  default: number;
  unit: string;
  model: string;
}

export interface InjectorResponse {
  image: Float32Array;
  imageRows: number;
  imageCols: number;
  beam_size_x: number;
  beam_size_y: number;
}

export interface FELResponse {
  pulse_intensity: number;
}

export interface CombinedResponse extends InjectorResponse {
  pulse_intensity: number;
}

export interface ConfigResponse {
  injector_sliders: SliderConfig[];
  fel_sliders: SliderConfig[];
  combined_shared_sliders: SliderConfig[];
  combined_fel_sliders: SliderConfig[];
}
