const modeSelect = document.querySelector("#modeSelect");
const clarifyToggle = document.querySelector("#clarifyToggle");
const enforcerButton = document.querySelector("#enforcerButton");
const scannerMode = document.querySelector("#scannerMode");
const scannerApp = document.querySelector("#scannerApp");
const scannerFixes = document.querySelector("#scannerFixes");
const scannerProfile = document.querySelector("#scannerProfile");
const scannerPrivacy = document.querySelector("#scannerPrivacy");
const heroTitle = document.querySelector("#heroTitle");
const heroDescription = document.querySelector("#heroDescription");
const reportApp = document.querySelector("#reportApp");
const reportProfile = document.querySelector("#reportProfile");
const reportScreenshot = document.querySelector("#reportScreenshot");
const reportWindow = document.querySelector("#reportWindow");
const reportIssues = document.querySelector("#reportIssues");

const originalTitle = 'The Guardian of <span>Accessibility.</span>';
const clarifiedTitle = 'The Guardian for <span>everyone.</span>';
const originalDescription = "Intelligence that lives between your windows. Aura identifies, cleans, and fixes digital barriers in real-time, bringing inclusive experiences to every application on your machine.";
const clarifiedDescription = "Aura helps you use any app easily. It finds and fixes hard parts on your screen in real-time, keeping your data private.";

// accessibilityProfiles are local rules. They adapt AURA based only on the active app name.
// No screenshots, cloud AI, or screen content uploads are used to select these profiles.
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
      "Highlight important interactive elements."
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
      "Highlight primary controls when enforcement is active.",
      "Use local app-profile guidance without capturing screenshots."
    ]
  },
  "SnippingTool.exe": {
    profileName: "Capture Tool Guidance Profile",
    filterClass: "filter-canvas",
    suggestions: [
      "Highlight capture mode controls.",
      "Improve visibility around action buttons.",
      "Keep guidance local without saving or sending screenshots."
    ]
  }
};

const defaultProfile = {
  profileName: "Default Accessibility Profile",
  filterClass: "filter-default",
  suggestions: [
    "Check contrast, font size, spacing, and motion for this app.",
    "Highlight important controls when enforcement is active.",
    "Use local accessibility rules when an app-specific profile is unavailable."
  ]
};

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

// selectedMode stores the active inspection color profile from the dropdown.
let selectedMode = "voyager";

// clarifyContent controls the simplified copy and whether inspection overlays are visible.
let clarifyContent = false;

// enforcerEnabled controls the simulated enforcement state and the scanner mode text.
let enforcerEnabled = false;

let currentApp = "Waiting";
let fixesApplied = 0;
let latestReport = null;
let activeProfile = defaultProfile;

// latestIssues stores the local PowerShell suggestions so the report can show them.
let latestIssues = [];

let enforcerHasBeenStopped = false;
let monitorIntervalId = null;
let isScanning = false;
let lastDetectedApp = null;

function updateMode() {
  document.body.classList.remove("mode-voyager", "mode-guardian", "mode-beacon");
  document.body.classList.add(`mode-${selectedMode}`);

  // Overlay colors are CSS variables changed by the body mode class above.
}

function updateContent() {
  heroTitle.innerHTML = clarifyContent ? clarifiedTitle : originalTitle;
  heroDescription.textContent = clarifyContent ? clarifiedDescription : originalDescription;
}

function updateEnforcer() {
  enforcerButton.textContent =
    enforcerEnabled ? "Stop Enforcement" : "Simulate Aura Enforcer";

  scannerApp.textContent = currentApp;
  scannerFixes.textContent = enforcerEnabled ? fixesApplied : 0;
  scannerProfile.textContent = activeProfile.profileName;
  scannerPrivacy.textContent = latestReport?.privacyMode || "local-first";
}

function updateOverlay() {
  document.body.classList.toggle("show-overlay", clarifyContent || enforcerEnabled);
  document.body.classList.toggle("enforcer-active", enforcerEnabled);
}

function getOverlayPayload() {
  return {
    mode: selectedMode,
    profileName: activeProfile.profileName,
    filterClass: activeProfile.filterClass,
    activeApp: currentApp
  };
}

function sendExternalOverlayUpdate() {
  if (!enforcerEnabled || !window.auraAPI || !window.auraAPI.updateOverlay) {
    return;
  }

  window.auraAPI.updateOverlay(getOverlayPayload());
}

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

  // activeApp selects the profile by exact local app name after a case-insensitive match.
  return accessibilityProfiles[normalizedApp] || defaultProfile;
}

function applyProfileFilter(profile) {
  document.body.classList.remove(...profileFilterClasses);

  // This is the first local adaptive filter layer. It changes AURA's guidance/filter
  // state based on the active application, but it does not draw on top of external apps yet.
  // filterClass changes the UI feeling locally without redesigning the page.
  document.body.classList.add(profile.filterClass);
}

function sanitizeWindowTitle(title) {
  const cleanedTitle = String(title || "")
    .replace(/\uFFFD/g, "")
    .replace(/�/g, "")
    .trim();

  if (!cleanedTitle) {
    return "Unknown window";
  }

  if (cleanedTitle.length > 96) {
    return `${cleanedTitle.slice(0, 96).trim()}...`;
  }

  return cleanedTitle;
}

function updateLocalReport(result, profile) {
  latestReport = result;
  latestIssues = Array.isArray(profile.suggestions) ? profile.suggestions : [];

  reportApp.textContent = result.activeApp || "Unavailable";
  reportProfile.textContent = profile.profileName;
  reportScreenshot.textContent = String(result.screenshotSentToAI === true);
  reportWindow.textContent = sanitizeWindowTitle(result.windowTitle);
  reportIssues.innerHTML = "";

  latestIssues.forEach((issue) => {
    const item = document.createElement("li");
    item.textContent = issue;
    reportIssues.appendChild(item);
  });
}

function updateScannerPanelFromProfile(result, profile) {
  currentApp = result.activeApp || "Unknown.exe";
  fixesApplied = Array.isArray(profile.suggestions) ? profile.suggestions.length : 0;

  // Fixes Applied is the number of local suggestions in the matched accessibility profile.
  scannerApp.textContent = currentApp;
  scannerFixes.textContent = fixesApplied;
  scannerProfile.textContent = profile.profileName;
  scannerPrivacy.textContent = result.privacyMode || "local-first";
}

async function runLocalScan() {
  if (isScanning) {
    return;
  }

  isScanning = true;
  scannerMode.textContent = "SCANNING";

  try {
    if (!window.auraAPI || !window.auraAPI.scanActiveWindow) {
      throw new Error("Electron preload API unavailable. Start the app with Electron.");
    }

    // This IPC call asks Electron's main process to run active-window.ps1 locally.
    // The script detects the active app and suggestions without screenshots or AI upload.
    const result = await window.auraAPI.scanActiveWindow();
    console.log("AURA scan result:", result);

    if (!enforcerEnabled) {
      return;
    }

    const activeApp = result.activeApp || "Unknown.exe";
    const appChanged = activeApp !== lastDetectedApp;
    lastDetectedApp = activeApp;
    const profile = getProfileForApp(activeApp);

    currentApp = activeApp;
    latestIssues = profile.suggestions || [];
    activeProfile = profile;

    updateScannerPanelFromProfile(result, profile);

    if (appChanged || !latestReport) {
      applyProfileFilter(profile);
      updateLocalReport(result, profile);
      sendExternalOverlayUpdate();
      console.log(`AURA active app changed: ${activeApp}`);
    }

    scannerMode.textContent = "ENFORCING";
  } catch (error) {
    console.error("AURA local scan failed:", error);
    scannerMode.textContent = "ERROR";
  } finally {
    isScanning = false;
  }
}

// Future external overlay plan:
// - Create a transparent always-on-top Electron overlay window.
// - Make it click-through so it guides without blocking the active app.
// - Match the active local profile and draw guidance/filter on top of the active app.
// - No screenshots are required for app-profile filters.

function startMonitoring() {
  if (monitorIntervalId) {
    return;
  }

  console.log("AURA monitoring started");
  if (window.auraAPI && window.auraAPI.showOverlay) {
    window.auraAPI.showOverlay();
    sendExternalOverlayUpdate();
  }

  runLocalScan();

  monitorIntervalId = setInterval(() => {
    if (enforcerEnabled) {
      runLocalScan();
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

  scannerMode.textContent = "IDLE";
  scannerFixes.textContent = "0";
}

function render() {
  updateMode();
  updateContent();
  updateEnforcer();
  updateOverlay();
}

modeSelect.addEventListener("change", (event) => {
  selectedMode = event.target.value;
  render();
  sendExternalOverlayUpdate();
});

clarifyToggle.addEventListener("change", (event) => {
  clarifyContent = event.target.checked;
  render();
});

enforcerButton.addEventListener("click", () => {
  enforcerEnabled = !enforcerEnabled;

  if (!enforcerEnabled) {
    enforcerHasBeenStopped = true;
    document.body.classList.remove(...profileFilterClasses);
    stopMonitoring();
    render();
    return;
  }

  render();
  startMonitoring();
});

render();
