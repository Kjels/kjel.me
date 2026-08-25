import { redirect } from "next/navigation";

// the catalog lives ON the board now — this URL just opens it there
export default function Books() {
  redirect("/#books");
}
