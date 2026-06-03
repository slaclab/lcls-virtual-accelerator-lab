interface Props {
  value: number;
  maxValue?: number;
}

export function IntensityGauge({ value, maxValue = 4.0 }: Props) {
  const percent = Math.min(100, (value / maxValue) * 100);
  const color =
    percent > 66 ? "#22c55e" : percent > 33 ? "#eab308" : "#ef4444";

  return (
    <div className="intensity-gauge">
      <div className="gauge-label">FEL Pulse Energy</div>
      <div className="gauge-value" style={{ color }}>
        {value.toFixed(3)} mJ
      </div>
      <div className="gauge-bar-container">
        <div
          className="gauge-bar"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="gauge-range">
        <span>0</span>
        <span>{maxValue} mJ</span>
      </div>
    </div>
  );
}
