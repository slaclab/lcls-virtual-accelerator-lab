import { useCallback, useEffect, useRef, useState } from "react";

import beamlineDiagram from "../assets/beamline_endtoend.png";
import { evaluateCombined, evaluateFEL } from "../api/client";
import type { CombinedResponse, SliderConfig } from "../types";
import { BeamImage } from "./BeamImage";
import { BeamlineDiagram } from "./BeamlineDiagram";
import { IntensityGauge } from "./IntensityGauge";
import { ScalarDisplay } from "./ScalarDisplay";
import { SliderControl } from "./SliderControl";

interface Props {
  sharedSliders: SliderConfig[];
  felOnlySliders: SliderConfig[];
  group: number;
}

export function CombinedPanel({ sharedSliders, felOnlySliders, group }: Props) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CombinedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const sharedIds = new Set(sharedSliders.map((s) => s.id));
  const allSliders = [...sharedSliders, ...felOnlySliders];

  const evaluateAll = useCallback(
    async (inputs: Record<string, number>) => {
      if (Object.keys(inputs).length === 0) return;
      setError(null);
      try {
        const res = await evaluateCombined(group, inputs);
        setResult(res);
      } catch (e) {
        console.error("Combined evaluation failed:", e);
        setError(e instanceof Error ? e.message : "Evaluation failed");
      }
    },
    [group]
  );

  const evaluateFELOnly = useCallback(
    async (inputs: Record<string, number>) => {
      if (Object.keys(inputs).length === 0) return;
      setError(null);
      try {
        const res = await evaluateFEL(group, inputs);
        setResult((prev) =>
          prev ? { ...prev, pulse_intensity: res.pulse_intensity } : prev
        );
      } catch (e) {
        console.error("FEL evaluation failed:", e);
        setError(e instanceof Error ? e.message : "Evaluation failed");
      }
    },
    [group]
  );

  useEffect(() => {
    if (allSliders.length === 0) return;
    const defaults: Record<string, number> = {};
    allSliders.forEach((s) => (defaults[s.id] = s.default));
    setValues(defaults);
    evaluateAll(defaults);
  }, [sharedSliders, felOnlySliders]);

  const handleChange = useCallback(
    (id: string, value: number) => {
      const isShared = sharedIds.has(id);
      setValues((prev) => {
        const newValues = { ...prev, [id]: value };
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          if (isShared) {
            evaluateAll(newValues);
          } else {
            evaluateFELOnly(newValues);
          }
        }, 300);
        return newValues;
      });
    },
    [evaluateAll, evaluateFELOnly, sharedIds]
  );

  const handleReset = useCallback(() => {
    const defaults: Record<string, number> = {};
    allSliders.forEach((s) => (defaults[s.id] = s.default));
    setValues(defaults);
    evaluateAll(defaults);
  }, [allSliders, evaluateAll]);

  return (
    <div className="panel combined-panel">
      <div className="panel-controls">
        <div className="panel-header">
          <h2>Combined Controls</h2>
          <button className="reset-all-btn" onClick={handleReset}>
            Reset All
          </button>
        </div>
        <h3>Shared (Injector + FEL)</h3>
        {sharedSliders.map((s) => (
          <SliderControl
            key={s.id}
            config={s}
            value={values[s.id] ?? s.default}
            onChange={handleChange}
          />
        ))}
        {felOnlySliders.length > 0 && (
          <>
            <h3>FEL Only</h3>
            {felOnlySliders.map((s) => (
              <SliderControl
                key={s.id}
                config={s}
                value={values[s.id] ?? s.default}
                onChange={handleChange}
              />
            ))}
          </>
        )}
      </div>
      <div className="panel-output">
        {error && <div className="error-message">{error}</div>}
        <BeamlineDiagram
          src={beamlineDiagram}
          alt="End-to-end beamline"
          caption="All your knobs at a glance"
        />
        <BeamImage
          image={result?.image ?? new Float32Array(0)}
          imageRows={result?.imageRows ?? 0}
          imageCols={result?.imageCols ?? 0}
        />
        <div className="scalar-row">
          <ScalarDisplay
            label="Beam Size X"
            value={result?.beam_size_x ?? 0}
            unit="µm"
          />
          <ScalarDisplay
            label="Beam Size Y"
            value={result?.beam_size_y ?? 0}
            unit="µm"
          />
        </div>
        <IntensityGauge value={result?.pulse_intensity ?? 0} />
      </div>
    </div>
  );
}
