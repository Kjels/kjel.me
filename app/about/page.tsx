import { redirect } from "next/navigation";

// about lives on the landing
export default function About() {
  redirect("/#about");
}
