const previewButton = document.querySelector("#previewButton");
const testScanButton = document.querySelector("#testScanButton");
const screenEnforcementButton = document.querySelector("#screenEnforcementButton");
const emergencyStopButton = document.querySelector("#emergencyStopButton");
const filterIntensityInput = document.querySelector("#filterIntensityInput");
const filterIntensityValue = document.querySelector("#filterIntensityValue");
const preferencesStatus = document.querySelector("#preferencesStatus");
const selectedModeStatus = document.querySelector("#selectedModeStatus");
const selectedProfileStatus = document.querySelector("#selectedProfileStatus");
const screenStatus = document.querySelector("#screenStatus");
const scannerMode = document.querySelector("#scannerMode");
const scannerApp = document.querySelector("#scannerApp");
const scannerFixes = document.querySelector("#scannerFixes");
const scannerPrivacy = document.querySelector("#scannerPrivacy");
const screenshotStatus = document.querySelector("#screenshotStatus");
const enforcementAreaCount = document.querySelector("#enforcementAreaCount");
const reportWindow = document.querySelector("#reportWindow");
const reportIssues = document.querySelector("#reportIssues");
const diagScanTime = document.querySelector("#diagScanTime");
const diagScanType = document.querySelector("#diagScanType");
const diagScanStatus = document.querySelector("#diagScanStatus");
const diagActiveApp = document.querySelector("#diagActiveApp");
const diagWindowTitle = document.querySelector("#diagWindowTitle");
const diagIssueCount = document.querySelector("#diagIssueCount");
const diagLastError = document.querySelector("#diagLastError");
const diagRawResult = document.querySelector("#diagRawResult");
const modeCards = document.querySelectorAll("[data-mode-card]");
const colorProfileCards = document.querySelectorAll("[data-color-profile]");
const eyeProfileCards = document.querySelectorAll("[data-eye-profile]");
const lowProfileCards = document.querySelectorAll("[data-low-profile]");

// accessibilityProfiles are local rules. They select support suggestions from the
// active app name only, preserving privacy without screenshots or AI uploads.
const accessibilityProfiles = {
  "Notepad.exe": {
    profileName: "Text Readability Profile",
    filterClass: "filter-readability",
    suggestions: [
      "Increase font size for easier reading.",
      "Enable stronger contrast for text-heavy content.",
      "Reduce visual clutter around the editor."
    ]
  },
  "notepad++.exe": {
    profileName: "Advanced Text Readability Profile",
    filterClass: "filter-readability",
    suggestions: [
      "Increase editor font size for longer editing sessions.",
      "Use a higher contrast editor theme.",
      "Improve line spacing and reduce tab clutter."
    ]
  },
  "chrome.exe": {
    profileName: "Browser Comfort Profile",
    filterClass: "filter-browser",
    suggestions: [
      "Increase page zoom if text is small.",
      "Use reader mode for dense pages.",
      "Improve focus visibility for links and controls."
    ]
  },
  "firefox.exe": {
    profileName: "Browser Comfort Profile",
    filterClass: "filter-browser",
    suggestions: [
      "Increase page zoom if text is small.",
      "Use reader view for dense articles.",
      "Improve focus visibility for links and forms."
    ]
  },
  "msedge.exe": {
    profileName: "Browser Comfort Profile",
    filterClass: "filter-browser",
    suggestions: [
      "Increase page zoom if text is small.",
      "Use immersive reader when available.",
      "Improve focus visibility for links and buttons."
    ]
  },
  "Discord.exe": {
    profileName: "Chat Comfort Profile",
    filterClass: "filter-chat",
    suggestions: [
      "Increase UI scale for dense chat content.",
      "Reduce motion and animated elements.",
      "Highlight unread or important areas."
    ]
  },
  "Teams.exe": {
    profileName: "Meeting and Chat Comfort Profile",
    filterClass: "filter-chat",
    suggestions: [
      "Increase UI scale for chat and meeting controls.",
      "Reduce motion from animated reactions.",
      "Highlight unread messages and active call controls."
    ]
  },
  "Code.exe": {
    profileName: "Code Readability Profile",
    filterClass: "filter-code",
    suggestions: [
      "Increase editor font size.",
      "Use a high-contrast code theme.",
      "Improve line spacing for readability."
    ]
  },
  "WindowsTerminal.exe": {
    profileName: "Terminal Readability Profile",
    filterClass: "filter-terminal",
    suggestions: [
      "Increase terminal font size.",
      "Use stronger contrast between text and background.",
      "Reduce transparency for better readability."
    ]
  },
  "Spotify.exe": {
    profileName: "Media Comfort Profile",
    filterClass: "filter-media",
    suggestions: [
      "Increase contrast around playback controls.",
      "Highlight the current track and primary controls.",
      "Reduce visual distraction around animated media areas."
    ]
  },
  "mspaint.exe": {
    profileName: "Canvas Interaction Profile",
    filterClass: "filter-canvas",
    suggestions: [
      "Highlight tool controls and selected drawing options.",
      "Increase focus visibility around canvas actions.",
      "Keep menus and canvas controls visually distinct."
    ]
  },
  "ApplicationFrameHost.exe": {
    profileName: "Windows App Comfort Profile",
    filterClass: "filter-default",
    suggestions: [
      "Check contrast and spacing in this Windows app.",
      "Use local app-profile guidance without capturing screenshots.",
      "Apply the selected visual support overlay locally."
    ]
  }
};

const defaultProfile = {
  profileName: "Default Accessibility Profile",
  filterClass: "filter-default",
  suggestions: [
    "Check contrast, font size, spacing, and motion for this app.",
    "Use the selected visual support overlay locally.",
    "App-specific guidance can improve when a local profile is available."
  ]
};

const modeClasses = ["mode-voyager", "mode-guardian", "mode-beacon"];
const colorVisionClasses = [
  "color-protanopia",
  "color-deuteranopia",
  "color-tritanopia",
  "color-achromatopsia",
  "color-contrast-boost"
];
const eyeStrainClasses = [
  "eye-warm-comfort",
  "eye-dim-focus",
  "eye-reduced-motion",
  "eye-soft-contrast",
  "eye-night-session"
];
const lowVisionClasses = [
  "low-high-contrast",
  "low-large-focus",
  "low-reading-support",
  "low-edge-guidance",
  "low-maximum-visibility"
];
const profileFilterClasses = [
  "filter-readability",
  "filter-browser",
  "filter-chat",
  "filter-code",
  "filter-terminal",
  "filter-media",
  "filter-canvas",
  "filter-default"
];

// selectedMode stores the chosen enforcement type from the cards.
let selectedMode = "voyager";

// selectedColorVisionProfile stores the Voyager support profile. It is not a diagnosis.
let selectedColorVisionProfile = "contrast-boost";

let selectedEyeStrainProfile = "warm-comfort";
let selectedLowVisionProfile = "high-contrast";
let filterIntensity = 60;

// previewActive applies visual adaptation classes only inside the AURA app.
let previewActive = false;

// screenEnforcementActive controls the real click-through overlayWindow and local scans.
let screenEnforcementActive = false;

let currentApp = "Waiting";
let activeProfile = defaultProfile;

// latestIssues becomes the compact Local Accessibility Report suggestions after a local scan.
let latestIssues = [];

let latestReport = null;
let testScanRunning = false;
let monitorIntervalId = null;
let isScanning = false;
let lastDetectedApp = null;
let overlayScanStatus = "Waiting";
let scannerModeOverride = null;
let lastScanTime = "Never";
let lastScanStatus = "Waiting";
let lastScanType = "Waiting";
let lastScanError = "None";
let latestRawScanResult = null;
let latestEnforcementAreas = [];

function normalizeAppName(activeApp) {
  const appName = activeApp || "";
  const lowerName = appName.toLowerCase();
  const profileKey = Object.keys(accessibilityProfiles).find(
    (key) => key.toLowerCase() === lowerName
  );

  return profileKey || appName;
}

function getProfileForApp(activeApp) {
  const normalizedApp = normalizeAppName(activeApp);

  // activeApp selects a local profile by app name. No screen content is inspected.
  return accessibilityProfiles[normalizedApp] || defaultProfile;
}

function sanitizeWindowTitle(title) {
  const cleanedTitle = String(title || "")
    .replace(/\uFFFD/g, "")
    .replace(/�/g, "")
    .trim();

  if (!cleanedTitle) {
    return "Unknown window";
  }

  if (cleanedTitle.length > 84) {
    return `${cleanedTitle.slice(0, 84).trim()}...`;
  }

  return cleanedTitle;
}

const modeLabels = {
  voyager: "The Voyager — Color Blind",
  guardian: "The Guardian — Eye Strain",
  beacon: "The Beacon — Low Vision"
};

const colorVisionLabels = {
  "protanopia": "Protanopia support",
  "deuteranopia": "Deuteranopia support",
  "tritanopia": "Tritanopia support",
  "achromatopsia": "Achromatopsia support",
  "contrast-boost": "General contrast support"
};

const eyeStrainLabels = {
  "warm-comfort": "Warm Comfort",
  "dim-focus": "Dim Focus",
  "reduced-motion": "Reduced Motion",
  "soft-contrast": "Soft Contrast",
  "night-session": "Night Session"
};

const lowVisionLabels = {
  "high-contrast": "High Contrast",
  "large-focus": "Large Focus",
  "reading-support": "Reading Support",
  "edge-guidance": "Edge Guidance",
  "maximum-visibility": "Maximum Visibility"
};

const preferenceKeys = {
  selectedMode: "aura.selectedMode",
  selectedColorVisionProfile: "aura.selectedColorVisionProfile",
  selectedEyeStrainProfile: "aura.selectedEyeStrainProfile",
  selectedLowVisionProfile: "aura.selectedLowVisionProfile",
  filterIntensity: "aura.filterIntensity"
};

function getSelectedProfileName() {
  if (selectedMode === "guardian") {
    return eyeStrainLabels[selectedEyeStrainProfile];
  }

  if (selectedMode === "beacon") {
    return lowVisionLabels[selectedLowVisionProfile];
  }

  return colorVisionLabels[selectedColorVisionProfile];
}

function getStoredValue(key, fallback, allowedValues = null) {
  const value = localStorage.getItem(key);

  if (!value) {
    return fallback;
  }

  if (allowedValues && !allowedValues.includes(value)) {
    return fallback;
  }

  return value;
}

function clampIntensity(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 60;
  }

  return Math.min(100, Math.max(0, Math.round(number)));
}

function loadPreferences() {
  selectedMode = getStoredValue(preferenceKeys.selectedMode, selectedMode, ["voyager", "guardian", "beacon"]);
  selectedColorVisionProfile = getStoredValue(preferenceKeys.selectedColorVisionProfile, selectedColorVisionProfile, Object.keys(colorVisionLabels));
  selectedEyeStrainProfile = getStoredValue(preferenceKeys.selectedEyeStrainProfile, selectedEyeStrainProfile, Object.keys(eyeStrainLabels));
  selectedLowVisionProfile = getStoredValue(preferenceKeys.selectedLowVisionProfile, selectedLowVisionProfile, Object.keys(lowVisionLabels));
  filterIntensity = clampIntensity(localStorage.getItem(preferenceKeys.filterIntensity) || filterIntensity);
}

function savePreferences() {
  localStorage.setItem(preferenceKeys.selectedMode, selectedMode);
  localStorage.setItem(preferenceKeys.selectedColorVisionProfile, selectedColorVisionProfile);
  localStorage.setItem(preferenceKeys.selectedEyeStrainProfile, selectedEyeStrainProfile);
  localStorage.setItem(preferenceKeys.selectedLowVisionProfile, selectedLowVisionProfile);
  localStorage.setItem(preferenceKeys.filterIntensity, String(filterIntensity));
  preferencesStatus.textContent = "Preferences saved locally";
}

function getOverlayPayload() {
  // Current AURA adapts dynamically based on the active application, selected
  // accessibility profile, and local Windows UI Automation rectangles when available.
  return {
    mode: selectedMode,
    profileName: getSelectedProfileName(),
    filterClass: activeProfile.filterClass,
    activeApp: currentApp,
    colorVisionProfile: selectedColorVisionProfile,
    selectedColorVisionProfile,
    eyeStrainProfile: selectedEyeStrainProfile,
    selectedEyeStrainProfile,
    lowVisionProfile: selectedLowVisionProfile,
    selectedLowVisionProfile,
    filterIntensity,
    screenEnforcementActive,
    scanStatus: overlayScanStatus,
    enforcementAreas: latestEnforcementAreas
  };
}

function getCurrentScanTime() {
  return new Date().toLocaleString();
}

function getIssueCountFromResult(result) {
  return Array.isArray(result?.detectedIssues) ? result.detectedIssues.length : 0;
}

function updateDiagnosticsState({ type, status, result = null, error = "" }) {
  lastScanTime = getCurrentScanTime();
  lastScanType = type || lastScanType;
  lastScanStatus = status || lastScanStatus;
  lastScanError = error || result?.error || "None";

  if (result) {
    latestRawScanResult = result;
  }

  updateDiagnosticsPanel(result);
}

function updateDiagnosticsPanel(result = latestRawScanResult) {
  const activeApp = result?.activeApp || currentApp || "Waiting";
  const windowTitle = sanitizeWindowTitle(result?.windowTitle || latestReport?.windowTitle || "Unknown window");

  diagScanTime.textContent = lastScanTime;
  diagScanType.textContent = lastScanType;
  diagScanStatus.textContent = lastScanStatus;
  diagActiveApp.textContent = activeApp;
  diagWindowTitle.textContent = windowTitle;
  diagIssueCount.textContent = getIssueCountFromResult(result);
  diagLastError.textContent = lastScanError || "None";
  diagRawResult.textContent = result
    ? JSON.stringify(result, null, 2)
    : "No scan result yet.";
}

function sendExternalOverlayUpdate(force = false) {
  if ((!force && !screenEnforcementActive) || !window.auraAPI || !window.auraAPI.updateOverlay) {
    return;
  }

  const payload = getOverlayPayload();
  console.log("Sending overlay scan status:", payload);
  window.auraAPI.updateOverlay(payload);
}

function getSafeEnforcementAreas(areas) {
  if (!Array.isArray(areas)) {
    return [];
  }

  return areas
    .map((area) => ({
      x: Number(area.x),
      y: Number(area.y),
      width: Number(area.width),
      height: Number(area.height),
      reason: String(area.reason || "Accessibility enforcement area"),
      severity: String(area.severity || "medium")
    }))
    .filter((area) => (
      Number.isFinite(area.x) &&
      Number.isFinite(area.y) &&
      Number.isFinite(area.width) &&
      Number.isFinite(area.height) &&
      area.width > 0 &&
      area.height > 0
    ))
    .slice(0, 24);
}

function applyPreviewClasses() {
  document.documentElement.style.setProperty("--filter-intensity", String(filterIntensity / 100));
  document.body.classList.remove(...modeClasses);
  document.body.classList.add(`mode-${selectedMode}`);
  document.body.classList.remove(...colorVisionClasses);
  document.body.classList.remove(...eyeStrainClasses);
  document.body.classList.remove(...lowVisionClasses);

  if (selectedMode === "voyager") {
    document.body.classList.add(`color-${selectedColorVisionProfile}`);
  } else if (selectedMode === "guardian") {
    document.body.classList.add(`eye-${selectedEyeStrainProfile}`);
  } else if (selectedMode === "beacon") {
    document.body.classList.add(`low-${selectedLowVisionProfile}`);
  }

  document.body.classList.toggle("preview-active", previewActive);
  document.body.classList.toggle("screen-enforcement-active", screenEnforcementActive);
}

function applyProfileFilter(profile) {
  document.body.classList.remove(...profileFilterClasses);

  if (!previewActive && !screenEnforcementActive) {
    return;
  }

  // Current AURA adapts dynamically based on the active application and selected
  // accessibility profile. External rectangles are only drawn when Windows UI
  // Automation returns real bounding boxes.
  document.body.classList.add(profile.filterClass);
}

function updateModeCards() {
  modeCards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.modeCard === selectedMode);
  });

  colorProfileCards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.colorProfile === selectedColorVisionProfile);
  });

  eyeProfileCards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.eyeProfile === selectedEyeStrainProfile);
  });

  lowProfileCards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.lowProfile === selectedLowVisionProfile);
  });
}

function updateStatusPanel() {
  selectedModeStatus.textContent = modeLabels[selectedMode];
  selectedProfileStatus.textContent = getSelectedProfileName();
  screenStatus.textContent = screenEnforcementActive ? "ON" : "OFF";
  scannerApp.textContent = currentApp;
  scannerPrivacy.textContent = latestReport?.privacyMode || "local-first";
  screenshotStatus.textContent = "not captured";
  enforcementAreaCount.textContent = latestEnforcementAreas.length;
  scannerFixes.textContent = latestIssues.length;

  if (scannerModeOverride) {
    scannerMode.textContent = scannerModeOverride;
  } else if (!screenEnforcementActive && !isScanning) {
    scannerMode.textContent = "IDLE";
  }

  previewButton.textContent = previewActive ? "Stop Preview" : "Preview in AURA";
  filterIntensityInput.value = String(filterIntensity);
  filterIntensityValue.textContent = `${filterIntensity}%`;
  testScanButton.textContent = testScanRunning ? "Testing..." : "Test Scan";
  testScanButton.disabled = testScanRunning;
  testScanButton.classList.toggle("is-busy", testScanRunning);
  screenEnforcementButton.textContent = screenEnforcementActive
    ? "Stop Screen Enforcement"
    : "Start Screen Enforcement";
}

function renderReportIssues(issues) {
  reportIssues.innerHTML = "";

  issues.slice(0, 6).forEach((issue) => {
    const item = document.createElement("li");
    item.textContent = issue;
    reportIssues.appendChild(item);
  });
}

function updateLocalReport(result, profile) {
  latestReport = result;
  latestIssues = Array.isArray(profile.suggestions) ? profile.suggestions : [];

  reportWindow.textContent = sanitizeWindowTitle(result.windowTitle);
  renderReportIssues(latestIssues);
}

function updateScannerPanelFromProfile(result, profile) {
  currentApp = result.activeApp || "Unknown.exe";
  activeProfile = profile;
  latestIssues = Array.isArray(profile.suggestions) ? profile.suggestions : [];
  latestReport = result;
}

async function runMonitoringCycle() {
  if (isScanning) {
    return;
  }

  isScanning = true;
  scannerModeOverride = null;
  scannerMode.textContent = "SCANNING";
  overlayScanStatus = "Scanning...";
  latestEnforcementAreas = [];
  updateDiagnosticsState({
    type: "Active app + UI Automation scan",
    status: "Scanning",
    result: latestRawScanResult
  });
  sendExternalOverlayUpdate();

  try {
    if (!window.auraAPI || !window.auraAPI.scanActiveWindow || !window.auraAPI.scanUIAutomation) {
      throw new Error("Electron preload API unavailable. Start the app with Electron.");
    }

    // This monitoring cycle uses local Windows metadata only: active-window.ps1
    // for the foreground app and Windows UI Automation for accessible element
    // bounds. It does not capture, save, upload, or send screenshots to AI.
    const activeWindowResult = await window.auraAPI.scanActiveWindow();
    console.log("AURA active-window scan result:", activeWindowResult);
    const uiAutomationResult = await window.auraAPI.scanUIAutomation();
    console.log("AURA UI Automation scan result:", uiAutomationResult);

    if (!screenEnforcementActive) {
      scannerMode.textContent = "IDLE";
      return;
    }

    const activeApp = activeWindowResult.activeApp || uiAutomationResult.activeApp || "Unknown.exe";
    const appChanged = activeApp !== lastDetectedApp;
    lastDetectedApp = activeApp;
    const profile = getProfileForApp(activeApp);
    const areas = getSafeEnforcementAreas(uiAutomationResult.enforcementAreas);
    const uiAutomationLimited = Boolean(uiAutomationResult.error);
    const activeScanLimited = Boolean(activeWindowResult.error);
    const mergedIssues = Array.isArray(uiAutomationResult.detectedIssues)
      ? uiAutomationResult.detectedIssues
      : [];

    let scanStatus = "Done";

    if (uiAutomationLimited || activeScanLimited) {
      scanStatus = "Scan limited";
    } else if (areas.length > 0) {
      scanStatus = "Areas detected";
    } else {
      scanStatus = "No areas detected";
    }

    const mergedResult = {
      ...activeWindowResult,
      ...uiAutomationResult,
      activeApp,
      windowTitle: uiAutomationLimited
        ? activeWindowResult.windowTitle || uiAutomationResult.windowTitle || "Unknown window"
        : uiAutomationResult.windowTitle || activeWindowResult.windowTitle || "Unknown window",
      privacyMode: "local-first",
      screenshotSentToAI: false,
      uiAutomationUsed: true,
      detectedIssues: uiAutomationLimited
        ? ["UI areas unavailable for this app.", ...mergedIssues]
        : mergedIssues,
      enforcementAreas: areas,
      activeWindowScan: activeWindowResult,
      uiAutomationScan: uiAutomationResult
    };

    updateScannerPanelFromProfile(mergedResult, profile);
    latestIssues = mergedResult.detectedIssues.length > 0
      ? mergedResult.detectedIssues
      : profile.suggestions;
    latestEnforcementAreas = areas;
    overlayScanStatus = scanStatus;
    applyProfileFilter(profile);
    latestReport = mergedResult;
    reportWindow.textContent = sanitizeWindowTitle(mergedResult.windowTitle);
    renderReportIssues(latestIssues);
    updateDiagnosticsState({
      type: "Active app + UI Automation scan",
      status: scanStatus,
      result: mergedResult,
      error: uiAutomationResult.error || activeWindowResult.error || ""
    });
    sendExternalOverlayUpdate();

    if (appChanged) {
      console.log(`AURA active app changed: ${activeApp}`);
    }

    scannerMode.textContent = uiAutomationLimited || activeScanLimited ? "SCAN LIMITED" : "ENFORCING";
  } catch (error) {
    console.error("AURA monitoring cycle failed:", error);
    scannerMode.textContent = "SCAN LIMITED";
    overlayScanStatus = "Scan limited";
    latestEnforcementAreas = [];
    latestIssues = ["UI areas unavailable for this app."];
    renderReportIssues(latestIssues);
    updateDiagnosticsState({
      type: "Active app + UI Automation scan",
      status: "Scan limited",
      error: error.message
    });
    sendExternalOverlayUpdate();
  } finally {
    isScanning = false;
    render();
  }
}

async function runTestScan() {
  if (testScanRunning) {
    return;
  }

  testScanRunning = true;
  updateDiagnosticsState({
    type: "Active app scan",
    status: "Scanning",
    result: latestRawScanResult
  });
  render();

  try {
    if (!window.auraAPI || !window.auraAPI.scanActiveWindow) {
      throw new Error("Electron preload API unavailable. Start the app with Electron.");
    }

    // Test Scan runs active-window.ps1 once for diagnostics only.
    // It does not start the overlay, change enforcement mode, or upload anything.
    const result = await window.auraAPI.scanActiveWindow();
    console.log("AURA test scan result:", result);
    updateDiagnosticsState({
      type: "Active app scan",
      status: result.error ? "Error" : "Done",
      result,
      error: result.error || ""
    });
  } catch (error) {
    console.error("AURA test scan failed:", error);
    const errorResult = {
      activeApp: "Unavailable",
      windowTitle: "Unavailable",
      privacyMode: "local-first",
      screenshotSentToAI: false,
      detectedIssues: [
        "AURA test scan failed locally."
      ],
      aiSafeSummary: "AURA test scan failed locally. No screenshots were captured, saved, or sent to AI.",
      error: error.message
    };
    updateDiagnosticsState({
      type: "Active app scan",
      status: "Error",
      result: errorResult,
      error: error.message
    });
  } finally {
    testScanRunning = false;
    render();
  }
}

function startMonitoring() {
  if (monitorIntervalId) {
    return;
  }

  console.log("AURA monitoring started");

  if (window.auraAPI && window.auraAPI.showOverlay) {
    window.auraAPI.showOverlay();
    sendExternalOverlayUpdate();
  }

  runMonitoringCycle();

  monitorIntervalId = setInterval(() => {
    if (screenEnforcementActive) {
      runMonitoringCycle();
    }
  }, 3000);
}

function stopMonitoring() {
  if (monitorIntervalId) {
    clearInterval(monitorIntervalId);
    monitorIntervalId = null;
  }

  console.log("AURA monitoring stopped");

  if (window.auraAPI && window.auraAPI.hideOverlay) {
    window.auraAPI.hideOverlay();
  }

  screenEnforcementActive = false;
  isScanning = false;
  overlayScanStatus = "Waiting";
  latestEnforcementAreas = [];
  scannerModeOverride = null;
  scannerMode.textContent = "IDLE";
  lastDetectedApp = null;
}

function emergencyStop() {
  if (!screenEnforcementActive && !monitorIntervalId) {
    render();
    return;
  }

  stopMonitoring();
  applyProfileFilter(activeProfile);
  render();
}

function togglePreview() {
  previewActive = !previewActive;
  applyProfileFilter(activeProfile);
  render();
}

function toggleScreenEnforcement() {
  screenEnforcementActive = !screenEnforcementActive;

  if (!screenEnforcementActive) {
    stopMonitoring();
    applyProfileFilter(activeProfile);
    render();
    return;
  }

  applyProfileFilter(activeProfile);
  render();
  startMonitoring();
}

function selectMode(mode) {
  selectedMode = mode;
  savePreferences();
  render();
  sendExternalOverlayUpdate();
}

function selectColorVisionProfile(profile) {
  selectedColorVisionProfile = profile;
  savePreferences();
  render();
  sendExternalOverlayUpdate();
}

function selectEyeStrainProfile(profile) {
  selectedEyeStrainProfile = profile;
  savePreferences();
  render();
  sendExternalOverlayUpdate();
}

function selectLowVisionProfile(profile) {
  selectedLowVisionProfile = profile;
  savePreferences();
  render();
  sendExternalOverlayUpdate();
}

function updateFilterIntensity(value) {
  filterIntensity = clampIntensity(value);
  savePreferences();
  render();
  sendExternalOverlayUpdate();
}

function render() {
  applyPreviewClasses();
  updateModeCards();
  updateStatusPanel();
}

modeCards.forEach((card) => {
  card.addEventListener("click", () => {
    selectMode(card.dataset.modeCard);
  });
});

colorProfileCards.forEach((card) => {
  card.addEventListener("click", () => {
    selectColorVisionProfile(card.dataset.colorProfile);
  });
});

eyeProfileCards.forEach((card) => {
  card.addEventListener("click", () => {
    selectEyeStrainProfile(card.dataset.eyeProfile);
  });
});

lowProfileCards.forEach((card) => {
  card.addEventListener("click", () => {
    selectLowVisionProfile(card.dataset.lowProfile);
  });
});

previewButton.addEventListener("click", togglePreview);
testScanButton.addEventListener("click", runTestScan);
screenEnforcementButton.addEventListener("click", toggleScreenEnforcement);
emergencyStopButton.addEventListener("click", emergencyStop);
filterIntensityInput.addEventListener("input", (event) => {
  updateFilterIntensity(event.target.value);
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    emergencyStop();
  }
});

if (window.auraAPI && window.auraAPI.onEmergencyStop) {
  window.auraAPI.onEmergencyStop(emergencyStop);
}

loadPreferences();
updateDiagnosticsPanel();
render();
