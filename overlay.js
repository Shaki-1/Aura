const overlayMode = document.querySelector("#overlayMode");
const overlayProfile = document.querySelector("#overlayProfile");
const overlayStatus = document.querySelector("#overlayStatus");
const overlayApp = document.querySelector("#overlayApp");
const overlayAppRow = document.querySelector("#overlayAppRow");
const enforcementAreaLayer = document.querySelector("#enforcementAreaLayer");
const readingAreaFocus = document.querySelector("#readingAreaFocus");
const readingAreaSpotlight = document.querySelector("#readingAreaSpotlight");
const readingAreaFeather = document.querySelector("#readingAreaFeather");
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

function getDetectionStatusLabel(detectionStatus, mode, hasReadingArea) {
  if (hasReadingArea) {
    const targetedLabels = {
      voyager: "Color support active",
      guardian: "Eye comfort active",
      beacon: "Reading support active"
    };

    return targetedLabels[mode] || "Reading support active";
  }

  const labels = {
    "analyzing": "General support active",
    "reading-area": "Reading area detected",
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

  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;
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

  safeArea.x = Math.max(0, safeArea.x);
  safeArea.y = Math.max(0, safeArea.y);

  if (viewportWidth > 0) {
    safeArea.width = Math.min(safeArea.width, Math.max(0, viewportWidth - safeArea.x));
  }

  if (viewportHeight > 0) {
    safeArea.height = Math.min(safeArea.height, Math.max(0, viewportHeight - safeArea.y));
  }

  if (safeArea.width <= 0 || safeArea.height <= 0) {
    return null;
  }

  return safeArea;
}

function renderReadingAreaFrame(area, mode, detectionStatus) {
  const safeArea = getSafeReadingArea(area);
  console.log("Overlay readingAreaFrame exists:", Boolean(readingAreaFrame));
  console.log("Overlay readingAreaFocus exists:", Boolean(readingAreaFocus));
  console.log("Overlay readingAreaSpotlight exists:", Boolean(readingAreaSpotlight));
  console.log("Overlay readingAreaFeather exists:", Boolean(readingAreaFeather));
  console.log("Overlay safe primaryReadingArea:", safeArea);
  const spotlightActive = detectionStatus === "reading-area" && Boolean(safeArea);

  if (!safeArea) {
    readingAreaFrame.hidden = true;
    readingAreaFocus.hidden = true;
    readingAreaSpotlight.hidden = true;
    readingAreaFeather.hidden = true;
    console.log("Overlay readingAreaFrame hidden: true");
    return;
  }

  readingAreaFocus.hidden = false;
  readingAreaFocus.style.setProperty("--focus-x", `${safeArea.x}px`);
  readingAreaFocus.style.setProperty("--focus-y", `${safeArea.y}px`);
  readingAreaFocus.style.setProperty("--focus-width", `${safeArea.width}px`);
  readingAreaFocus.style.setProperty("--focus-height", `${safeArea.height}px`);

  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;
  const rightEdge = safeArea.x + safeArea.width;
  const bottomEdge = safeArea.y + safeArea.height;

  if (spotlightActive) {
    const spotlightPanels = {
      top: readingAreaSpotlight.querySelector(".spotlight-top"),
      bottom: readingAreaSpotlight.querySelector(".spotlight-bottom"),
      left: readingAreaSpotlight.querySelector(".spotlight-left"),
      right: readingAreaSpotlight.querySelector(".spotlight-right")
    };

    readingAreaSpotlight.hidden = false;
    spotlightPanels.top.style.left = "0px";
    spotlightPanels.top.style.top = "0px";
    spotlightPanels.top.style.width = `${viewportWidth}px`;
    spotlightPanels.top.style.height = `${safeArea.y}px`;

    spotlightPanels.bottom.style.left = "0px";
    spotlightPanels.bottom.style.top = `${bottomEdge}px`;
    spotlightPanels.bottom.style.width = `${viewportWidth}px`;
    spotlightPanels.bottom.style.height = `${Math.max(0, viewportHeight - bottomEdge)}px`;

    spotlightPanels.left.style.left = "0px";
    spotlightPanels.left.style.top = `${safeArea.y}px`;
    spotlightPanels.left.style.width = `${safeArea.x}px`;
    spotlightPanels.left.style.height = `${safeArea.height}px`;

    spotlightPanels.right.style.left = `${rightEdge}px`;
    spotlightPanels.right.style.top = `${safeArea.y}px`;
    spotlightPanels.right.style.width = `${Math.max(0, viewportWidth - rightEdge)}px`;
    spotlightPanels.right.style.height = `${safeArea.height}px`;

    readingAreaFeather.hidden = false;
    readingAreaFeather.style.setProperty("--feather-x", `${safeArea.x}px`);
    readingAreaFeather.style.setProperty("--feather-y", `${safeArea.y}px`);
    readingAreaFeather.style.setProperty("--feather-width", `${safeArea.width}px`);
    readingAreaFeather.style.setProperty("--feather-height", `${safeArea.height}px`);
    console.log("Spotlight active");
    console.log("Spotlight area width/height:", {
      width: safeArea.width,
      height: safeArea.height
    });
  } else {
    readingAreaSpotlight.hidden = true;
    readingAreaFeather.hidden = true;
  }

  readingAreaFrame.hidden = false;
  readingAreaFrame.style.left = `${safeArea.x}px`;
  readingAreaFrame.style.top = `${safeArea.y}px`;
  readingAreaFrame.style.width = `${safeArea.width}px`;
  readingAreaFrame.style.height = `${safeArea.height}px`;
  console.log("Overlay readingAreaFrame CSS applied:", {
    left: readingAreaFrame.style.left,
    top: readingAreaFrame.style.top,
    width: readingAreaFrame.style.width,
    height: readingAreaFrame.style.height,
    hidden: readingAreaFrame.hidden
  });
}

function applyOverlayState(state) {
  console.log("Overlay update received:", state);

  const mode = state?.mode || "voyager";
  const detectionMode = state?.detectionMode === "general" ? "general" : "dynamic";
  const profileName = state?.profileName || "Default Accessibility Profile";
  const activeApp = state?.activeApp || "Waiting";
  const colorVisionProfile = state?.selectedColorVisionProfile || state?.colorVisionProfile || "contrast-boost";
  const eyeStrainProfile = state?.selectedEyeStrainProfile || state?.eyeStrainProfile || "warm-comfort";
  const lowVisionProfile = state?.selectedLowVisionProfile || state?.lowVisionProfile || "high-contrast";
  const filterIntensity = Number.isFinite(Number(state?.filterIntensity))
    ? Math.min(100, Math.max(0, Number(state.filterIntensity)))
    : 60;
  const screenEnforcementActive = state?.screenEnforcementActive === true;
  const detectionStatus = detectionMode === "general"
    ? "general-support"
    : state?.detectionStatus || "general-support";
  const primaryReadingArea = detectionMode === "general"
    ? null
    : state?.primaryReadingArea || null;
  const uiAutomationUsed = state?.uiAutomationUsed === true;
  const elementCount = Number.isFinite(Number(state?.elementCount)) ? Number(state.elementCount) : 0;
  const importantElementCount = Number.isFinite(Number(state?.importantElementCount))
    ? Number(state.importantElementCount)
    : 0;

  document.documentElement.style.setProperty("--filter-intensity", String(filterIntensity / 100));
  document.body.classList.toggle("screen-enforcement-active", screenEnforcementActive);
  document.body.classList.toggle("has-reading-area", Boolean(getSafeReadingArea(primaryReadingArea)));
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
  console.log("Overlay received primaryReadingArea:", primaryReadingArea);
  console.log("LOG_OVERLAY_RECEIVED_PRIMARY_AREA:", primaryReadingArea ? {
    type: primaryReadingArea.type || null,
    source: primaryReadingArea.source || null,
    x: primaryReadingArea.x,
    y: primaryReadingArea.y,
    width: primaryReadingArea.width,
    height: primaryReadingArea.height
  } : null);
  if (primaryReadingArea) {
    console.log("Overlay received primaryReadingArea bounds:", {
      x: primaryReadingArea.x,
      y: primaryReadingArea.y,
      width: primaryReadingArea.width,
      height: primaryReadingArea.height
    });
  }
  renderReadingAreaFrame(primaryReadingArea, mode, detectionStatus);

  const friendlyApp = getFriendlyAppName(activeApp);

  console.log("Overlay detection state:", {
    detectionMode,
    detectionStatus,
    uiAutomationUsed,
    elementCount,
    importantElementCount
  });

  overlayStatus.textContent = getDetectionStatusLabel(detectionStatus, mode, Boolean(getSafeReadingArea(primaryReadingArea)));
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
