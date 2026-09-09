import { BOARD_DEFAULTS } from "@/lib/board-text";

// The landing is the board itself (mounted in the root layout). This route
// only carries the text a search engine or screen reader should find.
export default function Home() {
  return (
    <div className="sr-only">
      <h1>Kjel Schlemmer</h1>
      {BOARD_DEFAULTS.home.map((line) => <p key={line}>{line.toLowerCase()}</p>)}
    </div>
  );
}
