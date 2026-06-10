import type {
  CombinedResponse,
  ConfigResponse,
  FELResponse,
  InjectorResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || ".";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Decode a base64 string into a Float32Array (image is shipped as float32 LE bytes).
function decodeFloat32Image(b64: string): Float32Array {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new Float32Array(bytes.buffer);
}

interface InjectorWirePayload {
  image_b64: string;
  image_shape: [number, number];
  beam_size_x: number;
  beam_size_y: number;
}

interface CombinedWirePayload extends InjectorWirePayload {
  pulse_intensity: number;
}

function unpackInjector(p: InjectorWirePayload): InjectorResponse {
  return {
    image: decodeFloat32Image(p.image_b64),
    imageRows: p.image_shape[0],
    imageCols: p.image_shape[1],
    beam_size_x: p.beam_size_x,
    beam_size_y: p.beam_size_y,
  };
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function evaluateInjector(
  group: number,
  inputs: Record<string, number>
): Promise<InjectorResponse> {
  const wire = await post<InjectorWirePayload>("/api/injector/evaluate", { group, inputs });
  return unpackInjector(wire);
}

export async function evaluateFEL(
  group: number,
  inputs: Record<string, number>
): Promise<FELResponse> {
  return post("/api/fel/evaluate", { group, inputs });
}

export async function evaluateCombined(
  group: number,
  inputs: Record<string, number>
): Promise<CombinedResponse> {
  const wire = await post<CombinedWirePayload>("/api/combined/evaluate", { group, inputs });
  return { ...unpackInjector(wire), pulse_intensity: wire.pulse_intensity };
}

export async function resetModels(group: number): Promise<void> {
  await post("/api/reset", { group, inputs: {} });
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
