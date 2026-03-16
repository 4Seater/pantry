// Vercel Serverless Function: image proxy for Open Food Facts / Open Beauty Facts
// Fetches images server-side (no CORS restriction) and returns them with permissive headers.

const ALLOWED_HOSTS = [
  "openfoodfacts.org",
  "openfoodfacts.net",
  "openbeautyfacts.org",
  "static.openfoodfacts.org",
  "images.openfoodfacts.org",
  "world.openfoodfacts.org",
];

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing url param");
  }

  // Security: only proxy from known trusted hosts
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).send("Invalid url");
  }

  const allowed = ALLOWED_HOSTS.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith("." + h)
  );
  if (!allowed) {
    return res.status(403).send("Host not allowed: " + parsed.hostname);
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "PantryApp/1.0 (image proxy)",
        Accept: "image/*",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send("Upstream error");
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    return res.status(500).send("Proxy error: " + e.message);
  }
}
