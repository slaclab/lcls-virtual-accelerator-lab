import type { SliderConfig } from "../types";

interface Props {
  config: SliderConfig;
  value: number;
  onChange: (id: string, value: number) => void;
}

export function SliderControl({ config, value, onChange }: Props) {
  const step = (config.max - config.min) / 200;

  return (
    <div className="slider-control">
      <div className="slider-header">
        <span className="slider-label">{config.label}</span>
        <span className="slider-value">
          {value.toFixed(3)} {config.unit}
        </span>
      </div>
      <div className="slider-description">{config.description}</div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={step}
        value={value}
        onChange={(e) => onChange(config.id, parseFloat(e.target.value))}
      />
      <div className="slider-range">
        <span>{config.min.toFixed(2)}</span>
        <button
          className="reset-btn"
          onClick={() => onChange(config.id, config.default)}
          title="Reset to default"
        >
          Reset
        </button>
        <span>{config.max.toFixed(2)}</span>
      </div>
    </div>
  );
}
