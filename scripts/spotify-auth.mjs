// One-time: get a Spotify refresh token for this site.
//
// 1. Put SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local
// 2. In your Spotify app dashboard, add this Redirect URI exactly:
//       http://127.0.0.1:8888/callback
// 3. Run:  node scripts/spotify-auth.mjs
// 4. Approve in the browser; paste the printed SPOTIFY_REFRESH_TOKEN into .env.local
//
// No dependencies — uses Node's built-in http + global fetch.

import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { exec } from "node:child_process";

const ENV_PATH = new URL("../.env.local", import.meta.url);

const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPE = "user-top-read playlist-read-private user-read-currently-playing";

function loadEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] ??= m[2];
    }
  } catch {}
}
loadEnv();

const id = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_CLIENT_SECRET;
if (!id || !secret) {
  console.error("\n✗ Fill SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local first.\n");
  process.exit(1);
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: id,
    scope: SCOPE,
    redirect_uri: REDIRECT,
  });

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) {
    res.writeHead(404).end();
    return;
  }
  const code = new URL(req.url, REDIRECT).searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("No code.");
    return;
  }
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
    }),
  });
  const json = await tokenRes.json();
  if (json.refresh_token) {
    res.writeHead(200, { "Content-Type": "text/html" }).end(
      "<body style='font:16px monospace;background:#000;color:#fff;padding:40px'>✓ Got it. Return to your terminal.</body>"
    );
    // write the token straight into .env.local
    try {
      let env = readFileSync(ENV_PATH, "utf8");
      env = /^SPOTIFY_REFRESH_TOKEN=/m.test(env)
        ? env.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, `SPOTIFY_REFRESH_TOKEN=${json.refresh_token}`)
        : env.trimEnd() + `\nSPOTIFY_REFRESH_TOKEN=${json.refresh_token}\n`;
      writeFileSync(ENV_PATH, env);
      console.log("\n✓ SUCCESS — SPOTIFY_REFRESH_TOKEN written to .env.local. You're done here.\n");
    } catch {
      console.log("\n✓ SUCCESS — add this line to .env.local:\n");
      console.log(`SPOTIFY_REFRESH_TOKEN=${json.refresh_token}\n`);
    }
  } else {
    res.writeHead(500).end("Token exchange failed: " + JSON.stringify(json));
    console.error("\n✗ Token exchange failed:", json, "\n");
  }
  setTimeout(() => process.exit(0), 500);
});

server.listen(8888, "127.0.0.1", () => {
  console.log("\nOpening Spotify authorization in your browser…");
  console.log("If it doesn't open, visit:\n" + authUrl + "\n");
  exec(`open "${authUrl}"`);
});
