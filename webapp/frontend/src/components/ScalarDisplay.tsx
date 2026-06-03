interface Props {
  label: string;
  value: number;
  unit: string;
}

export function ScalarDisplay({ label, value, unit }: Props) {
  return (
    <div className="scalar-display">
      <span className="scalar-label">{label}</span>
      <span className="scalar-value">
        {value.toFixed(2)} {unit}
      </span>
    </div>
  );
}
