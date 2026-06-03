const { contextBridge, ipcRenderer } = require("electron");

// preload.js exposes one narrow, safe bridge instead of giving the browser Node.js access.
// The UI can request a local scan, but it cannot directly run shell commands.
contextBridge.exposeInMainWorld("auraAPI", {
  scanActiveWindow: () => ipcRenderer.invoke("scan-active-window"),
  scanUIAutomation: () => ipcRenderer.invoke("scan-ui-automation"),
  showOverlay: () => ipcRenderer.invoke("overlay-show"),
  hideOverlay: () => ipcRenderer.invoke("overlay-hide"),
  // updateOverlay sends the complete local overlay state to the main process.
  updateOverlay: (payload) => ipcRenderer.invoke("overlay-update", payload),
  onOverlayUpdate: (callback) => {
    ipcRenderer.on("overlay-update", (_event, payload) => callback(payload));
  },
  onEmergencyStop: (callback) => {
    ipcRenderer.on("emergency-stop", () => callback());
  }
});
