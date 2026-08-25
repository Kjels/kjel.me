import { NextResponse } from "next/server";
import { fetchSpotifyNow } from "@/lib/sources/spotify";

// what's playing right now, cached briefly so visitors don't hammer Spotify
export const revalidate = 25;

export async function GET() {
  const listening = await fetchSpotifyNow();
  return NextResponse.json({ listening });
}
