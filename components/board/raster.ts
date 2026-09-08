// Raster helpers: image → dot grid, a stable per-cell hash, and easing.

/** deterministic 0..1 per cell; drives the dithered wipe so it never shimmers */
export function hash2(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
}

export const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2);

/**
 * Average the luminance of a source canvas into a cols×rows grid, normalised
 * to the source's own range so a dim image still fills the contrast.
 */
export function rasterToCells(sctx: CanvasRenderingContext2D, SW: number, SH: number, cols: number, rows: number) {
  const d = sctx.getImageData(0, 0, SW, SH).data;
  const lum = new Float32Array(SW * SH);
  let lo = 1, hi = 0;
  for (let i = 0; i < SW * SH; i++) {
    const v = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    lum[i] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = Math.max(0.05, hi - lo);
  const out = new Float32Array(cols * rows);
  const scw = SW / cols, sch = SH / rows;
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    let sum = 0, n = 0;
    const x0 = Math.floor(gx * scw), x1 = Math.min(SW, Math.max(x0 + 1, Math.ceil((gx + 1) * scw)));
    const y0 = Math.floor(gy * sch), y1 = Math.min(SH, Math.max(y0 + 1, Math.ceil((gy + 1) * sch)));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += (lum[y * SW + x] - lo) / span; n++; }
    out[gy * cols + gx] = n ? sum / n : 0;
  }
  return out;
}
