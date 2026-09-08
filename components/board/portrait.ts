// A portrait for the board: cover-fit into a fixed frame, then the backdrop is
// chroma-keyed out by flood-filling near-white from the edges and feathering.

export const PW = 600, PH = 800;

export function keyBackdrop(c: CanvasRenderingContext2D) {
  const im = c.getImageData(0, 0, PW, PH), d = im.data;
  const N = PW * PH, thr = 226;
  const white = (i: number) => d[i * 4] > thr && d[i * 4 + 1] > thr && d[i * 4 + 2] > thr;
  const mask = new Uint8Array(N);
  const q: number[] = [];
  const seed = (i: number) => { if (!mask[i] && white(i)) { mask[i] = 1; q.push(i); } };
  for (let x = 0; x < PW; x++) { seed(x); seed((PH - 1) * PW + x); }
  for (let y = 0; y < PH; y++) { seed(y * PW); seed(y * PW + PW - 1); }
  while (q.length) {
    const i = q.pop()!, x = i % PW, y = (i / PW) | 0;
    if (x > 0) seed(i - 1);
    if (x < PW - 1) seed(i + 1);
    if (y > 0) seed(i - PW);
    if (y < PH - 1) seed(i + PW);
  }
  let a = Float32Array.from(mask);
  for (let p = 0; p < 2; p++) {
    const b = new Float32Array(N);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < PW && yy >= 0 && yy < PH) { s += a[yy * PW + xx]; n++; }
      }
      b[y * PW + x] = s / n;
    }
    a = b;
  }
  for (let i = 0; i < N; i++) {
    const k = 1 - a[i];
    d[i * 4] *= k; d[i * 4 + 1] *= k; d[i * 4 + 2] *= k;
  }
  c.putImageData(im, 0, 0);
}

/** make a PW×PH canvas and fill it with the keyed portrait; `done` fires when ready */
export function loadPortrait(srcUrl: string, done: (portrait: HTMLCanvasElement) => void) {
  const portrait = document.createElement("canvas");
  portrait.width = PW; portrait.height = PH;
  const c = portrait.getContext("2d", { willReadFrequently: true })!;
  const img = new Image();
  img.onload = () => {
    c.fillStyle = "#000"; c.fillRect(0, 0, PW, PH);
    const s = Math.max(PW / img.width, PH / img.height);
    const dw = img.width * s, dh = img.height * s;
    c.drawImage(img, (PW - dw) / 2, (PH - dh) / 2, dw, dh);
    keyBackdrop(c);
    done(portrait);
  };
  img.src = srcUrl;
  return portrait;
}
