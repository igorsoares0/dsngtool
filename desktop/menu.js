"use strict";

// The application menu.
//
// Most items forward a command to the renderer rather than acting here, because
// the editor's state lives there — the main process has no idea what is
// selected or whether the document is dirty. `send` is the only coupling.
//
// Undo/Redo are forwarded rather than declared as Electron's built-in roles.
// A role sends the *native* undo to whatever is focused, which does nothing for
// a Konva canvas, and its accelerator would take priority over the renderer's
// own Cmd+Z handler (app/hooks/use-keyboard-shortcuts.ts) — so declaring the
// role would quietly break document undo. Forwarding keeps one implementation.

const { Menu, shell } = require("electron");

const isMac = process.platform === "darwin";

function buildMenu(send) {
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "&File",
      submenu: [
        { label: "New Design", accelerator: "CmdOrCtrl+N", click: () => send("new-project") },
        { label: "Open Project…", accelerator: "CmdOrCtrl+O", click: () => send("open-file") },
        {
          label: "My Projects…",
          accelerator: "CmdOrCtrl+Shift+O",
          click: () => send("open-projects"),
        },
        { type: "separator" },
        { label: "Save", accelerator: "CmdOrCtrl+S", click: () => send("save") },
        {
          label: "Save a Copy…",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => send("save-as"),
        },
        { type: "separator" },
        { label: "Export…", accelerator: "CmdOrCtrl+E", click: () => send("export") },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "&Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", click: () => send("undo") },
        {
          label: "Redo",
          accelerator: isMac ? "Shift+Cmd+Z" : "Ctrl+Y",
          click: () => send("redo"),
        },
        { type: "separator" },
        // Roles, not forwards: these fire the DOM cut/copy/paste events on the
        // focused element, which is exactly what use-clipboard-events.ts is
        // already listening for. The canvas and text fields both keep working.
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { type: "separator" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", click: () => send("select-all") },
        { label: "Duplicate", accelerator: "CmdOrCtrl+D", click: () => send("duplicate") },
        { label: "Delete", accelerator: "Delete", click: () => send("delete") },
      ],
    },
    {
      label: "&View",
      submenu: [
        { label: "Zoom In", accelerator: "CmdOrCtrl+Plus", click: () => send("zoom-in") },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => send("zoom-out") },
        { label: "Fit to Screen", accelerator: "CmdOrCtrl+0", click: () => send("zoom-fit") },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: "Keyboard Shortcuts",
          accelerator: "CmdOrCtrl+/",
          click: () => send("shortcuts"),
        },
        { type: "separator" },
        {
          label: "Modo on the web",
          click: () => shell.openExternal("https://app.getmodo.pro"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };
