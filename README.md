![Version](https://img.shields.io/badge/version-0.4.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Privacy](https://img.shields.io/badge/privacy-local--first-green)
![Status](https://img.shields.io/badge/status-experimental-orange)

[![Latest Release](https://img.shields.io/github/v/release/Shaki-1/Aura)](https://github.com/Shaki-1/Aura/releases/latest)

# AURA

## Accessibility. Local-First. Windows.

AURA is a local-first Windows accessibility assistant designed to improve visual comfort, focus, readability, and accessibility directly on the user's desktop.

Built with Electron, HTML, CSS, JavaScript, and Windows-native integrations, AURA provides visual accessibility support without requiring cloud processing or screenshot uploads.

---

## Features

### Accessibility Profiles

#### Voyager — Color Blind Support

* Improved contrast separation
* Reduced reliance on color-only cues
* Enhanced readability support
* Visual distinction assistance

#### Guardian — Eye Strain Support

* Warmer visual comfort filters
* Reduced visual fatigue
* Softer screen guidance
* Long-session viewing support

#### Beacon — Low Vision Support

* Stronger visibility enhancements
* Reading-area focus support
* Increased visual clarity
* Improved screen guidance

---

## Detection Modes

### Dynamic Detection

AURA attempts to identify the active reading area using local detection technologies.

Supports:

* Windows UI Automation
* Active window detection
* Local visual layout analysis
* Reading-area targeting

### General Support

Applies accessibility support across the entire screen without reading-area targeting.

Useful when:

* Detection is inaccurate
* Applications expose limited metadata
* Users prefer global support

---

## Local-First Privacy

Privacy is a core design principle of AURA.

### AURA does not:

* Upload screenshots
* Store screenshots
* Send visual content to external services
* Require cloud processing for accessibility support

### AURA does:

* Process accessibility information locally
* Use Windows UI Automation metadata locally
* Perform local visual analysis in memory
* Keep users in control of accessibility support

---

## Architecture

AURA uses:

### Desktop Application

* Electron
* HTML
* CSS
* JavaScript

### Detection Components

* Active Window Detection
* Windows UI Automation
* Local Vision Layout Analysis

### Accessibility Enforcement

* Profile-specific visual support
* Reading-area enhancement
* General screen support
* Transparent click-through overlay

### Overlay System

The overlay is:

* Transparent
* Always on top
* Click-through
* Non-invasive

Users can continue interacting with their applications normally.

---

## Installation

### Development

Install dependencies:

```bash
npm install
```

Run AURA:

```bash
npm start
```

---

## Building

Generate Windows releases:

```bash
npm run dist
```

Build output:

```text
release/
```

Generated packages:

* Portable executable
* NSIS installer

---

## Current Version

**AURA v0.4.0**

Highlights:

* Dynamic and General support modes
* Improved local vision support
* Reading-area detection improvements
* Better accessibility profile enforcement
* Updated website and documentation
* Portable and installer releases

---

## Known Limitations

AURA is an experimental accessibility assistant currently under active development.

Current limitations include:

* Reading-area detection accuracy varies between applications
* Google Docs support still requires refinement
* Windows UI Automation availability depends on the application
* Complex layouts may fall back to General Support mode

---

## Disclaimer

AURA is not certified accessibility software.

AURA is not medical software and does not diagnose, treat, or prevent medical conditions.

Accessibility preferences and visual needs vary between users.

---

## License

See the repository license for usage and distribution terms.

---

© 2026 Aura Systems
