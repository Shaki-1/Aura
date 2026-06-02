const { app, BrowserWindow, ipcMain } = require("electron");
const { execFile } = require("child_process");
const path = require("path");

let mainWindow = null;
let overlayWindow = null;
let latestOverlayState = {
  mode: "voyager",
  profileName: "Default Accessibility Profile",
  filterClass: "filter-default"
};

function createSafeScanError(errorMessage) {
  return {
    privacyMode: "local-first",
    detectedIssues: [
      "AURA could not read the active window right now. Try again after selecting an app."
    ],
    aiSafeSummary: "AURA scan failed locally. No screenshots were sent to AI.",
    windowTitle: "Unavailable",
    activeApp: "Unavailable",
    screenshotSentToAI: false,
    error: errorMessage
  };
}

function parsePowerShellJson(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("PowerShell output did not contain JSON.");
  }

  return JSON.parse(output.slice(firstBrace, lastBrace + 1));
}

// IPC lets the private main process run local Windows commands while the UI stays sandboxed.
ipcMain.handle("scan-active-window", async () => {
  const scriptPath = path.join(__dirname, "active-window.ps1");

  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-ExecutionPolicy", "Bypass", "-File", scriptPath],
      { cwd: __dirname, windowsHide: true, timeout: 12000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve(createSafeScanError(stderr || error.message));
          return;
        }

        try {
          const result = parsePowerShellJson(stdout);
          resolve(result);
        } catch (parseError) {
          resolve(createSafeScanError(parseError.message));
        }
      }
    );
  });
});

function sendOverlayUpdate() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  overlayWindow.webContents.send("overlay-state-updated", latestOverlayState);
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.loadFile("overlay.html");

  overlayWindow.webContents.once("did-finish-load", sendOverlayUpdate);
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}

function ensureOverlayWindow() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
  }
}

ipcMain.handle("overlay-show", () => {
  ensureOverlayWindow();
  overlayWindow.showInactive();
  overlayWindow.setIgnoreMouseEvents(true);
  sendOverlayUpdate();
});

ipcMain.handle("overlay-hide", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

ipcMain.handle("overlay-update", (_event, overlayState) => {
  latestOverlayState = {
    mode: overlayState?.mode || "voyager",
    profileName: overlayState?.profileName || "Default Accessibility Profile",
    filterClass: overlayState?.filterClass || "filter-default"
  };

  sendOverlayUpdate();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#020514",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile("index.html");
  mainWindow.on("closed", () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }

    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  createOverlayWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
