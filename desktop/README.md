# Modo Desktop

The Electron build of Modo: the same editor, offline, with SQLite on disk
instead of a server.

## The rule this directory exists to keep

**The web app does not change.** It keeps accounts, cross-device sync, R2
uploads, AI generation, Paddle and quotas exactly as they are. The desktop app
is a *second build target* of the same source, never a fork and never a
replacement.

Two mechanisms enforce that rather than leaving it to discipline:

1. **`build.mjs` stages a filtered copy.** `next build` runs against
   `desktop/staged/`, not against the repo. The web source tree is never
   modified — not temporarily, not in a `finally` block that a crashed build
   might skip.
2. **Shared code branches on a compile-time constant.** `IS_DESKTOP`
   (`app/lib/platform.ts`) reads `NEXT_PUBLIC_DESKTOP`, which only `build.mjs`
   sets. In the web build it is a literal `false`, so every desktop branch is
   dead code Next strips out.

## Running it

```bash
cd desktop
npm install        # once — Electron only, in this directory's own node_modules
npm run dev        # build the renderer, then launch
```

### Sharing a checkout between Windows and WSL

`C:\…\dsgntool` and `/mnt/c/…/dsgntool` are the same folder, but some packages
ship compiled binaries and npm installs the one matching the OS it runs on. The
two halves behave differently:

- **The repo's `node_modules` supports both at once.** npm keeps the platform
  packages it has already fetched, so after installing from each side you end up
  with `@next/swc-linux-x64-gnu` *and* `@next/swc-win32-x64-msvc` (likewise
  `lightningcss-*`). `next build` then works from either.
- **`desktop/node_modules/electron` holds exactly one binary.** Its install
  script downloads `dist/` for the current platform, so it belongs to whichever
  side ran it last. To switch:

  ```bash
  cd desktop/node_modules/electron && node install.js
  ```

  Run that from the OS you want to launch on. Note `npm install` may leave the
  package present but `dist/` missing, in which case `electron .` fails with no
  binary — the same command fixes it.

`build.mjs` refuses to start when the repo's node_modules has no binary for the
current platform, rather than failing somewhere deep in the build.

There is no HMR: the renderer is a staged static export, so any edit under
`app/` needs `npm run build:renderer` (or `npm run dev`) before the window shows
it. Reopening the window is not enough.

`npm run build:renderer` and `npm start` are the two halves separately.

To produce installers:

```bash
npm run pack        # unpacked build in dist/linux-unpacked — fastest way to test packaging
npm run dist:linux  # AppImage + .deb
npm run dist:win    # NSIS installer  (needs Windows, or Wine)
npm run dist:mac    # dmg             (needs macOS)
```

Only the host's own platform builds without extra tooling; Linux artifacts are
the ones verified so far.

Electron lives here rather than in the repo's `package.json` on purpose: the
production web deploy runs `npm install` on a memory-tight box (see
`DEPLOY.md`), and there is no reason for it to pull ~250 MB of Electron it will
never run.

## Shape

```
main.js      Electron main process: window, app:// protocol, IPC handlers
preload.js   the only renderer→main bridge (contextIsolation on, no Node in the renderer)
db.js        SQLite via node:sqlite — schema, migrations, and the repository
menu.js      the application menu; most items forward a command to the renderer
files.js     native save/open dialogs
build.mjs    stages a filtered copy of the app and runs `next build`
resources/   electron-builder build resources (the app icon)
staged/      generated; the staged sources and the static export in staged/out
dist/        generated; packaged installers
```

Only `main.js`, `preload.js`, `db.js`, `menu.js`, `files.js` and `staged/out/`
go into the shipped asar — the staged *sources* and the symlinked
`node_modules` are excluded by the `files` allowlist in `package.json`. There
are no production dependencies at all, which is downstream of `node:sqlite`
being built in.

On the renderer side, in the shared tree:

```
app/lib/platform.ts            IS_DESKTOP
app/lib/desktop-bridge.ts      typed view of window.modoDesktop
app/lib/project-repo.ts        the storage interface both builds implement
app/lib/project-repo-sqlite.ts desktop implementation (IPC → db.js)
app/lib/project-repo-dexie.ts  web implementation (IndexedDB)
app/lib/desktop-assets.ts      image import → local disk
app/lib/desktop-files.ts       native save/open, used by the menu and the export modal
app/hooks/use-desktop-menu.ts  subscribes components to menu commands
app/lib/save-project.ts        one save implementation, shared by topbar and menu
```

## Menus

`menu.js` builds the application menu; nearly every item forwards a command
over IPC rather than acting in the main process, because the editor's state
lives in the renderer. Components subscribe to the commands they can service —
`editor-layout.tsx` takes File and Edit, `canvas-area.tsx` takes the View menu's
zoom items, since "Fit" needs the measured container size that never leaves it.
The IPC channel is the command bus, so nothing has to be threaded through props.

Two deliberate choices:

- **Undo/Redo forward instead of using Electron's `role`.** A role sends the
  *native* undo to whatever is focused, which does nothing for a Konva canvas,
  and its accelerator outranks the renderer's own Cmd+Z handler — declaring the
  role would quietly break document undo. The forwarded handler mirrors the
  text-field guard in `use-keyboard-shortcuts.ts`, so Cmd+Z while renaming a
  project still undoes the *text*.
- **Cut/Copy/Paste do use roles**, because those fire the DOM clipboard events
  that `use-clipboard-events.ts` already listens for. Canvas and text fields
  both keep working.

Export and Open go through OS dialogs (`files.js`). A multi-page export asks for
a destination folder once instead of opening a save dialog per page — the web
build's trick of firing N downloads 300 ms apart works around a browser
limitation that does not exist here.

## Storage

`node:sqlite` ships inside Electron's bundled Node (24.19 on Electron 44), so
there is no native module and no `@electron/rebuild` step on version bumps —
which is the usual reason SQLite in Electron becomes a packaging problem.

- Database: `<userData>/modo.db`, WAL mode.
- Images: `<userData>/assets/<sha256>.<ext>`, served over
  `app://modo/__assets/…`. Content-addressed, so importing the same picture
  twice costs one copy and a URL never goes stale.
- Schema versioning is `PRAGMA user_version` against the `MIGRATIONS` array in
  `db.js` — the counterpart to Dexie's `.version(n)` chain in the web build.

The document (pages + elements) is one JSON column, deliberately not normalised
into element rows: the editor loads whole projects into Zustand and never
queries an individual element, so normalising would buy nothing and cost a
migration every time `app/types/editor.ts` changes.

## What the desktop build leaves out

Excluded from the staged copy (`EXCLUDED` in `build.mjs`): `proxy.ts`,
`app/api/`, `app/(auth)/`, `app/dashboard/`, `app/lib/server/`,
`app/manifest.ts`.

Hidden at their render sites via `IS_DESKTOP`: the account menu, the storage
meter, the upgrade modal, the AI bar and its rail button, the iOS install hint.
`project-sync.ts` no-ops at every entry point — SQLite *is* the source of truth
here, not a cache of one.

## Security posture

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The
renderer's entire capability surface is the object in `preload.js`.

The `app://` scheme is registered `standard` and `secure` so the page has a real
origin — without it `localStorage` throws and the theme preference has nowhere
to live.

The CSP (`main.js`) takes a different line from the web app's nonce-based policy
in `proxy.ts`, because a static export has no server to stamp a per-request
nonce. Instead of constraining which scripts may run, it constrains where
anything may come from: no remote origin appears in the allowlist at all.
`'unsafe-inline'` for scripts is the price — Next emits inline bootstrap scripts
whose contents change every build, so neither a hash nor a fixed nonce survives
a rebuild.

## Not done yet

- **Code signing and notarization.** Unsigned builds; macOS will refuse to open
  the dmg without a Gatekeeper override, and Windows will show a SmartScreen
  warning. This needs certificates, so it is a decision before it is work.
- **Auto-update.** No update feed. `electron-updater` pairs with the existing
  electron-builder config, but it needs somewhere to publish to.
- **Windows and macOS artifacts.** Configured but unbuilt — each needs its own
  host (or Wine, for NSIS).
- **`.modo` on double-click.** `fileAssociations` plus an `open-file` handler in
  the main process. Open Project… works; the OS association does not exist yet.
- **Orphan assets.** Deleting a project leaves its images in
  `<userData>/assets/`. Needs a sweep that keeps only hashes still referenced by
  some project.
- **Bundle pruning.** `better-auth` and `@paddle/paddle-js` are still compiled
  into the desktop renderer even though the UI that uses them is hidden. Dead
  weight, not a defect.
