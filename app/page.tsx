import { FlipdotBoard } from "@/components/FlipdotBoard";
import { getBoardText } from "@/lib/board";

// the front door: the KJEL mark on a full-viewport flip-dot board.
// board copy lives in Blob, edited at /config; the no-store blob read
// keeps this route dynamic, so edits show on the next request.
export default async function Home() {
  const text = await getBoardText();
  return <FlipdotBoard text={text} />;
}
