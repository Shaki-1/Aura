const previewButton = document.querySelector("#previewButton");
const screenEnforcementButton = document.querySelector("#screenEnforcementButton");
const stopAllControl = document.querySelector("#stopAllControl");
const filterIntensityInput = document.querySelector("#filterIntensityInput");
const filterIntensityValue = document.querySelector("#filterIntensityValue");
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

// selectedMode stores the chosen enforcement type after Step 1 is complete.
let selectedMode = null;

// selectedColorVisionProfile stores the Voyager support profile. It is not a diagnosis.
let selectedColorVisionProfile = null;

let selectedEyeStrainProfile = null;
let selectedLowVisionProfile = null;
let filterIntensity = 60;
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
  filterIntensity: "aura.filterIntensity"
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
  return {
    mode: selectedMode || "voyager",
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
    detectionStatus,
    uiAutomationUsed: Boolean(latestReport?.uiAutomationUsed),
    elementCount: lastElementCount,
    importantElementCount: lastImportantElementCount,
    enforcementAreas: latestEnforcementAreas,
    primaryReadingArea
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

function detectReadingArea(elements, activeApp = currentApp) {
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
  const isBrowserApp = browserApps.includes(String(activeApp || "").toLowerCase());

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
      const isCentralEnough = element.y >= 80 || element.height >= 360;

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

      if (element.height < 120) {
        score -= 40;
      }

      if (element.y < 80 && element.height < 160) {
        score -= 45;
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
        lowerName.includes("tab")
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

      return {
        type,
        name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        score
      };
    })
    .filter((area) => (
      readingCandidateTypes.includes(area.type) &&
      area.width > 400 &&
      area.height > 250 &&
      area.score >= 100
    ))
    .sort((first, second) => second.score - first.score);

  if (!candidates[0]) {
    primaryReadingAreaReason = readingCandidates.length > 0
      ? "candidates scored too low"
      : "no Document/Edit/Text/Pane/Group/Custom candidate";
    return null;
  }

  primaryReadingAreaReason = "primary reading area selected";
  return candidates[0];
}

function hasReadingArea() {
  return Boolean(primaryReadingArea);
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

async function runMonitoringCycle() {
  if (isScanning) {
    return;
  }

  isScanning = true;
  overlayScanStatus = "Scanning...";
  detectionStatus = primaryReadingArea ? "reading-area-detected" : "general-support";
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
      return;
    }

    const activeApp = activeWindowResult.activeApp || uiAutomationResult.activeApp || "Unknown.exe";
    const appChanged = activeApp !== lastDetectedApp;
    lastDetectedApp = activeApp;
    const profile = getProfileForApp(activeApp);
    accessibilityElements = normalizeAccessibilityElements(uiAutomationResult.elements);
    importantElements = getImportantAccessibilityElements(accessibilityElements);
    lastElementCount = accessibilityElements.length;
    lastImportantElementCount = importantElements.length;
    topImportantElements = importantElements.slice(0, 10);
    primaryReadingArea = detectReadingArea(accessibilityElements, activeApp);
    logDetectionSummary();
    logDetectionValidation({
      activeApp,
      windowTitle: uiAutomationResult.windowTitle || activeWindowResult.windowTitle || "Unknown window"
    });

    // Step 3 stores detected accessibility elements internally only.
    // Overlay rectangles are not drawn from these elements yet.
    const areas = [];
    const uiAutomationLimited = Boolean(uiAutomationResult.error);
    const activeScanLimited = Boolean(activeWindowResult.error);
    const mergedIssues = Array.isArray(uiAutomationResult.detectedIssues)
      ? uiAutomationResult.detectedIssues
      : [];

    let scanStatus = "Done";

    if (uiAutomationLimited || activeScanLimited) {
      scanStatus = "Scan limited";
      detectionStatus = "general-support";
    } else if (primaryReadingArea) {
      scanStatus = "Reading area detected";
      detectionStatus = "reading-area-detected";
    } else if (areas.length > 0) {
      scanStatus = "Areas detected";
      detectionStatus = "reading-area-detected";
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

    if (appChanged) {
      console.log(`AURA active app changed: ${activeApp}`);
    }

  } catch (error) {
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
    isScanning = false;
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
  detectionStatus = "general-support";
  latestEnforcementAreas = [];
  accessibilityElements = [];
  importantElements = [];
  lastElementCount = 0;
  lastImportantElementCount = 0;
  topImportantElements = [];
  primaryReadingArea = null;
  lastDetectedApp = null;
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
render();
