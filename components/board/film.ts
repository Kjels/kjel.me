// A 1-bit film for the board: frames of on/off cells, each stored as the run-length
// encoded XOR against the frame before it. See scripts/encode-film.mjs for the writer.
export class Film {
  readonly w: number; readonly h: number; readonly fps: number; readonly frames: number;
  /** the current frame, one byte a cell */
  readonly cells: Uint8Array;
  index = -1;
  private readonly buf: Uint8Array;
  private readonly at: number[] = []; // byte offset of each frame's body
  private readonly len: number[] = [];

  constructor(data: ArrayBuffer) {
    const b = new Uint8Array(data), v = new DataView(data);
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== "FDF1") throw new Error("not a film");
    this.w = v.getUint16(4, true); this.h = v.getUint16(6, true);
    this.fps = v.getUint8(8); this.frames = v.getUint32(9, true);
    this.buf = b;
    this.cells = new Uint8Array(this.w * this.h);
    let p = 16;
    for (let i = 0; i < this.frames; i++) {
      const n = v.getUint32(p, true); p += 4;
      this.at.push(p); this.len.push(n); p += n;
    }
  }

  /** advance to the next frame, wrapping. Returns false at the end when not looping */
  step(loop: boolean): boolean {
    const next = this.index + 1;
    if (next >= this.frames) {
      if (!loop) return false;
      this.cells.fill(0); this.index = -1;
      return this.step(false);
    }
    // apply the XOR runs: alternating spans of unchanged and flipped cells, starting unchanged
    let p = this.at[next];
    const end = p + this.len[next];
    let i = 0, flip = 0;
    while (p < end) {
      let run = 0, shift = 0, byte: number;
      do { byte = this.buf[p++]; run |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
      if (flip) { const stop = i + run; for (; i < stop; i++) this.cells[i] ^= 1; }
      else i += run;
      flip ^= 1;
    }
    this.index = next;
    return true;
  }
}

/** fetch and decode a film; null when there isn't one at that path */
export async function loadFilm(url: string): Promise<Film | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Film(await res.arrayBuffer());
  } catch {
    return null;
  }
}
