import { FlipdotBoard } from "@/components/FlipdotBoard";
import { getBoardText } from "@/lib/board";
import { getBoardBooks } from "@/lib/books";

// the front door: the KJEL mark on a full-viewport flip-dot board.
// board copy lives in Blob, edited at /config; the no-store blob read
// keeps this route dynamic, so edits show on the next request.
// NOW carries a live READING line from whichever book is marked reading.
export default async function Home() {
  const [text, books] = await Promise.all([getBoardText(), getBoardBooks()]);
  const reading = books.find((b) => b.status === "reading");
  if (reading) {
    text.pages = {
      ...text.pages,
      NOW: [...(text.pages.NOW ?? []), "", `READING: ${reading.title.toUpperCase()}.`],
    };
  }
  return <FlipdotBoard text={text} books={books} />;
}
