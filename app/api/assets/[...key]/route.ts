import { type NextRequest } from "next/server";
import { getObject } from "../../../lib/server/r2";

export const runtime = "nodejs";

// Serves an R2 object by key. This is the fallback used until a public custom
// domain is connected (R2_PUBLIC_URL). Keys are unguessable UUIDs, so no auth —
// the same model as a public bucket with random keys. Objects are immutable
// (content-addressed key), hence the long, immutable cache.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await ctx.params;
  const key = segments.join("/");

  try {
    const obj = await getObject(key);
    if (!obj.Body) return new Response("Not found", { status: 404 });

    // These assets are served from the app's own origin, so a file that the
    // browser treats as an active document (e.g. a crafted SVG with <script>)
    // would run in our origin with the viewer's session. Harden the response so
    // it can only ever be an inert resource:
    //  - nosniff: stops the browser from re-typing the bytes as HTML/JS.
    //  - CSP default-src 'none'; sandbox: neutralizes any script/plugin if the
    //    file is opened directly as a document.
    //  - Content-Disposition attachment: direct navigation downloads instead of
    //    rendering. (Ignored by <img>, so canvas rendering is unaffected.)
    const filename = key.split("/").pop() ?? "file";
    return new Response(obj.Body.transformToWebStream(), {
      headers: {
        "Content-Type": obj.ContentType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(obj.ContentLength ? { "Content-Length": String(obj.ContentLength) } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
