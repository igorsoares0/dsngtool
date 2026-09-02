"use strict";

// Native save/open dialogs.
//
// The web build hands files to the browser: an <a download> for exports and a
// file input for imports. Neither belongs in a desktop app — a download that
// silently lands in ~/Downloads is not "Export…", and a file picker that can't
// remember a folder is not "Open…". So the same operations go through the OS
// dialogs here, and the renderer only supplies bytes and a suggested name.

const { dialog } = require("electron");
const fsp = require("node:fs/promises");
const path = require("node:path");

const PROJECT_EXT = "modo";

/** Decode the `data:image/png;base64,…` URL that Konva's toDataURL() returns. */
function dataUrlToBuffer(dataUrl) {
  const comma = String(dataUrl).indexOf(",");
  if (comma === -1) throw new Error("malformed data URL");
  return Buffer.from(dataUrl.slice(comma + 1), "base64");
}

/**
 * Write one or many rendered pages.
 *
 * One page asks where to put the file; several ask for a folder. Showing a save
 * dialog per page would turn a ten-page export into ten prompts, and the web
 * build's answer to that — firing ten downloads 300ms apart — is a workaround
 * for a browser limitation that does not exist here.
 */
async function saveImages(win, items) {
  if (items.length === 0) return { saved: 0 };

  if (items.length === 1) {
    const ext = path.extname(items[0].fileName).slice(1).toLowerCase() || "png";
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Export image",
      defaultPath: path.basename(items[0].fileName),
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (canceled || !filePath) return { saved: 0 };
    await fsp.writeFile(filePath, dataUrlToBuffer(items[0].dataUrl));
    return { saved: 1, path: filePath };
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Choose a folder for the exported pages",
    properties: ["openDirectory", "createDirectory"],
  });
  const dir = filePaths?.[0];
  if (canceled || !dir) return { saved: 0 };

  for (const item of items) {
    // basename, not the raw string: the name is composed in the renderer, and
    // a suggested filename must never be able to steer the write elsewhere.
    await fsp.writeFile(path.join(dir, path.basename(item.fileName)), dataUrlToBuffer(item.dataUrl));
  }
  return { saved: items.length, path: dir };
}

async function saveProject(win, defaultName, text) {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Save project",
    defaultPath: `${path.basename(String(defaultName || "design"))}.${PROJECT_EXT}`,
    filters: [{ name: "Modo project", extensions: [PROJECT_EXT] }],
  });
  if (canceled || !filePath) return { saved: false };
  await fsp.writeFile(filePath, String(text), "utf8");
  return { saved: true, path: filePath };
}

async function openProject(win) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Open project",
    properties: ["openFile"],
    filters: [
      { name: "Modo project", extensions: [PROJECT_EXT] },
      { name: "JSON", extensions: ["json"] },
    ],
  });
  const file = filePaths?.[0];
  if (canceled || !file) return null;
  return {
    text: await fsp.readFile(file, "utf8"),
    // Suggested project name, for a file whose contents carry none.
    name: path.basename(file, path.extname(file)),
    path: file,
  };
}

module.exports = { saveImages, saveProject, openProject, PROJECT_EXT };
