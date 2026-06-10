import { useEffect, useRef } from "react";

interface Props {
  image: Float32Array;
  imageRows: number;
  imageCols: number;
  beamX: number[];
  beamY: number[];
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;

export function BeamImage({ image, imageRows, imageCols }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!image || image.length === 0 || imageRows === 0 || imageCols === 0) {
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for data...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    const rows = imageRows;
    const cols = imageCols;
    const imgData = ctx.createImageData(cols, rows);
    const data = imgData.data;

    // Inlined "Hot" colormap (black → red → yellow → white) for tight pixel loop.
    const N = rows * cols;
    for (let i = 0; i < N; i++) {
      const v = image[i];
      let r: number, g: number, b: number;
      if (v <= 0) {
        r = 0; g = 0; b = 0;
      } else if (v <= 0.33) {
        r = (v / 0.33) * 255 | 0; g = 0; b = 0;
      } else if (v <= 0.66) {
        r = 255; g = ((v - 0.33) / 0.33) * 255 | 0; b = 0;
      } else {
        r = 255; g = 255; b = ((v - 0.66) / 0.34) * 255 | 0;
      }
      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }

    // Draw at native resolution then scale (down) to canvas.
    // Smoothing on since we are now downsampling 500×700 → 400×300.
    const offscreen = new OffscreenCanvas(cols, rows);
    const offCtx = offscreen.getContext("2d")!;
    offCtx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(offscreen, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, [image, imageRows, imageCols]);

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
