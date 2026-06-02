const modeSelect = document.querySelector("#modeSelect");
const clarifyToggle = document.querySelector("#clarifyToggle");
const enforcerButton = document.querySelector("#enforcerButton");
const scannerMode = document.querySelector("#scannerMode");
const heroTitle = document.querySelector("#heroTitle");
const heroDescription = document.querySelector("#heroDescription");

const originalTitle = 'The Guardian of <span>Accessibility.</span>';
const clarifiedTitle = 'The Guardian for <span>everyone.</span>';
const originalDescription = "Intelligence that lives between your windows. Aura identifies, cleans, and fixes digital barriers in real-time, bringing inclusive experiences to every application on your machine.";
const clarifiedDescription = "Aura helps you use any app easily. It finds and fixes hard parts on your screen in real-time, keeping your data private.";

// selectedMode stores the active inspection color profile from the dropdown.
let selectedMode = "voyager";

// clarifyContent controls the simplified copy and whether inspection overlays are visible.
let clarifyContent = false;

// enforcerEnabled controls the simulated enforcement state and the scanner mode text.
let enforcerEnabled = false;

let enforcerHasBeenStopped = false;

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
  enforcerButton.textContent = enforcerEnabled ? "Stop Enforcement" : "Simulate Aura Enforcer";
  scannerMode.textContent = enforcerEnabled || !enforcerHasBeenStopped ? "ENFORCING" : "IDLE";
}

function updateOverlay() {
  document.body.classList.toggle("show-overlay", clarifyContent || enforcerEnabled);
  document.body.classList.toggle("enforcer-active", enforcerEnabled);
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
});

clarifyToggle.addEventListener("change", (event) => {
  clarifyContent = event.target.checked;
  render();
});

enforcerButton.addEventListener("click", () => {
  enforcerEnabled = !enforcerEnabled;
  if (!enforcerEnabled) {
    enforcerHasBeenStopped = true;
  }
  render();
});

render();
