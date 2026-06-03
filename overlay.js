const overlayMode = document.querySelector("#overlayMode");
const overlayProfile = document.querySelector("#overlayProfile");
const overlayStatus = document.querySelector("#overlayStatus");
const overlayApp = document.querySelector("#overlayApp");
const overlayAppRow = document.querySelector("#overlayAppRow");
const enforcementAreaLayer = document.querySelector("#enforcementAreaLayer");
const readingAreaFrame = document.querySelector("#readingAreaFrame");

const overlayModeClasses = [
  "overlay-voyager",
  "overlay-guardian",
  "overlay-beacon"
];

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

const modeLabels = {
  voyager: "Color Blind",
  guardian: "Eye Strain",
  beacon: "Low Vision"
};

function getDetectionStatusLabel(detectionStatus) {
  const labels = {
    "analyzing": "General support active",
    "reading-area-detected": "Reading area detected",
    "general-support": "General support active",
    "detection-limited": "General support active"
  };

  return labels[detectionStatus] || "General support active";
}

function getFriendlyAppName(activeApp) {
  const name = String(activeApp || "").replace(/\.exe$/i, "");

  const knownNames = {
    chrome: "Chrome",
    firefox: "Firefox",
    msedge: "Edge",
    code: "Visual Studio Code",
    discord: "Discord",
    spotify: "Spotify",
    notepad: "Notepad",
    "notepad++": "Notepad++",
    windowsterminal: "Windows Terminal"
  };

  return knownNames[name.toLowerCase()] || name;
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

function renderEnforcementAreas(areas) {
  enforcementAreaLayer.innerHTML = "";

  // AURA only draws rectangles when Windows UI Automation returns real
  // bounding rectangles. No random or guessed screen target boxes are used.
  getSafeEnforcementAreas(areas).forEach((area) => {
    const marker = document.createElement("div");
    marker.className = `enforcement-area severity-${area.severity}`;
    marker.style.left = `${area.x}px`;
    marker.style.top = `${area.y}px`;
    marker.style.width = `${area.width}px`;
    marker.style.height = `${area.height}px`;

    const label = document.createElement("span");
    label.textContent = area.reason;
    marker.appendChild(label);
    enforcementAreaLayer.appendChild(marker);
  });
}

function getSafeReadingArea(area) {
  if (!area) {
    return null;
  }

  const safeArea = {
    x: Number(area.x),
    y: Number(area.y),
    width: Number(area.width),
    height: Number(area.height)
  };

  if (
    !Number.isFinite(safeArea.x) ||
    !Number.isFinite(safeArea.y) ||
    !Number.isFinite(safeArea.width) ||
    !Number.isFinite(safeArea.height) ||
    safeArea.width <= 0 ||
    safeArea.height <= 0
  ) {
    return null;
  }

  return safeArea;
}

function renderReadingAreaFrame(area) {
  const safeArea = getSafeReadingArea(area);

  if (!safeArea) {
    readingAreaFrame.hidden = true;
    return;
  }

  readingAreaFrame.hidden = false;
  readingAreaFrame.style.left = `${safeArea.x}px`;
  readingAreaFrame.style.top = `${safeArea.y}px`;
  readingAreaFrame.style.width = `${safeArea.width}px`;
  readingAreaFrame.style.height = `${safeArea.height}px`;
}

function applyOverlayState(state) {
  console.log("Overlay update received:", state);

  const mode = state?.mode || "voyager";
  const profileName = state?.profileName || "Default Accessibility Profile";
  const activeApp = state?.activeApp || "Waiting";
  const colorVisionProfile = state?.selectedColorVisionProfile || state?.colorVisionProfile || "contrast-boost";
  const eyeStrainProfile = state?.selectedEyeStrainProfile || state?.eyeStrainProfile || "warm-comfort";
  const lowVisionProfile = state?.selectedLowVisionProfile || state?.lowVisionProfile || "high-contrast";
  const filterIntensity = Number.isFinite(Number(state?.filterIntensity))
    ? Math.min(100, Math.max(0, Number(state.filterIntensity)))
    : 60;
  const screenEnforcementActive = state?.screenEnforcementActive === true;
  const detectionStatus = state?.detectionStatus || "general-support";
  const primaryReadingArea = state?.primaryReadingArea || null;
  const uiAutomationUsed = state?.uiAutomationUsed === true;
  const elementCount = Number.isFinite(Number(state?.elementCount)) ? Number(state.elementCount) : 0;
  const importantElementCount = Number.isFinite(Number(state?.importantElementCount))
    ? Number(state.importantElementCount)
    : 0;

  document.documentElement.style.setProperty("--filter-intensity", String(filterIntensity / 100));
  document.body.classList.toggle("screen-enforcement-active", screenEnforcementActive);
  document.body.classList.remove(...overlayModeClasses);
  document.body.classList.add(`overlay-${mode}`);
  document.body.classList.remove(...colorVisionClasses);
  document.body.classList.remove(...eyeStrainClasses);
  document.body.classList.remove(...lowVisionClasses);
  if (mode === "voyager") {
    document.body.classList.add(`color-${colorVisionProfile}`);
  } else if (mode === "guardian") {
    document.body.classList.add(`eye-${eyeStrainProfile}`);
  } else if (mode === "beacon") {
    document.body.classList.add(`low-${lowVisionProfile}`);
  }

  // Current AURA adapts dynamically based on selected profiles, active app scans,
  // and optional Windows UI Automation bounding rectangles. It does not inspect
  // screenshots or draw guessed external UI element positions.
  renderEnforcementAreas([]);
  renderReadingAreaFrame(primaryReadingArea);

  const friendlyApp = getFriendlyAppName(activeApp);

  console.log("Overlay detection state:", {
    detectionStatus,
    uiAutomationUsed,
    elementCount,
    importantElementCount
  });

  overlayStatus.textContent = getDetectionStatusLabel(detectionStatus);
  overlayMode.textContent = modeLabels[mode] || "Voyager";
  overlayProfile.textContent = profileName;
  overlayApp.textContent = friendlyApp;
  overlayAppRow.hidden = !friendlyApp || friendlyApp === "Waiting" || friendlyApp === "Unavailable";
}

// TODO: Use Windows UI Automation API to read real accessible UI elements.
// TODO: Use browser accessibility APIs for web pages where possible.
// TODO: Consider optional local-only temporary analysis later.
// TODO: Do not save or upload screenshots.

if (window.auraAPI && window.auraAPI.onOverlayUpdate) {
  window.auraAPI.onOverlayUpdate(applyOverlayState);
}
