import type { ImgHTMLAttributes } from "react";

interface Props {
  src: string;
  alt: string;
  caption?: string;
}

/**
 * Inline diagram shown above the output column on each panel.
 * Sized to keep the rest of the outputs above the fold on 13" laptops.
 */
export function BeamlineDiagram({ src, alt, caption }: Props) {
  const imgProps: ImgHTMLAttributes<HTMLImageElement> = { src, alt };
  return (
    <div className="beamline-diagram">
      {caption && <span className="beamline-diagram-caption">{caption}</span>}
      <img {...imgProps} />
    </div>
  );
}
