const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const { execFile } = require("child_process");
const path = require("path");

let mainWindow = null;
let overlayWindow = null;
const scriptBasePath = app.isPackaged
  ? process.resourcesPath
  : __dirname;
const activeWindowScript = path.join(scriptBasePath, "active-window.ps1");
const uiAutomationScript = path.join(scriptBasePath, "ui-automation-scan.ps1");
let latestOverlayState = {
  mode: "voyager",
  profileName: "Default Accessibility Profile",
  filterClass: "filter-default",
  activeApp: "Waiting",
  colorVisionProfile: "contrast-boost",
  selectedColorVisionProfile: "contrast-boost",
  eyeStrainProfile: "warm-comfort",
  selectedEyeStrainProfile: "warm-comfort",
  lowVisionProfile: "high-contrast",
  selectedLowVisionProfile: "high-contrast",
  filterIntensity: 60,
  screenEnforcementActive: false,
  scanStatus: "Waiting",
  enforcementAreas: []
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

function createSafeUIScanError(errorMessage) {
  return {
    activeApp: "Unavailable",
    windowTitle: "Unavailable",
    privacyMode: "local-first",
    screenshotSentToAI: false,
    uiAutomationUsed: true,
    elementCount: 0,
    detectedIssues: [
      "AURA could not inspect UI Automation metadata for the active window right now."
    ],
    enforcementAreas: [],
    aiSafeSummary: "AURA UI Automation scan failed locally. No screenshots were captured, saved, uploaded, or sent to AI.",
    error: errorMessage
  };
}

// IPC lets the private main process run local Windows commands while the UI stays sandboxed.
ipcMain.handle("scan-active-window", async () => {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-ExecutionPolicy", "Bypass", "-File", activeWindowScript],
      { cwd: scriptBasePath, windowsHide: true, timeout: 12000 },
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

ipcMain.handle("scan-ui-automation", async () => {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-ExecutionPolicy", "Bypass", "-File", uiAutomationScript],
      { cwd: scriptBasePath, windowsHide: true, timeout: 18000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve(createSafeUIScanError(stderr || error.message));
          return;
        }

        try {
          const result = parsePowerShellJson(stdout);
          resolve(result);
        } catch (parseError) {
          resolve(createSafeUIScanError(parseError.message));
        }
      }
    );
  });
});

function sendOverlayUpdate() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  if (overlayWindow.webContents.isLoading()) {
    overlayWindow.webContents.once("did-finish-load", sendOverlayUpdate);
    return;
  }

  console.log("Forwarding overlay update:", latestOverlayState);
  overlayWindow.webContents.send("overlay-update", latestOverlayState);
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
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));

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
    filterClass: overlayState?.filterClass || "filter-default",
    activeApp: overlayState?.activeApp || "Waiting",
    colorVisionProfile: overlayState?.colorVisionProfile || "contrast-boost",
    selectedColorVisionProfile: overlayState?.selectedColorVisionProfile || overlayState?.colorVisionProfile || "contrast-boost",
    eyeStrainProfile: overlayState?.eyeStrainProfile || "warm-comfort",
    selectedEyeStrainProfile: overlayState?.selectedEyeStrainProfile || overlayState?.eyeStrainProfile || "warm-comfort",
    lowVisionProfile: overlayState?.lowVisionProfile || "high-contrast",
    selectedLowVisionProfile: overlayState?.selectedLowVisionProfile || overlayState?.lowVisionProfile || "high-contrast",
    filterIntensity: Number.isFinite(Number(overlayState?.filterIntensity))
      ? Number(overlayState.filterIntensity)
      : 60,
    screenEnforcementActive: overlayState?.screenEnforcementActive === true,
    scanStatus: overlayState?.scanStatus || "Waiting",
    enforcementAreas: Array.isArray(overlayState?.enforcementAreas)
      ? overlayState.enforcementAreas
      : []
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

  mainWindow.loadFile(path.join(__dirname, "index.html"));
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
  globalShortcut.register("CommandOrControl+Alt+A", () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("emergency-stop");
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
