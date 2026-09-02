"use strict";

const { app, BrowserWindow, ipcMain, protocol, shell, nativeTheme } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { open: openDb, close: closeDb, repo } = require("./db");
const { buildMenu } = require("./menu");
const files = require("./files");

// Where build.mjs leaves the Next static export.
const RENDERER_ROOT = path.join(__dirname, "staged", "out");

// Imported images live beside the database, under the user's data directory.
// Set once the app is ready, since that is when getPath() is meaningful.
let ASSETS_DIR = null;

/** URL path prefix under which ASSETS_DIR is served. */
const ASSET_PREFIX = "/__assets/";

// Mirrors the web upload allow-list in app/api/uploads/route.ts. SVG is absent
// from both for the same reason: it is a document format that can carry script,
// not an image format.
const ALLOWED_IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

// Not a quota — desktop storage is the user's own disk. This is a sanity guard:
// the bytes cross the IPC boundary in one structured-clone copy, and anything
// this large would exhaust the canvas long before it filled a drive.
const MAX_IMPORT_BYTES = 64 * 1024 * 1024;

app.setName("Modo");

/**
 * The renderer is served from app://modo/ rather than file://.
 *
 * `standard` and `secure` are not cosmetic: a non-standard scheme has an opaque
 * origin, and the editor needs a real one — the theme preference lives in
 * localStorage (app/store/theme-store.ts), which throws without it. `secure`
 * also makes the page a secure context, which is what the Web Crypto and
 * service-worker-adjacent APIs check for.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

/**
 * Content-Security-Policy for the packaged app.
 *
 * The web build's policy is nonce-based and lives in proxy.ts, but a nonce needs
 * a server stamping it per request and there is no server here — the export is
 * static files on disk. So this policy takes a different line: instead of
 * constraining *which* scripts may run, it constrains where anything may come
 * from at all. There is no remote origin in the allowlist, so nothing can be
 * fetched, framed, or connected to off-device. 'unsafe-inline' for scripts is
 * the cost of that trade — Next emits inline bootstrap scripts whose contents
 * change every build, so neither a hash nor a static nonce would survive a
 * rebuild.
 *
 * The exposure that buys is small: every byte of script is shipped inside the
 * signed bundle, there is no origin to be XSS'd from, and user content reaches
 * the page either as canvas draw calls (Konva, never HTML) or as React text
 * children, which are escaped.
 */
const CSP = [
  "default-src 'self' app:",
  "script-src 'self' app: 'unsafe-inline'",
  // Konva and the panels set inline style attributes on nearly every node.
  "style-src 'self' app: 'unsafe-inline'",
  // data:/blob: cover pasted images and the export preview; no https: here,
  // because a desktop design references local files, not remote URLs.
  "img-src 'self' app: data: blob:",
  "font-src 'self' app: data:",
  "connect-src 'self' app: data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Resolve a request path to a file inside `root`, or null if it escapes.
 *
 * The containment check is the important part: `path.resolve` collapses `..`,
 * so comparing the result against the root is what stops `app://modo/../..`
 * from reading the rest of the user's filesystem.
 */
function resolveWithin(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  const resolved = path.resolve(root, "." + decoded);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null;
  }
  // Next's export writes a route as either `foo.html` or `foo/index.html`.
  const candidates = [resolved];
  if (!path.extname(resolved)) {
    candidates.push(resolved + ".html", path.join(resolved, "index.html"));
  }
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function registerProtocol() {
  protocol.handle("app", async (request) => {
    const { pathname } = new URL(request.url);

    // Imported images, addressed by content hash. Served from the user's data
    // directory rather than the bundle, on the same origin as the page so the
    // CSP needs no extra source.
    if (pathname.startsWith(ASSET_PREFIX)) {
      const asset = resolveWithin(ASSETS_DIR, pathname.slice(ASSET_PREFIX.length - 1));
      if (!asset) return new Response("Not found", { status: 404 });
      return new Response(await fsp.readFile(asset), {
        headers: {
          "content-type": MIME[path.extname(asset).toLowerCase()] ?? "application/octet-stream",
          // Content-addressed: the bytes behind a given URL can never change.
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }

    const file = resolveWithin(RENDERER_ROOT, pathname === "/" ? "/index.html" : pathname);

    if (!file) {
      // SPA fallback: any unknown route renders the editor shell.
      const index = path.join(RENDERER_ROOT, "index.html");
      if (!fs.existsSync(index)) {
        return new Response(
          "<h1>Renderer not built</h1><p>Run <code>npm run build:renderer</code> in desktop/.</p>",
          { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
        );
      }
      return new Response(await fsp.readFile(index), {
        headers: { "content-type": MIME[".html"], "content-security-policy": CSP },
      });
    }

    const ext = path.extname(file).toLowerCase();
    const headers = { "content-type": MIME[ext] ?? "application/octet-stream" };
    // The policy only needs to ride on documents; attaching it to every asset
    // would be noise.
    if (ext === ".html") headers["content-security-policy"] = CSP;

    return new Response(await fsp.readFile(file), { headers });
  });
}

/**
 * Copy imported image bytes into ASSETS_DIR, named by their SHA-256.
 *
 * Content addressing does three things at once: importing the same picture
 * twice costs one copy, the URL for a given image is stable across sessions and
 * machines, and the filename never derives from anything the caller supplied —
 * only the extension does, and that is checked against an allow-list. So there
 * is no path to traverse even if the renderer were compromised.
 */
function importAsset(fileName, bytes) {
  const ext = path.extname(String(fileName ?? "")).toLowerCase();
  if (!ALLOWED_IMAGE_EXT.has(ext)) {
    throw new Error(`unsupported image type: ${ext || "(none)"}`);
  }
  const buffer = Buffer.from(bytes);
  if (buffer.byteLength === 0) throw new Error("empty file");
  if (buffer.byteLength > MAX_IMPORT_BYTES) throw new Error("file too large");

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const name = `${hash}${ext}`;
  const dest = path.join(ASSETS_DIR, name);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, buffer);

  return { url: `app://modo${ASSET_PREFIX}${name}`, bytes: buffer.byteLength };
}

function registerRepoHandlers() {
  const methods = [
    "get", "list", "latest", "count", "save", "put",
    "delete", "clear", "getSetting", "setSetting", "clearSettings",
  ];
  for (const name of methods) {
    ipcMain.handle(`repo:${name}`, (_event, ...args) => repo[name](...args));
  }
  ipcMain.handle("assets:import", (_event, fileName, bytes) => importAsset(fileName, bytes));

  const winOf = (event) => BrowserWindow.fromWebContents(event.sender);
  ipcMain.handle("files:saveImages", (e, items) => files.saveImages(winOf(e), items));
  ipcMain.handle("files:saveProject", (e, name, text) => files.saveProject(winOf(e), name, text));
  ipcMain.handle("files:openProject", (e) => files.openProject(winOf(e)));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    // Painted before the renderer's first frame, so launching doesn't flash
    // white at someone working in dark mode. Matches the themeColor pair in
    // app/layout.tsx.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0e0e10" : "#eceae5",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Most menu items are forwarded to the renderer, which owns the editor state.
  buildMenu((command) => win.webContents.send("menu:command", command));

  win.once("ready-to-show", () => win.show());
  win.loadURL("app://modo/");

  // The editor has no reason to navigate anywhere. Anything that tries — a link
  // in a design, a stray target=_blank — opens in the user's real browser
  // instead of turning this window into an uncontrolled one.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://")) {
      event.preventDefault();
      if (url.startsWith("https://")) shell.openExternal(url);
    }
  });

  return win;
}

// A second launch focuses the running window rather than opening a rival one
// with its own handle on the same SQLite file.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    ASSETS_DIR = path.join(app.getPath("userData"), "assets");
    fs.mkdirSync(ASSETS_DIR, { recursive: true });

    const dbFile = openDb(app.getPath("userData"));
    console.log(`[modo] sqlite: ${dbFile}`);
    console.log(`[modo] assets: ${ASSETS_DIR}`);

    registerProtocol();
    registerRepoHandlers();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  // Checkpoints the WAL and releases the file handle cleanly.
  app.on("will-quit", closeDb);
}
