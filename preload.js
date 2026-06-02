const { contextBridge, ipcRenderer } = require("electron");

// preload.js exposes one narrow, safe bridge instead of giving the browser Node.js access.
// The UI can request a local scan, but it cannot directly run shell commands.
contextBridge.exposeInMainWorld("auraAPI", {
  scanActiveWindow: () => ipcRenderer.invoke("scan-active-window"),
  showOverlay: () => ipcRenderer.invoke("overlay-show"),
  hideOverlay: () => ipcRenderer.invoke("overlay-hide"),
  updateOverlay: (payload) => ipcRenderer.invoke("overlay-update", payload),
  onOverlayUpdate: (callback) => {
    ipcRenderer.on("overlay-state-updated", (_event, payload) => callback(payload));
  }
});
