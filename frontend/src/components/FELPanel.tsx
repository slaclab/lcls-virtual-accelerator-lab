import { useCallback, useEffect, useRef, useState } from "react";

import beamlineDiagram from "../assets/beamline_endtoend.png";
import { evaluateFEL } from "../api/client";
import type { FELResponse, SliderConfig } from "../types";
import { BeamlineDiagram } from "./BeamlineDiagram";
import { IntensityGauge } from "./IntensityGauge";
import { SliderControl } from "./SliderControl";

interface Props {
  sliders: SliderConfig[];
  group: number;
}

export function FELPanel({ sliders, group }: Props) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [result, setResult] = useState<FELResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const evaluate = useCallback(
    async (inputs: Record<string, number>) => {
      if (Object.keys(inputs).length === 0) return;
      setError(null);
      try {
        const res = await evaluateFEL(group, inputs);
        setResult(res);
      } catch (e) {
        console.error("FEL evaluation failed:", e);
        setError(e instanceof Error ? e.message : "Evaluation failed");
      }
    },
    [group]
  );

  useEffect(() => {
    if (sliders.length === 0) return;
    const defaults: Record<string, number> = {};
    sliders.forEach((s) => (defaults[s.id] = s.default));
    setValues(defaults);
    evaluate(defaults);
  }, [sliders, evaluate]);

  const handleChange = useCallback(
    (id: string, value: number) => {
      setValues((prev) => {
        const newValues = { ...prev, [id]: value };
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => evaluate(newValues), 300);
        return newValues;
      });
    },
    [evaluate]
  );

  const handleReset = useCallback(() => {
    const defaults: Record<string, number> = {};
    sliders.forEach((s) => (defaults[s.id] = s.default));
    setValues(defaults);
    evaluate(defaults);
  }, [sliders, evaluate]);

  return (
    <div className="panel fel-panel">
      <div className="panel-controls">
        <div className="panel-header">
          <h2>FEL Controls</h2>
          <button className="reset-all-btn" onClick={handleReset}>
            Reset All
          </button>
        </div>
        {sliders.map((s) => (
          <SliderControl
            key={s.id}
            config={s}
            value={values[s.id] ?? s.default}
            onChange={handleChange}
          />
        ))}
      </div>
      <div className="panel-output">
        {error && <div className="error-message">{error}</div>}
        <BeamlineDiagram
          src={beamlineDiagram}
          alt="End-to-end beamline"
          caption="Where your sliders live — gauge below shows the gas-detector reading"
        />
        <IntensityGauge value={result?.pulse_intensity ?? 0} />
      </div>
    </div>
  );
}
