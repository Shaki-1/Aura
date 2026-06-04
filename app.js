const previewButton = document.querySelector("#previewButton");
const screenEnforcementButton = document.querySelector("#screenEnforcementButton");
const stopAllControl = document.querySelector("#stopAllControl");
const filterIntensityInput = document.querySelector("#filterIntensityInput");
const filterIntensityValue = document.querySelector("#filterIntensityValue");
const detectionModeInputs = document.querySelectorAll("input[name='detectionMode']");
const detectionSummary = document.querySelector("#detectionSummary");
const mainView = document.querySelector("#mainView");
const aboutView = document.querySelector("#aboutView");
const aboutButton = document.querySelector("#aboutButton");
const backToMainButton = document.querySelector("#backToMainButton");
const modeFitList = document.querySelector("#modeFitList");
const modeChoiceContent = document.querySelector("#modeChoiceContent");
const modeSummaryPanel = document.querySelector("#modeSummaryPanel");
const modeSummaryText = document.querySelector("#modeSummaryText");
const viewModeButton = document.querySelector("#viewModeButton");
const changeModeButton = document.querySelector("#changeModeButton");
const profileSummaryPanel = document.querySelector("#profileSummaryPanel");
const profileSummaryText = document.querySelector("#profileSummaryText");
const viewProfileButton = document.querySelector("#viewProfileButton");
const changeProfileButton = document.querySelector("#changeProfileButton");
const actionPanel = document.querySelector("#actionPanel");
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

const modeFitOptions = {
  voyager: ["Color blindness", "Color differentiation", "Contrast support"],
  guardian: ["Eye fatigue", "Long work sessions", "Light sensitivity"],
  beacon: ["Low vision", "Reading assistance", "High visibility support"]
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
const workflowClasses = ["workflow-step-mode", "workflow-step-profile", "workflow-step-apply"];
const READING_AREA_CONFIDENCE_THRESHOLD = 60;
const LOCAL_VISION_TEXT_CLUSTER_CONFIDENCE_THRESHOLD = 55;
// Temporary developer verification flag. This enables local vision only for the
// current app session so we can prove whether in-memory layout detection runs
// during enforcement. It is not persisted and has no public UI toggle.
const ENABLE_LOCAL_VISION_DURING_ENFORCEMENT_TESTING = true;

// selectedMode stores the chosen enforcement type after Step 1 is complete.
let selectedMode = null;

// selectedColorVisionProfile stores the Voyager support profile. It is not a diagnosis.
let selectedColorVisionProfile = null;

let selectedEyeStrainProfile = null;
let selectedLowVisionProfile = null;
let filterIntensity = 60;
let detectionMode = "dynamic";
let workflowStep = 1;
let profileSelected = false;
let modeDetailsExpanded = false;
let profileDetailsExpanded = false;
let currentView = "main";

// previewActive applies visual adaptation classes only inside the AURA app.
let previewActive = false;

// screenEnforcementActive controls the real click-through overlayWindow and local scans.
let screenEnforcementActive = false;

let currentApp = "Waiting";
let activeProfile = defaultProfile;

let latestIssues = [];

let latestReport = null;
let monitorIntervalId = null;
let isScanning = false;
let lastDetectedApp = null;
let lastDetectedWindowTitle = null;
let overlayScanStatus = "Waiting";
let lastScanTime = "Never";
let lastScanStatus = "Waiting";
let lastScanType = "Waiting";
let lastScanError = "None";
let latestRawScanResult = null;
let latestEnforcementAreas = [];
let accessibilityElements = [];
let importantElements = [];
let lastElementCount = 0;
let lastImportantElementCount = 0;
let topImportantElements = [];
let primaryReadingArea = null;
let primaryReadingAreaReason = "UI Automation has not run yet.";
let detectionStatus = "general-support";
let scanSequenceId = 0;
let activeScanSequenceId = null;
let scanWatchdogId = null;
let activityRefreshTimeoutId = null;
let localVisionTestingEnabledThisSession = false;

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
  voyager: "The Voyager — Color blind",
  guardian: "The Guardian — Eye strain",
  beacon: "The Beacon — Low vision"
};

const colorVisionLabels = {
  "protanopia": "Red-green support (Protanopia)",
  "deuteranopia": "Red-green support (Deuteranopia)",
  "tritanopia": "Blue-yellow support (Tritanopia)",
  "achromatopsia": "Monochrome support (Achromatopsia)",
  "contrast-boost": "General contrast support"
};

const eyeStrainLabels = {
  "warm-comfort": "Warm comfort",
  "dim-focus": "Dim focus",
  "reduced-motion": "Reduced motion",
  "soft-contrast": "Soft contrast",
  "night-session": "Night session"
};

const lowVisionLabels = {
  "high-contrast": "High contrast",
  "large-focus": "Large focus",
  "reading-support": "Reading support",
  "edge-guidance": "Edge guidance",
  "maximum-visibility": "Maximum visibility"
};

const preferenceKeys = {
  selectedMode: "aura.selectedMode",
  selectedColorVisionProfile: "aura.selectedColorVisionProfile",
  selectedEyeStrainProfile: "aura.selectedEyeStrainProfile",
  selectedLowVisionProfile: "aura.selectedLowVisionProfile",
  filterIntensity: "aura.filterIntensity",
  detectionMode: "aura.detectionMode"
};

function getSelectedProfileName() {
  if (selectedMode === "guardian") {
    return eyeStrainLabels[selectedEyeStrainProfile] || "Choose profile";
  }

  if (selectedMode === "beacon") {
    return lowVisionLabels[selectedLowVisionProfile] || "Choose profile";
  }

  return colorVisionLabels[selectedColorVisionProfile] || "Choose profile";
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
  selectedColorVisionProfile = getStoredValue(preferenceKeys.selectedColorVisionProfile, selectedColorVisionProfile, Object.keys(colorVisionLabels));
  selectedEyeStrainProfile = getStoredValue(preferenceKeys.selectedEyeStrainProfile, selectedEyeStrainProfile, Object.keys(eyeStrainLabels));
  selectedLowVisionProfile = getStoredValue(preferenceKeys.selectedLowVisionProfile, selectedLowVisionProfile, Object.keys(lowVisionLabels));
  filterIntensity = clampIntensity(localStorage.getItem(preferenceKeys.filterIntensity) || filterIntensity);
  detectionMode = getStoredValue(preferenceKeys.detectionMode, detectionMode, ["dynamic", "general"]);
}

function savePreferences() {
  if (selectedMode) {
    localStorage.setItem(preferenceKeys.selectedMode, selectedMode);
  }

  if (selectedColorVisionProfile) {
    localStorage.setItem(preferenceKeys.selectedColorVisionProfile, selectedColorVisionProfile);
  }

  if (selectedEyeStrainProfile) {
    localStorage.setItem(preferenceKeys.selectedEyeStrainProfile, selectedEyeStrainProfile);
  }

  if (selectedLowVisionProfile) {
    localStorage.setItem(preferenceKeys.selectedLowVisionProfile, selectedLowVisionProfile);
  }

  localStorage.setItem(preferenceKeys.filterIntensity, String(filterIntensity));
  localStorage.setItem(preferenceKeys.detectionMode, detectionMode);
}

function getIntensityLabel(value) {
  const intensity = clampIntensity(value);

  if (intensity <= 25) {
    return "Minimal";
  }

  if (intensity <= 50) {
    return "Balanced";
  }

  if (intensity <= 75) {
    return "Strong";
  }

  return "Maximum";
}

function getOverlayPayload() {
  // Current AURA adapts dynamically based on the active application, selected
  // accessibility profile, and local Windows UI Automation rectangles when available.
  const generalDetectionMode = detectionMode === "general";
  const overlayPrimaryReadingArea = generalDetectionMode ? null : primaryReadingArea;
  const overlayDetectionStatus = generalDetectionMode ? "general-support" : detectionStatus;
  const overlayStatus = generalDetectionMode && screenEnforcementActive
    ? "General support active"
    : overlayScanStatus;

  return {
    mode: selectedMode || "voyager",
    detectionMode,
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
    scanStatus: overlayStatus,
    detectionStatus: overlayDetectionStatus,
    uiAutomationUsed: Boolean(latestReport?.uiAutomationUsed),
    elementCount: lastElementCount,
    importantElementCount: lastImportantElementCount,
    enforcementAreas: latestEnforcementAreas,
    primaryReadingArea: overlayPrimaryReadingArea
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

}

function sendExternalOverlayUpdate(force = false) {
  if ((!force && !screenEnforcementActive) || !window.auraAPI || !window.auraAPI.updateOverlay) {
    return;
  }

  const payload = getOverlayPayload();
  console.log("LOG_PRIMARY_AREA_BEFORE_OVERLAY_FORWARD:", primaryReadingArea);
  console.log("LOG_PRIMARY_AREA_BEFORE_OVERLAY_FORWARD payload:", payload.primaryReadingArea);
  console.log("Overlay payload primaryReadingArea:", payload.primaryReadingArea);
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

function normalizeAccessibilityElements(elements) {
  if (!Array.isArray(elements)) {
    return [];
  }

  return elements
    .map((element) => ({
      name: String(element.name || ""),
      controlType: String(element.controlType || "Unknown"),
      automationId: String(element.automationId || ""),
      isEnabled: Boolean(element.isEnabled),
      isKeyboardFocusable: Boolean(element.isKeyboardFocusable),
      hasKeyboardFocus: Boolean(element.hasKeyboardFocus),
      x: Number(element.x),
      y: Number(element.y),
      width: Number(element.width),
      height: Number(element.height)
    }))
    .filter((element) => (
      Number.isFinite(element.x) &&
      Number.isFinite(element.y) &&
      Number.isFinite(element.width) &&
      Number.isFinite(element.height) &&
      element.width > 0 &&
      element.height > 0
    ));
}

function scoreAccessibilityElement(element) {
  const controlTypeScores = {
    Document: 100,
    Edit: 95,
    Text: 80,
    Button: 70,
    Hyperlink: 65,
    ComboBox: 60,
    List: 55,
    MenuItem: 50,
    TabItem: 45,
    ScrollBar: 15,
    Pane: 10,
    Window: 5
  };

  let score = controlTypeScores[element.controlType] || 0;
  const hasName = element.name.trim().length > 0;

  if (element.isKeyboardFocusable) {
    score += 10;
  }

  if (element.hasKeyboardFocus) {
    score += 25;
  }

  if (hasName) {
    score += 5;
  }

  if (element.width < 30) {
    score -= 20;
  }

  if (element.height < 20) {
    score -= 20;
  }

  if (element.isKeyboardFocusable && !hasName) {
    score -= 15;
  }

  return score;
}

function getTopAccessibilityAreas(elements) {
  return elements
    .map((element) => ({
      ...element,
      score: scoreAccessibilityElement(element)
    }))
    .filter((element) => element.score >= 60)
    .sort((first, second) => second.score - first.score)
    .slice(0, 20);
}

function getImportantAccessibilityElements(elements) {
  return getTopAccessibilityAreas(elements);
}

function getReadingAreaDiscardReason(area, context) {
  const lowerName = String(area.name || "").toLowerCase();

  if (!context.readingCandidateTypes.includes(area.type)) {
    return "non-reading-control-type";
  }

  if (area.width <= 400 || area.height <= 250) {
    return "too-small-for-reading-area";
  }

  if (context.blockedTypes.includes(area.type)) {
    return "blocked-control-type";
  }

  if (area.height < 80) {
    return "height-under-80";
  }

  if (lowerName.includes("toolbar") || lowerName.includes("tool bar")) {
    return "toolbar-like-name";
  }

  if (lowerName.includes("menu")) {
    return "menu-like-name";
  }

  if (lowerName.includes("tab")) {
    return "tab-like-name";
  }

  if (lowerName.includes("status")) {
    return "status-bar-like-name";
  }

  if (context.isGenericFullWindowFallback) {
    return "generic-full-window-fallback";
  }

  if (area.score < 100) {
    return "score-below-threshold";
  }

  return "candidate-kept";
}

function calculateReadingAreaConfidence(area) {
  if (!area) {
    return 0;
  }

  const screenWidth = window.screen?.width || window.innerWidth || 0;
  const screenHeight = window.screen?.height || window.innerHeight || 0;
  const lowerName = String(area.name || "").toLowerCase();
  let confidence = 45;

  if (["Document", "Edit", "Text"].includes(area.type)) {
    confidence += 24;
  } else if (["Pane", "Group", "Custom"].includes(area.type)) {
    confidence -= 12;
  }

  if (area.hasKeyboardFocus) {
    confidence += 14;
  }

  if (area.isKeyboardFocusable) {
    confidence += 8;
  }

  if (area.width >= 500 && area.height >= 300) {
    confidence += 12;
  } else if (area.width >= 320 && area.height >= 180) {
    confidence += 6;
  }

  if (area.y > 90) {
    confidence += 6;
  }

  const coversMoreThan90Percent = (
    screenWidth > 0 &&
    screenHeight > 0 &&
    area.width >= screenWidth * 0.9 &&
    area.height >= screenHeight * 0.9
  );

  if (coversMoreThan90Percent) {
    confidence -= 24;
  }

  if (!area.name) {
    confidence -= 10;
  }

  if (area.isGenericFullWindowFallback) {
    confidence -= 28;
  }

  if (
    lowerName.includes("chrome legacy window") ||
    lowerName.includes("root") ||
    lowerName.includes("window")
  ) {
    confidence -= 18;
  }

  if (
    lowerName.includes("toolbar") ||
    lowerName.includes("tool bar") ||
    lowerName.includes("menu") ||
    lowerName.includes("tab") ||
    lowerName.includes("status")
  ) {
    confidence -= 26;
  }

  if (area.y < 100) {
    confidence -= 14;
  }

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

function detectReadingArea(elements, activeApp = currentApp, windowTitle = "") {
  if (!Array.isArray(elements) || elements.length === 0) {
    primaryReadingAreaReason = "UI Automation returned no useful elements";
    return null;
  }

  const readingScores = {
    Document: 100,
    Edit: 95,
    Text: 80,
    Pane: 45,
    Group: 45,
    Custom: 45
  };
  const readingCandidateTypes = ["Document", "Edit", "Text", "Pane", "Group", "Custom"];
  const blockedTypes = ["Button", "MenuItem", "TabItem", "ScrollBar"];
  const browserApps = ["chrome.exe", "msedge.exe", "firefox.exe"];
  const normalizedApp = String(activeApp || "").toLowerCase();
  const normalizedTitle = String(windowTitle || "").toLowerCase();
  const isBrowserApp = browserApps.includes(normalizedApp);
  const isVSCode = normalizedApp === "code.exe";
  const isGoogleDocs = isBrowserApp && (
    normalizedTitle.includes("google docs") ||
    normalizedTitle.includes("docs.google") ||
    normalizedTitle.includes("document")
  );
  const isDiscord = normalizedApp === "discord.exe";
  const hasSpecificReadingCandidate = elements.some((element) => (
    ["Document", "Edit", "Text"].includes(element.controlType) &&
    element.width > 300 &&
    element.height > 140
  ));
  const focusedEditableCandidate = elements.find((element) => (
    element.hasKeyboardFocus &&
    ["Document", "Edit", "Text", "Custom", "Group"].includes(element.controlType) &&
    element.width > 260 &&
    element.height > 120
  ));

  const readingCandidates = elements.filter((element) => (
    readingCandidateTypes.includes(element.controlType) &&
    element.width > 400 &&
    element.height > 250
  ));

  if (readingCandidates.length === 0) {
    primaryReadingAreaReason = "no Document/Edit/Text/Pane/Group/Custom candidate";
  }

  const candidates = elements
    .map((element) => {
      const type = element.controlType;
      let score = readingScores[type] || 0;
      const name = element.name.trim();
      const lowerName = name.toLowerCase();
      const area = element.width * element.height;
      const isLargeCandidate = element.width > 400 && element.height > 250 && area > 100000;
      const isCentralEnough = element.y >= 110 || element.height >= 420;
      const screenWidth = window.screen?.width || window.innerWidth || 0;
      const screenHeight = window.screen?.height || window.innerHeight || 0;
      const isVeryLargeRootLike = (
        screenWidth > 0 &&
        screenHeight > 0 &&
        element.width >= screenWidth * 0.92 &&
        element.height >= screenHeight * 0.82
      );
      const coversNearlyWholeScreen = (
        screenWidth > 0 &&
        screenHeight > 0 &&
        element.width >= screenWidth * 0.95 &&
        element.height >= screenHeight * 0.95
      );
      const isGenericFullWindowFallback = (
        ["Pane", "Group", "Custom"].includes(type) &&
        coversNearlyWholeScreen &&
        (
          !name ||
          lowerName === "chrome legacy window" ||
          lowerName.includes("chrome legacy window")
        )
      );

      score += Math.min(30, Math.floor(element.width / 80));
      score += Math.min(30, Math.floor(element.height / 60));

      if (area > 200000) {
        score += 30;
      } else if (area > 80000) {
        score += 18;
      } else if (area > 30000) {
        score += 10;
      }

      if (element.hasKeyboardFocus) {
        score += 40;
      }

      if (element.isKeyboardFocusable) {
        score += 15;
      }

      if (
        lowerName.includes("document") ||
        lowerName.includes("editor") ||
        lowerName.includes("text") ||
        lowerName.includes("content")
      ) {
        score += 20;
      }

      if (isBrowserApp && isLargeCandidate && isCentralEnough) {
        score += 25;
      }

      if (isGoogleDocs && isLargeCandidate && element.y > 120) {
        score += 35;
      }

      if (focusedEditableCandidate && element === focusedEditableCandidate) {
        score += 45;
      }

      if (isGoogleDocs && focusedEditableCandidate && element === focusedEditableCandidate) {
        score += 35;
      }

      if (isVSCode && ["Document", "Edit", "Text"].includes(type) && isLargeCandidate) {
        score += 30;
      }

      if (isVSCode && element.x > 180 && element.y > 70 && isLargeCandidate) {
        score += 18;
      }

      if (element.height < 120) {
        score -= 40;
      }

      if (element.y < 80 && element.height < 160) {
        score -= 45;
      }

      if ((isBrowserApp || isVSCode) && element.y < 110) {
        score -= 40;
      }

      if (isGoogleDocs && element.y < 140) {
        score -= 55;
      }

      if (isVSCode && element.x < 160 && element.width < 420) {
        score -= 45;
      }

      if (isVSCode && lowerName.includes("minimap")) {
        score -= 90;
      }

      if (blockedTypes.includes(type)) {
        score -= 90;
      }

      if (["ComboBox", "Hyperlink"].includes(type)) {
        score -= 45;
      }

      if (
        lowerName.includes("toolbar") ||
        lowerName.includes("tool bar") ||
        lowerName.includes("menu") ||
        lowerName.includes("tab") ||
        lowerName.includes("title bar") ||
        lowerName.includes("address")
      ) {
        score -= 60;
      }

      if (lowerName.includes("status") || lowerName.includes("statusbar") || lowerName.includes("status bar")) {
        score -= 60;
      }

      if (element.width < 200) {
        score -= 35;
      }

      if (element.width < 120 || element.height < 80) {
        score -= 30;
      }

      if (hasSpecificReadingCandidate && isVeryLargeRootLike && ["Pane", "Group", "Custom"].includes(type)) {
        score -= 70;
      }

      if ((isDiscord || isBrowserApp) && isGenericFullWindowFallback && hasSpecificReadingCandidate) {
        score -= 140;
      } else if ((isDiscord || isBrowserApp) && isGenericFullWindowFallback) {
        score -= 85;
      }

      if (isGoogleDocs && isVeryLargeRootLike && hasSpecificReadingCandidate) {
        score -= 80;
      }

      return {
        type,
        name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        hasKeyboardFocus: element.hasKeyboardFocus,
        isKeyboardFocusable: element.isKeyboardFocusable,
        score,
        isGenericFullWindowFallback
      };
    })
    .map((area) => ({
      ...area,
      discardReason: getReadingAreaDiscardReason(area, {
        readingCandidateTypes,
        blockedTypes,
        isGenericFullWindowFallback: area.isGenericFullWindowFallback
      })
    }));

  candidates.forEach((candidate, index) => {
    console.log(`Reading area candidate ${index + 1}:`, candidate);
  });

  const keptCandidates = candidates
    .filter((area) => area.discardReason === "candidate-kept")
    .sort((first, second) => second.score - first.score);

  if (!keptCandidates[0]) {
    primaryReadingAreaReason = readingCandidates.length > 0
      ? "candidates scored too low"
      : "no Document/Edit/Text/Pane/Group/Custom candidate";
    return null;
  }

  primaryReadingAreaReason = "primary reading area selected";
  const selectedArea = {
    ...keptCandidates[0],
    confidence: calculateReadingAreaConfidence(keptCandidates[0])
  };
  console.log(`Selected reading area confidence: ${selectedArea.confidence}`);
  return selectedArea;
}

function hasReadingArea() {
  return detectionMode === "dynamic" && Boolean(primaryReadingArea);
}

function logDetectionSummary() {
  console.log("AURA Detection Summary");
  console.log(`Detected elements: ${lastElementCount}`);
  console.log(`Important elements: ${lastImportantElementCount}`);

  if (hasReadingArea()) {
    const readingName = primaryReadingArea.name || "Unnamed";
    console.log("Primary reading area:");
    console.log(`${primaryReadingArea.type} - ${readingName} - ${primaryReadingArea.score}`);
  } else {
    console.log("Primary reading area:");
    console.log("None");
  }

  console.log("Top elements:");

  if (topImportantElements.length === 0) {
    console.log("None");
    return;
  }

  topImportantElements.forEach((element, index) => {
    const readableName = element.name.trim() || element.automationId.trim() || "Unnamed";
    console.log(`${index + 1}. ${element.controlType} - ${readableName} - ${element.score}`);
  });
}

function getReadableElementName(element) {
  return element.name.trim() || element.automationId.trim() || "Unnamed";
}

function getDetectionReason(element) {
  const name = String(element.name || "").toLowerCase();
  const isToolbarLike = name.includes("toolbar") || name.includes("tool bar");

  if (element.width < 30 || element.height < 20) {
    return "ignored-small";
  }

  if (isToolbarLike) {
    return "ignored-toolbar";
  }

  if (element.hasKeyboardFocus) {
    return "focused-control";
  }

  if (["Document", "Edit"].includes(element.controlType)) {
    return "primary-reading-candidate";
  }

  if (element.controlType === "Button") {
    return "useful-button";
  }

  if (element.controlType === "Text") {
    return "text-content";
  }

  if (element.controlType === "Pane" || element.controlType === "Window") {
    return "low-priority-pane";
  }

  return "primary-reading-candidate";
}

function logTopElementTable() {
  const tableRows = importantElements.slice(0, 10).map((element, index) => ({
    rank: index + 1,
    controlType: element.controlType,
    name: getReadableElementName(element),
    score: element.score,
    width: element.width,
    height: element.height,
    focusable: element.isKeyboardFocusable,
    focused: element.hasKeyboardFocus,
    reason: getDetectionReason(element)
  }));

  console.table(tableRows);
}

function logDetectionValidation({ activeApp, windowTitle }) {
  console.group("AURA Detection Validation");
  console.log(`Active app: ${activeApp || "Unknown.exe"}`);
  console.log(`Window title: ${windowTitle || "Unknown window"}`);
  console.log(`Detected elements: ${lastElementCount}`);
  console.log(`Important elements: ${lastImportantElementCount}`);

  if (primaryReadingArea) {
    console.log("Primary reading area:");
    console.log(`- type: ${primaryReadingArea.type}`);
    console.log(`- name: ${primaryReadingArea.name || "Unnamed"}`);
    console.log(`- x: ${primaryReadingArea.x}`);
    console.log(`- y: ${primaryReadingArea.y}`);
    console.log(`- width: ${primaryReadingArea.width}`);
    console.log(`- height: ${primaryReadingArea.height}`);
    console.log(`- score: ${primaryReadingArea.score}`);
    console.log(`- confidence: ${primaryReadingArea.confidence}`);
  } else {
    console.log("No primary reading area selected.");
    console.log("Reason:");
    console.log(`- ${primaryReadingAreaReason}`);
  }

  console.log("Top 10 important elements:");

  if (topImportantElements.length === 0) {
    console.log("None");
  } else {
    topImportantElements.forEach((element, index) => {
      console.log(
        `${index + 1}. ${element.controlType} - ${getReadableElementName(element)} - ` +
        `score: ${element.score} - ` +
        `x/y/width/height: ${element.x}/${element.y}/${element.width}/${element.height} - ` +
        `focusable: ${element.isKeyboardFocusable} - ` +
        `focused: ${element.hasKeyboardFocus}`
      );
    });
  }

  logTopElementTable();
  console.groupEnd();
}

function applyPreviewClasses() {
  document.documentElement.style.setProperty("--filter-intensity", String(filterIntensity / 100));
  document.body.classList.remove(...modeClasses);
  document.body.classList.remove(...workflowClasses);
  document.body.classList.add(
    workflowStep === 1
      ? "workflow-step-mode"
      : workflowStep === 2
        ? "workflow-step-profile"
        : "workflow-step-apply"
  );

  if (selectedMode) {
    document.body.classList.add(`mode-${selectedMode}`);
  }

  document.body.classList.remove(...colorVisionClasses);
  document.body.classList.remove(...eyeStrainClasses);
  document.body.classList.remove(...lowVisionClasses);

  if (profileSelected && selectedMode === "voyager" && selectedColorVisionProfile) {
    document.body.classList.add(`color-${selectedColorVisionProfile}`);
  } else if (profileSelected && selectedMode === "guardian" && selectedEyeStrainProfile) {
    document.body.classList.add(`eye-${selectedEyeStrainProfile}`);
  } else if (profileSelected && selectedMode === "beacon" && selectedLowVisionProfile) {
    document.body.classList.add(`low-${selectedLowVisionProfile}`);
  }

  document.body.classList.toggle("preview-active", previewActive);
  document.body.classList.toggle("screen-enforcement-active", screenEnforcementActive);
  document.body.classList.toggle("mode-details-expanded", modeDetailsExpanded);
  document.body.classList.toggle("profile-details-expanded", profileDetailsExpanded);
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
    card.classList.toggle("is-active", workflowStep > 1 && card.dataset.modeCard === selectedMode);
  });

  colorProfileCards.forEach((card) => {
    card.classList.toggle(
      "is-active",
      profileSelected && selectedMode === "voyager" && card.dataset.colorProfile === selectedColorVisionProfile
    );
  });

  eyeProfileCards.forEach((card) => {
    card.classList.toggle(
      "is-active",
      profileSelected && selectedMode === "guardian" && card.dataset.eyeProfile === selectedEyeStrainProfile
    );
  });

  lowProfileCards.forEach((card) => {
    card.classList.toggle(
      "is-active",
      profileSelected && selectedMode === "beacon" && card.dataset.lowProfile === selectedLowVisionProfile
    );
  });
}

function updateModeFitCard() {
  const options = modeFitOptions[selectedMode] || modeFitOptions.voyager;
  modeFitList.innerHTML = options.map((option) => `<li>${option}</li>`).join("");
}

function updateWorkflowPanels() {
  const isChoosingMode = workflowStep === 1;
  const isChoosingProfile = workflowStep === 2;
  const isApplyingSupport = workflowStep === 3;
  const isViewingModeDetails = !isChoosingMode && selectedMode && modeDetailsExpanded;
  const isViewingProfileDetails = isApplyingSupport && profileSelected && profileDetailsExpanded;

  modeChoiceContent.hidden = !(isChoosingMode || isViewingModeDetails);
  modeSummaryPanel.hidden = isChoosingMode || !selectedMode;
  profileSummaryPanel.hidden = !isApplyingSupport || !profileSelected;
  actionPanel.hidden = !isApplyingSupport;

  if (selectedMode) {
    modeSummaryText.textContent = modeLabels[selectedMode];
  }

  if (profileSelected) {
    profileSummaryText.textContent = getSelectedProfileName();
  }

  viewModeButton.textContent = modeDetailsExpanded ? "Hide details" : "View details";
  viewProfileButton.textContent = profileDetailsExpanded ? "Hide details" : "View details";

  document.querySelector("#colorVisionPanel").hidden = !(
    selectedMode === "voyager" && (isChoosingProfile || isViewingProfileDetails)
  );
  document.querySelector(".eye-strain-panel").hidden = !(
    selectedMode === "guardian" && (isChoosingProfile || isViewingProfileDetails)
  );
  document.querySelector(".low-vision-panel").hidden = !(
    selectedMode === "beacon" && (isChoosingProfile || isViewingProfileDetails)
  );
}

function updateStatusPanel() {
  previewButton.textContent = "Stop preview";
  previewButton.hidden = !previewActive || screenEnforcementActive;
  stopAllControl.hidden = !screenEnforcementActive;
  filterIntensityInput.value = String(filterIntensity);
  filterIntensityValue.textContent = getIntensityLabel(filterIntensity);
  detectionModeInputs.forEach((input) => {
    input.checked = input.value === detectionMode;
  });
  screenEnforcementButton.textContent = screenEnforcementActive
    ? "Stop screen enforcement"
    : "Activate accessibility support";
  screenEnforcementButton.classList.toggle("is-stop", screenEnforcementActive);
  screenEnforcementButton.hidden = false;
  detectionSummary.textContent = getDetectionSummaryText();
}

function getDetectionSummaryText() {
  if (!screenEnforcementActive) {
    return "Detection starts when support is activated.";
  }

  if (detectionMode === "general") {
    return "General support active.";
  }

  if (primaryReadingArea) {
    return "Reading area detected.";
  }

  return "General support active.";
}

function updateScannerPanelFromProfile(result, profile) {
  currentApp = result.activeApp || "Unknown.exe";
  activeProfile = profile;
  latestIssues = Array.isArray(profile.suggestions) ? profile.suggestions : [];
  latestReport = result;
}

function scheduleActivityRefresh(reason) {
  if (!screenEnforcementActive) {
    return;
  }

  if (activityRefreshTimeoutId) {
    window.clearTimeout(activityRefreshTimeoutId);
  }

  activityRefreshTimeoutId = window.setTimeout(() => {
    activityRefreshTimeoutId = null;
    runMonitoringCycle(reason);
  }, 450);
}

async function runLocalVisionVerification(scanId) {
  const baseLog = {
    localVisionEnabled: false,
    "analyze-local-layout called": false,
    "layoutAreas count": 0,
    "best visual layout area": null,
    "visual area usage": "ignored - local vision disabled"
  };

  if (!window.auraAPI || !window.auraAPI.analyzeLocalLayout) {
    console.log(`[Scan #${scanId}] Local vision disabled`, baseLog);
    return null;
  }

  try {
    const result = await window.auraAPI.analyzeLocalLayout();
    const layoutAreas = Array.isArray(result?.layoutAreas) ? result.layoutAreas : [];
    const bestVisualLayoutArea = layoutAreas[0] || null;
    const localVisionEnabled = Boolean(result?.enabled);
    console.log("LOG_APP_RECEIVED_LOCAL_VISION:", {
      layoutAreas,
      bestLocalVisionArea: bestVisualLayoutArea
    });

    if (!localVisionEnabled) {
      console.log(`[Scan #${scanId}] Local vision disabled`, {
        ...baseLog,
        "analyze-local-layout called": true
      });
      return result;
    }

    console.log(`[Scan #${scanId}] Local vision areas detected: ${layoutAreas.length}`, {
      localVisionEnabled,
      "analyze-local-layout called": true,
      "layoutAreas count": layoutAreas.length,
      "best visual layout area": bestVisualLayoutArea,
      "visual area usage": bestVisualLayoutArea
        ? "available for temporary comparison"
        : "ignored - no visual area found"
    });

    return result;
  } catch (error) {
    console.warn(`[Scan #${scanId}] Local vision verification failed`, {
      localVisionEnabled: "unknown",
      "analyze-local-layout called": true,
      "layoutAreas count": 0,
      "best visual layout area": null,
      "visual area usage": "ignored - diagnostic failed",
      error: error.message
    });
    return null;
  }
}

function formatAreaForComparison(area) {
  if (!area) {
    return {
      x: null,
      y: null,
      width: null,
      height: null,
      confidence: 0
    };
  }

  return {
    x: Number(area.x || 0),
    y: Number(area.y || 0),
    width: Number(area.width || 0),
    height: Number(area.height || 0),
    confidence: Number(area.confidence || 0)
  };
}

function normalizeLocalVisionReadingArea(localVisionResult) {
  const layoutAreas = Array.isArray(localVisionResult?.layoutAreas)
    ? localVisionResult.layoutAreas
    : [];
  const bestArea = layoutAreas[0];

  if (!localVisionResult?.enabled || !bestArea) {
    return null;
  }

  return {
    type: bestArea.type || "visual-content-area",
    name: "Local vision content area",
    x: Number(bestArea.x || 0),
    y: Number(bestArea.y || 0),
    width: Number(bestArea.width || 0),
    height: Number(bestArea.height || 0),
    score: Number(bestArea.confidence || 0),
    confidence: Number(bestArea.confidence || 0),
    source: "local-vision"
  };
}

function selectBestReadingArea(uiAutomationReadingArea, localVisionReadingArea) {
  const screenWidth = window.screen?.width || window.innerWidth || 0;
  const uiAutomationConfidence = Number(uiAutomationReadingArea?.confidence || 0);
  const localVisionConfidence = Number(localVisionReadingArea?.confidence || 0);
  const uiAutomationCoversWideScreen = Boolean(
    uiAutomationReadingArea &&
    screenWidth > 0 &&
    Number(uiAutomationReadingArea.width || 0) > screenWidth * 0.85
  );
  const isLocalVisionTextBlock = localVisionReadingArea && localVisionReadingArea.type === "visual-text-block";
  const localVisionHasGoodConfidence = localVisionConfidence >= READING_AREA_CONFIDENCE_THRESHOLD;

  let selectedSource = "none";
  let selectedArea = null;

  if (uiAutomationReadingArea) {
    selectedSource = "ui-automation";
    selectedArea = {
      ...uiAutomationReadingArea,
      source: "ui-automation"
    };
  }

  if (
    localVisionReadingArea &&
    (
      !uiAutomationReadingArea ||
      (isLocalVisionTextBlock && localVisionHasGoodConfidence) ||
      localVisionConfidence > uiAutomationConfidence ||
      uiAutomationCoversWideScreen
    )
  ) {
    selectedSource = "local-vision";
    selectedArea = localVisionReadingArea;
  }

  console.log("UI Automation area:", formatAreaForComparison(uiAutomationReadingArea));
  console.log("Local Vision area:", formatAreaForComparison(localVisionReadingArea));
  console.log("LOG_SELECTION_INPUT:", {
    uiAutomationArea: uiAutomationReadingArea,
    localVisionArea: localVisionReadingArea
  });
  console.log("Selected source:", selectedSource);
  console.log("LOG_SELECTED_PRIMARY_AREA:", selectedArea ? {
    type: selectedArea.type || null,
    source: selectedArea.source || selectedSource,
    x: selectedArea.x,
    y: selectedArea.y,
    width: selectedArea.width,
    height: selectedArea.height,
    confidence: selectedArea.confidence
  } : null);

  return {
    selectedArea,
    selectedSource
  };
}

async function runMonitoringCycle(triggerReason = "manual request") {
  const requestedScanId = scanSequenceId + 1;
  console.log(`[Scan #${requestedScanId}] requested`, {
    triggerReason,
    isScanning,
    lastDetectedApp: lastDetectedApp || "None",
    lastDetectedWindowTitle: lastDetectedWindowTitle || "None"
  });

  if (isScanning) {
    console.warn(`[Scan #${requestedScanId}] skipped because isScanning=true`, {
      activeScanSequenceId,
      triggerReason
    });
    return;
  }

  const scanId = ++scanSequenceId;
  activeScanSequenceId = scanId;
  isScanning = true;
  console.log(`[Scan #${scanId}] started`, { triggerReason });

  scanWatchdogId = window.setTimeout(() => {
    if (isScanning && activeScanSequenceId === scanId) {
      console.error(`[Scan #${scanId}] Scan watchdog released stuck scan`, {
        triggerReason,
        lastDetectedApp: lastDetectedApp || "None",
        lastDetectedWindowTitle: lastDetectedWindowTitle || "None"
      });
      isScanning = false;
      activeScanSequenceId = null;
      scanWatchdogId = null;
    }
  }, 10000);

  overlayScanStatus = "Scanning...";
  detectionStatus = primaryReadingArea ? "reading-area" : "general-support";
  latestEnforcementAreas = [];
  updateDiagnosticsState({
    type: "Active app + UI Automation scan",
    status: "Scanning",
    result: latestRawScanResult
  });

  try {
    if (!window.auraAPI || !window.auraAPI.scanActiveWindow || !window.auraAPI.scanUIAutomation) {
      throw new Error("Electron preload API unavailable. Start the app with Electron.");
    }

    // This monitoring cycle uses local Windows metadata only: active-window.ps1
    // for the foreground app and Windows UI Automation for accessible element
    // bounds. It does not capture, save, upload, or send screenshots to AI.
    const activeWindowResult = await window.auraAPI.scanActiveWindow();
    if (activeScanSequenceId !== scanId) {
      console.warn(`[Scan #${scanId}] completed after watchdog; ignoring late active-window result`);
      return;
    }

    console.log("AURA active-window scan result:", activeWindowResult);
    console.log(`[Scan #${scanId}] active window`, {
      activeApp: activeWindowResult.activeApp || "Unknown.exe",
      activeWindowTitle: activeWindowResult.windowTitle || "Unknown window",
      triggerReason
    });

    if (!screenEnforcementActive) {
      console.log(`[Scan #${scanId}] completed`, {
        reason: "screen enforcement stopped before UI Automation scan",
        triggerReason
      });
      return;
    }

    const activeApp = activeWindowResult.activeApp || "Unknown.exe";
    const activeWindowTitle = activeWindowResult.windowTitle || "Unknown window";
    const appChanged = activeApp !== lastDetectedApp;
    const titleChanged = activeWindowTitle !== lastDetectedWindowTitle;
    const activeWindowChanged = appChanged || titleChanged;
    const effectiveTriggerReason = activeWindowChanged
      ? appChanged && titleChanged
        ? "active app and window title changed"
        : appChanged
          ? "active app changed"
          : "active window title changed"
      : triggerReason;

    if (activeWindowChanged) {
      console.log("AURA active window changed:", {
        previousApp: lastDetectedApp || "None",
        previousWindowTitle: lastDetectedWindowTitle || "None",
        activeApp,
        activeWindowTitle,
        triggerReason: effectiveTriggerReason
      });
      currentApp = activeApp;
      primaryReadingArea = null;
      primaryReadingAreaReason = "active window changed; waiting for fresh UI Automation scan";
      detectionStatus = "general-support";
      overlayScanStatus = "Done";
      latestEnforcementAreas = [];
      sendExternalOverlayUpdate();
    }

    lastDetectedApp = activeApp;
    lastDetectedWindowTitle = activeWindowTitle;

    const uiAutomationResult = await window.auraAPI.scanUIAutomation();
    if (activeScanSequenceId !== scanId) {
      console.warn(`[Scan #${scanId}] completed after watchdog; ignoring late UI Automation result`);
      return;
    }

    console.log("AURA UI Automation scan result:", uiAutomationResult);
    const localVisionResult = await runLocalVisionVerification(scanId);

    if (!screenEnforcementActive) {
      console.log(`[Scan #${scanId}] completed`, {
        reason: "screen enforcement stopped after UI Automation scan",
        triggerReason: effectiveTriggerReason
      });
      return;
    }

    const detectedApp = activeWindowResult.activeApp || uiAutomationResult.activeApp || "Unknown.exe";
    const detectedWindowTitle = uiAutomationResult.windowTitle || activeWindowTitle;
    const rawElements = Array.isArray(uiAutomationResult.rawElements) ? uiAutomationResult.rawElements : [];
    if (String(detectedApp).toLowerCase() === "code.exe") {
      console.log("VS Code root element:", uiAutomationResult.rootElement || null);
      console.log("VS Code top 20 raw elements:");
      console.table(rawElements);
    }

    if (rawElements.length > 0) {
      console.log("UI Automation top raw elements discard reasons:");
      console.table(rawElements.map((element, index) => ({
        index: index + 1,
        controlType: element.controlType,
        name: element.name || "",
        className: element.className || "",
        width: element.width,
        height: element.height,
        x: element.x,
        y: element.y,
        discardReason: element.discardReason || "kept-for-filtering"
      })));
    }

    const profile = getProfileForApp(detectedApp);
    accessibilityElements = normalizeAccessibilityElements(uiAutomationResult.elements);
    importantElements = getImportantAccessibilityElements(accessibilityElements);
    lastElementCount = accessibilityElements.length;
    lastImportantElementCount = importantElements.length;
    topImportantElements = importantElements.slice(0, 10);
    const uiAutomationReadingArea = detectReadingArea(accessibilityElements, detectedApp, detectedWindowTitle);
    const localVisionReadingArea = normalizeLocalVisionReadingArea(localVisionResult);
    console.log("LOG_LOCAL_VISION_SELECTED_AREA:", localVisionReadingArea);
    console.log("LOG_UI_AUTOMATION_SELECTED_AREA:", uiAutomationReadingArea);
    console.log("LOG_PRIMARY_AREA_BEFORE_MERGE:", {
      currentPrimaryReadingArea: primaryReadingArea,
      uiAutomationReadingArea,
      localVisionReadingArea
    });
    const readingAreaSelection = selectBestReadingArea(uiAutomationReadingArea, localVisionReadingArea);
    primaryReadingArea = readingAreaSelection.selectedArea;
    console.log("LOG_PRIMARY_AREA_AFTER_MERGE:", {
      selectedSource: readingAreaSelection.selectedSource,
      selectedArea: readingAreaSelection.selectedArea,
      primaryReadingArea
    });
    primaryReadingAreaReason = primaryReadingArea
      ? `primary reading area selected from ${readingAreaSelection.selectedSource}`
      : primaryReadingAreaReason;

    const localVisionThresholdOverrideUsed = Boolean(
      primaryReadingArea &&
      primaryReadingArea.source === "local-vision" &&
      primaryReadingArea.type === "visual-text-cluster" &&
      primaryReadingArea.confidence >= LOCAL_VISION_TEXT_CLUSTER_CONFIDENCE_THRESHOLD &&
      primaryReadingArea.confidence < READING_AREA_CONFIDENCE_THRESHOLD
    );
    console.log("LOCAL_VISION_THRESHOLD_OVERRIDE_USED", localVisionThresholdOverrideUsed);

    if (
      primaryReadingArea &&
      primaryReadingArea.confidence < READING_AREA_CONFIDENCE_THRESHOLD &&
      !localVisionThresholdOverrideUsed
    ) {
      console.log(`Reading area rejected due to low confidence: ${primaryReadingArea.confidence}`);
      primaryReadingAreaReason = `confidence below threshold: ${primaryReadingArea.confidence}`;
      primaryReadingArea = null;
      detectionStatus = "general-support";
    }
    console.log("LOG_PRIMARY_AREA_AFTER_THRESHOLD:", primaryReadingArea);

    console.log("AURA reading-area refresh:", {
      activeApp: detectedApp,
      activeWindowTitle: detectedWindowTitle,
      elementCount: lastElementCount,
      importantElementCount: lastImportantElementCount,
      primaryReadingArea,
      score: primaryReadingArea?.score || 0,
      reason: primaryReadingArea ? "primary reading area selected" : primaryReadingAreaReason,
      hasReadingArea: hasReadingArea()
    });
    logDetectionSummary();
    logDetectionValidation({
      activeApp: detectedApp,
      windowTitle: detectedWindowTitle || "Unknown window"
    });

    // Step 3 stores detected accessibility elements internally only.
    // Overlay rectangles are not drawn from these elements yet.
    const areas = [];
    const uiAutomationLimited = Boolean(uiAutomationResult.error);
    const activeScanLimited = Boolean(activeWindowResult.error);
    if (activeScanLimited || uiAutomationLimited) {
      console.warn(`[Scan #${scanId}] scan failed or limited`, {
        activeWindowError: activeWindowResult.error || "",
        uiAutomationError: uiAutomationResult.error || "",
        triggerReason: effectiveTriggerReason
      });
    }
    const mergedIssues = Array.isArray(uiAutomationResult.detectedIssues)
      ? uiAutomationResult.detectedIssues
      : [];

    let scanStatus = "Done";

    if (uiAutomationLimited || activeScanLimited) {
      scanStatus = "Scan limited";
      detectionStatus = "general-support";
    } else if (primaryReadingArea) {
      scanStatus = "Reading area detected";
      detectionStatus = "reading-area";
    } else if (areas.length > 0) {
      scanStatus = "Areas detected";
      detectionStatus = "reading-area";
    } else if (lastElementCount > 0) {
      scanStatus = "Done";
      detectionStatus = "general-support";
    } else {
      scanStatus = "No areas detected";
      detectionStatus = "general-support";
    }

    const mergedResult = {
      ...activeWindowResult,
      ...uiAutomationResult,
      activeApp: detectedApp,
      windowTitle: uiAutomationLimited
        ? activeWindowTitle || uiAutomationResult.windowTitle || "Unknown window"
        : detectedWindowTitle || activeWindowTitle || "Unknown window",
      privacyMode: "local-first",
      screenshotSentToAI: false,
      uiAutomationUsed: true,
      detectedIssues: uiAutomationLimited
        ? ["UI areas unavailable for this app.", ...mergedIssues]
        : mergedIssues,
      enforcementAreas: areas,
      accessibilityElements,
      importantElements,
      primaryReadingArea,
      detectionStatus,
      elementCount: lastElementCount,
      importantElementCount: lastImportantElementCount,
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
    updateDiagnosticsState({
      type: "Active app + UI Automation scan",
      status: scanStatus,
      result: mergedResult,
      error: uiAutomationResult.error || activeWindowResult.error || ""
    });
    sendExternalOverlayUpdate();

    if (activeWindowChanged) {
      console.log(`AURA overlay refreshed for active window: ${detectedApp} - ${detectedWindowTitle}`);
    }

    console.log(`[Scan #${scanId}] completed`, {
      activeApp: detectedApp,
      activeWindowTitle: detectedWindowTitle,
      triggerReason: effectiveTriggerReason,
      scanStatus,
      elementCount: lastElementCount,
      importantElementCount: lastImportantElementCount,
      hasReadingArea: hasReadingArea()
    });

  } catch (error) {
    console.error(`[Scan #${scanId}] failed`, {
      error,
      triggerReason
    });
    console.error("AURA monitoring cycle failed:", error);
    overlayScanStatus = "Scan limited";
    detectionStatus = "general-support";
    latestEnforcementAreas = [];
    accessibilityElements = [];
    importantElements = [];
    lastElementCount = 0;
    lastImportantElementCount = 0;
    topImportantElements = [];
    primaryReadingArea = null;
    latestIssues = ["UI areas unavailable for this app."];
    updateDiagnosticsState({
      type: "Active app + UI Automation scan",
      status: "Scan limited",
      error: error.message
    });
    sendExternalOverlayUpdate();
  } finally {
    if (scanWatchdogId && activeScanSequenceId === scanId) {
      window.clearTimeout(scanWatchdogId);
      scanWatchdogId = null;
    }

    if (activeScanSequenceId === scanId) {
      isScanning = false;
      activeScanSequenceId = null;
    }

    console.log(`[Scan #${scanId}] lifecycle finished`, {
      isScanning,
      activeScanSequenceId,
      triggerReason
    });
    render();
  }
}

function startMonitoring() {
  if (monitorIntervalId) {
    return;
  }

  console.log("AURA monitoring started");
  const startInitialMonitoringCycle = () => runMonitoringCycle("screen enforcement started");

  if (window.auraAPI && window.auraAPI.showOverlay) {
    window.auraAPI.showOverlay();
    sendExternalOverlayUpdate();
  }

  if (
    ENABLE_LOCAL_VISION_DURING_ENFORCEMENT_TESTING &&
    !localVisionTestingEnabledThisSession &&
    window.auraAPI &&
    window.auraAPI.enableLocalVisionForTesting
  ) {
    window.auraAPI.enableLocalVisionForTesting()
      .then((result) => {
        localVisionTestingEnabledThisSession = Boolean(result?.enabled);
        console.log("Local vision testing enabled for enforcement verification:", {
          localVisionEnabled: localVisionTestingEnabledThisSession,
          persisted: Boolean(result?.persisted)
        });
        startInitialMonitoringCycle();
      })
      .catch((error) => {
        console.warn("Local vision testing could not be enabled:", error.message);
        startInitialMonitoringCycle();
      });
  } else {
    startInitialMonitoringCycle();
  }

  monitorIntervalId = setInterval(() => {
    if (screenEnforcementActive) {
      runMonitoringCycle("periodic refresh");
    }
  }, 2000);
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
  if (scanWatchdogId) {
    window.clearTimeout(scanWatchdogId);
    scanWatchdogId = null;
  }

  if (activityRefreshTimeoutId) {
    window.clearTimeout(activityRefreshTimeoutId);
    activityRefreshTimeoutId = null;
  }

  activeScanSequenceId = null;
  overlayScanStatus = "Waiting";
  detectionStatus = "general-support";
  latestEnforcementAreas = [];
  accessibilityElements = [];
  importantElements = [];
  lastElementCount = 0;
  lastImportantElementCount = 0;
  topImportantElements = [];
  primaryReadingArea = null;
  lastDetectedApp = null;
  lastDetectedWindowTitle = null;
}

function emergencyStop() {
  if (previewActive) {
    previewActive = false;
  }

  if (screenEnforcementActive || monitorIntervalId) {
    stopMonitoring();
  }

  applyProfileFilter(activeProfile);
  render();
}

function stopPreview() {
  previewActive = false;
  applyProfileFilter(activeProfile);
  render();
}

function toggleScreenEnforcement() {
  if (workflowStep !== 3 || !profileSelected) {
    return;
  }

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
  profileSelected = false;
  workflowStep = 2;
  modeDetailsExpanded = false;
  profileDetailsExpanded = false;
  previewActive = false;
  selectedColorVisionProfile = null;
  selectedEyeStrainProfile = null;
  selectedLowVisionProfile = null;
  savePreferences();
  applyProfileFilter(activeProfile);
  render();
  sendExternalOverlayUpdate();
}

function selectColorVisionProfile(profile) {
  selectedColorVisionProfile = profile;
  profileSelected = true;
  previewActive = true;
  workflowStep = 3;
  profileDetailsExpanded = false;
  savePreferences();
  applyProfileFilter(activeProfile);
  render();
  sendExternalOverlayUpdate();
}

function selectEyeStrainProfile(profile) {
  selectedEyeStrainProfile = profile;
  profileSelected = true;
  previewActive = true;
  workflowStep = 3;
  profileDetailsExpanded = false;
  savePreferences();
  applyProfileFilter(activeProfile);
  render();
  sendExternalOverlayUpdate();
}

function selectLowVisionProfile(profile) {
  selectedLowVisionProfile = profile;
  profileSelected = true;
  previewActive = true;
  workflowStep = 3;
  profileDetailsExpanded = false;
  savePreferences();
  applyProfileFilter(activeProfile);
  render();
  sendExternalOverlayUpdate();
}

function updateFilterIntensity(value) {
  filterIntensity = clampIntensity(value);

  if (workflowStep === 3 && profileSelected) {
    previewActive = true;
    applyProfileFilter(activeProfile);
  }

  savePreferences();
  render();
  sendExternalOverlayUpdate();
}

function updateDetectionMode(value) {
  if (!["dynamic", "general"].includes(value)) {
    return;
  }

  detectionMode = value;
  savePreferences();
  render();
  sendExternalOverlayUpdate(true);
}

function render() {
  mainView.hidden = currentView !== "main";
  aboutView.hidden = currentView !== "about";
  applyPreviewClasses();
  updateWorkflowPanels();
  updateModeCards();
  updateModeFitCard();
  updateStatusPanel();
}

function openAboutView() {
  currentView = "about";
  render();
}

function openMainView() {
  currentView = "main";
  render();
}

function changeMode() {
  emergencyStop();
  selectedMode = null;
  selectedColorVisionProfile = null;
  selectedEyeStrainProfile = null;
  selectedLowVisionProfile = null;
  profileSelected = false;
  modeDetailsExpanded = false;
  profileDetailsExpanded = false;
  workflowStep = 1;
  render();
}

function changeProfile() {
  emergencyStop();
  selectedColorVisionProfile = null;
  selectedEyeStrainProfile = null;
  selectedLowVisionProfile = null;
  profileSelected = false;
  profileDetailsExpanded = false;
  workflowStep = selectedMode ? 2 : 1;
  render();
}

function toggleModeDetails() {
  if (!selectedMode || workflowStep === 1) {
    return;
  }

  modeDetailsExpanded = !modeDetailsExpanded;
  render();
}

function toggleProfileDetails() {
  if (!profileSelected || workflowStep !== 3) {
    return;
  }

  profileDetailsExpanded = !profileDetailsExpanded;
  render();
}

modeCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (workflowStep !== 1) {
      return;
    }

    selectMode(card.dataset.modeCard);
  });
});

colorProfileCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (workflowStep !== 2) {
      return;
    }

    selectColorVisionProfile(card.dataset.colorProfile);
  });
});

eyeProfileCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (workflowStep !== 2) {
      return;
    }

    selectEyeStrainProfile(card.dataset.eyeProfile);
  });
});

lowProfileCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (workflowStep !== 2) {
      return;
    }

    selectLowVisionProfile(card.dataset.lowProfile);
  });
});

previewButton.addEventListener("click", stopPreview);
screenEnforcementButton.addEventListener("click", toggleScreenEnforcement);
aboutButton.addEventListener("click", openAboutView);
backToMainButton.addEventListener("click", openMainView);
viewModeButton.addEventListener("click", toggleModeDetails);
changeModeButton.addEventListener("click", changeMode);
viewProfileButton.addEventListener("click", toggleProfileDetails);
changeProfileButton.addEventListener("click", changeProfile);
filterIntensityInput.addEventListener("input", (event) => {
  updateFilterIntensity(event.target.value);
});

detectionModeInputs.forEach((input) => {
  input.addEventListener("change", (event) => {
    if (event.target.checked) {
      updateDetectionMode(event.target.value);
    }
  });
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

if (window.auraAPI && window.auraAPI.onInputActivity) {
  window.auraAPI.onInputActivity((payload) => {
    const reason = payload?.reason || "input activity";
    scheduleActivityRefresh(reason);
  });
}

async function runUIAutomationDiagnostic() {
  if (!window.auraAPI || !window.auraAPI.diagnoseUIAutomation) {
    console.error("AURA UI Automation diagnostic unavailable. Start the app with Electron.");
    return null;
  }

  console.group("AURA UI Automation Diagnostic");

  try {
    const result = await window.auraAPI.diagnoseUIAutomation();

    console.log("Active app:", result.activeApp);
    console.log("Active window title:", result.windowTitle);
    console.log("PowerShell script path used:", result.scriptPath);
    console.log("ui-automation-scan.ps1 exists:", result.scriptExists);
    console.log("PowerShell exit code:", result.exitCode);
    console.log("Raw stdout length:", result.rawStdoutLength);
    console.log("Raw stderr:", result.rawStderr || "(empty)");
    console.log("Parsed element count:", result.parsedElementCount);
    const caret = result.caret || result.parsed?.caret || { available: false };

    if (caret.available) {
      console.log("Current caret detected:");
      console.log("x:", caret.x);
      console.log("y:", caret.y);
      console.log("width:", caret.width);
      console.log("height:", caret.height);
      console.log("source control type:", caret.sourceControlType || "(unknown)");
      console.log("source name:", caret.sourceName || "(empty)");
    } else {
      console.log("Caret not available.");
    }

    if (result.powerShellError) {
      console.error("PowerShell failed. Exact command used:", result.command);
      console.error("PowerShell error:", result.powerShellError);
    }

    if (result.parseError) {
      console.error("JSON parsing failed:", result.parseError);
      console.log("First 1000 characters of raw stdout:", result.rawStdoutPreview || "(empty)");
    }

    console.log("First 10 parsed elements:");
    console.table(result.firstTenElements || []);
    console.log("Full diagnostic result:", result);

    return result;
  } catch (error) {
    console.error("AURA UI Automation diagnostic crashed:", error);
    return null;
  } finally {
    console.groupEnd();
  }
}

async function runLocalVisionDiagnostic() {
  if (!window.auraAPI || !window.auraAPI.analyzeLocalLayout) {
    console.error("AURA local vision diagnostic unavailable. Start the app with Electron.");
    return null;
  }

  console.group("AURA Local Vision Diagnostic");

  try {
    const result = await window.auraAPI.analyzeLocalLayout();
    const layoutAreas = Array.isArray(result?.layoutAreas) ? result.layoutAreas : [];

    if (!result?.enabled) {
      console.info("Local vision disabled");
    }

    console.log("enabled:", Boolean(result?.enabled));
    console.log("usedScreenshot:", Boolean(result?.usedScreenshot));
    console.log("savedScreenshot:", Boolean(result?.savedScreenshot));
    console.log("uploadedScreenshot:", Boolean(result?.uploadedScreenshot));
    console.log("width:", Number(result?.width || 0));
    console.log("height:", Number(result?.height || 0));
    console.log("layoutAreas count:", layoutAreas.length);

    if (layoutAreas.length > 0) {
      console.table(layoutAreas);
    } else {
      console.log("layoutAreas table:", []);
    }

    if (result?.error) {
      console.warn("Local vision error:", result.error);
    }

    return result;
  } catch (error) {
    console.error("AURA local vision diagnostic failed:", error);
    return null;
  } finally {
    console.groupEnd();
  }
}

async function enableLocalVisionForTesting() {
  if (!window.auraAPI || !window.auraAPI.enableLocalVisionForTesting) {
    console.error("AURA local vision testing helper unavailable. Start the app with Electron.");
    return null;
  }

  const result = await window.auraAPI.enableLocalVisionForTesting();
  console.info("Local vision enabled for this app session only. This setting is not saved.", result);
  return result;
}

window.auraDiagnostics = {
  runUIScan: runUIAutomationDiagnostic,
  runLocalVision: runLocalVisionDiagnostic,
  enableLocalVisionForTesting
};

console.info(
  "AURA diagnostics ready. Run window.auraDiagnostics.runUIScan() or window.auraDiagnostics.runLocalVision()."
);

loadPreferences();
render();
