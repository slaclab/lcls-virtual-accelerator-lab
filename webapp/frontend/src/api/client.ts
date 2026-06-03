import type {
  CombinedResponse,
  ConfigResponse,
  FELResponse,
  InjectorResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function evaluateInjector(
  group: number,
  inputs: Record<string, number>
): Promise<InjectorResponse> {
  return post("/api/injector/evaluate", { group, inputs });
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
  return post("/api/combined/evaluate", { group, inputs });
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
