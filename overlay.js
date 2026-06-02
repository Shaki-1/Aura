const overlayMode = document.querySelector("#overlayMode");
const overlayProfile = document.querySelector("#overlayProfile");

const overlayModeClasses = [
  "overlay-voyager",
  "overlay-guardian",
  "overlay-beacon"
];

const profileClasses = [
  "profile-readability",
  "profile-browser",
  "profile-chat",
  "profile-code",
  "profile-terminal",
  "profile-media",
  "profile-canvas",
  "profile-default"
];

const modeLabels = {
  voyager: "Voyager",
  guardian: "Guardian",
  beacon: "Beacon"
};

function applyOverlayState(state) {
  const mode = state?.mode || "voyager";
  const profileName = state?.profileName || "Default Accessibility Profile";
  const filterClass = state?.filterClass || "filter-default";

  document.body.classList.remove(...overlayModeClasses);
  document.body.classList.add(`overlay-${mode}`);
  document.body.classList.remove(...profileClasses);

  // Without screenshots or accessibility APIs, AURA does not know exact UI element
  // positions yet. These hints are profile-based guidance zones, not detected UI elements.
  document.body.classList.add(filterClass.replace("filter-", "profile-"));

  overlayMode.textContent = modeLabels[mode] || "Voyager";
  overlayProfile.textContent = profileName;
}

// TODO: Future improvement: replace profile-based zones with real UI element
// positions using Windows UI Automation API.

if (window.auraAPI && window.auraAPI.onOverlayUpdate) {
  window.auraAPI.onOverlayUpdate(applyOverlayState);
}
