import { useEffect, useRef } from "react";

interface Props {
  image: number[][];
  beamX: number[];
  beamY: number[];
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;

function valueToColor(v: number): [number, number, number] {
  // "Hot" colormap: black → red → yellow → white
  if (v <= 0) return [0, 0, 0];
  if (v <= 0.33) {
    const t = v / 0.33;
    return [Math.round(t * 255), 0, 0];
  }
  if (v <= 0.66) {
    const t = (v - 0.33) / 0.33;
    return [255, Math.round(t * 255), 0];
  }
  const t = (v - 0.66) / 0.34;
  return [255, 255, Math.round(t * 255)];
}

export function BeamImage({ image }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!image || image.length === 0 || !image[0] || image[0].length === 0) {
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for data...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    const rows = image.length;
    const cols = image[0].length;
    const imgData = ctx.createImageData(cols, rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        const [r, g, b] = valueToColor(image[y][x]);
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }

    // Draw at native resolution then scale to canvas
    const offscreen = new OffscreenCanvas(cols, rows);
    const offCtx = offscreen.getContext("2d")!;
    offCtx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, [image]);

  return (
    <div className="beam-image">
      <div className="beam-image-title">Beam at OTR4 Screen</div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ borderRadius: "4px", border: "1px solid #e5e7eb" }}
      />
    </div>
  );
}
