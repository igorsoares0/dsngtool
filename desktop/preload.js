"use strict";

// The only bridge between the renderer and the main process.
//
// contextIsolation is on and nodeIntegration is off (see main.js), so the
// renderer has no Node access at all — it can reach exactly the calls exposed
// here and nothing else. Each one mirrors a method of the ProjectRepo interface
// in ../app/lib/project-repo.ts; the renderer-side adapter that implements that
// interface on top of this object is app/lib/project-repo-sqlite.ts.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("modoDesktop", {
  repo: {
    get: (id) => ipcRenderer.invoke("repo:get", id),
    list: () => ipcRenderer.invoke("repo:list"),
    latest: () => ipcRenderer.invoke("repo:latest"),
    count: () => ipcRenderer.invoke("repo:count"),
    save: (input) => ipcRenderer.invoke("repo:save", input),
    put: (project) => ipcRenderer.invoke("repo:put", project),
    delete: (id) => ipcRenderer.invoke("repo:delete", id),
    clear: () => ipcRenderer.invoke("repo:clear"),
    getSetting: (key) => ipcRenderer.invoke("repo:getSetting", key),
    setSetting: (key, value) => ipcRenderer.invoke("repo:setSetting", key, value),
    clearSettings: () => ipcRenderer.invoke("repo:clearSettings"),
  },
  assets: {
    import: (fileName, bytes) => ipcRenderer.invoke("assets:import", fileName, bytes),
  },
  files: {
    saveImages: (items) => ipcRenderer.invoke("files:saveImages", items),
    saveProject: (name, text) => ipcRenderer.invoke("files:saveProject", name, text),
    openProject: () => ipcRenderer.invoke("files:openProject"),
  },
  menu: {
    /**
     * Subscribe to application-menu commands. Returns an unsubscribe function,
     * which matters because React effects re-run: without removing the old
     * listener a remount would fire every handler twice.
     */
    onCommand: (callback) => {
      const listener = (_event, command) => callback(command);
      ipcRenderer.on("menu:command", listener);
      return () => ipcRenderer.removeListener("menu:command", listener);
    },
  },
});
