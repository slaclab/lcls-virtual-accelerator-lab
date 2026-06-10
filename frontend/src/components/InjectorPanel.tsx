import { useCallback, useEffect, useRef, useState } from "react";

import injectorDiagram from "../assets/injector_diagram.png";
import { evaluateInjector } from "../api/client";
import type { InjectorResponse, SliderConfig } from "../types";
import { BeamImage } from "./BeamImage";
import { BeamlineDiagram } from "./BeamlineDiagram";
import { ScalarDisplay } from "./ScalarDisplay";
import { SliderControl } from "./SliderControl";

interface Props {
  sliders: SliderConfig[];
  group: number;
}

export function InjectorPanel({ sliders, group }: Props) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [result, setResult] = useState<InjectorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const evaluate = useCallback(
    async (inputs: Record<string, number>) => {
      if (Object.keys(inputs).length === 0) return;
      setError(null);
      try {
        const res = await evaluateInjector(group, inputs);
        setResult(res);
      } catch (e) {
        console.error("Evaluation failed:", e);
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
    <div className="panel injector-panel">
      <div className="panel-controls">
        <div className="panel-header">
          <h2>Injector Controls</h2>
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
          src={injectorDiagram}
          alt="Injector beamline schematic"
          caption="The injector beamline — 5 magnets you control"
        />
        <BeamImage
          image={result?.image ?? []}
          beamX={result?.beam_x ?? []}
          beamY={result?.beam_y ?? []}
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
      </div>
    </div>
  );
}
