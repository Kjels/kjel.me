import { ImageResponse } from "next/og";
import { F } from "@/components/board/font";

export const alt = "KJEL, in flip-dots";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The mark in the board's own 5x7 face, one dot per cell, on ink.
export default function OG() {
  const word = "KJEL";
  const pitch = 34, r = 13;
  const cols = [...word].reduce((w, ch) => w + F[ch][0].length + 1, 0) - 1;
  const x0 = (size.width - cols * pitch) / 2, y0 = (size.height - 7 * pitch) / 2 - 20;
  const dots: { x: number; y: number }[] = [];
  let cx = 0;
  for (const ch of word) {
    const g = F[ch];
    for (let y = 0; y < 7; y++) for (let x = 0; x < g[0].length; x++) if (g[y][x] === "1") dots.push({ x: x0 + (cx + x) * pitch, y: y0 + y * pitch });
    cx += g[0].length + 1;
  }
  // the glider, small, lower right: the maker's mark
  const glider = ["010", "001", "111"], gp = 16;
  const gx = size.width - 120, gy = size.height - 110;
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (glider[y][x] === "1") dots.push({ x: gx + x * gp, y: gy + y * gp });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", position: "relative", display: "flex" }}>
        {dots.map((d, i) => (
          <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: r * 2, height: r * 2, borderRadius: r, background: "#f4f4f2" }} />
        ))}
        <div style={{ position: "absolute", left: 80, bottom: 72, color: "#9a999f", fontSize: 22, letterSpacing: 6, display: "flex" }}>KJEL.ME</div>
      </div>
    ),
    { ...size },
  );
}
