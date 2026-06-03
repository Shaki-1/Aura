# AURA

AURA is a local-first Windows accessibility assistant prototype. It helps users choose visual accessibility support, preview it inside the app, and apply a transparent local overlay to the desktop.

## Overview

AURA is built as an Electron desktop app with HTML, CSS, JavaScript, and local PowerShell scripts. It focuses on privacy-first accessibility support for color blindness, eye strain, and low vision.

Version `0.3.0` is a teacher demo release focused on clear accessibility profiles, overlay support, local-first processing, and experimental reading-area detection.

## Features

- Guided accessibility profile selection.
- Live preview inside the AURA interface.
- Transparent click-through screen overlay.
- Support strength control.
- Emergency shortcut: `Ctrl + Alt + A`.
- Local active-window monitoring.
- Experimental reading-area detection using Windows UI Automation metadata.

## Accessibility Modes

### The Voyager

Color Blind support for color separation, contrast support, and reduced reliance on color-only cues.

### The Guardian

Eye Strain support for warmer tones, softer contrast, reduced glare, and long-session comfort.

### The Beacon

Low Vision support for stronger visibility, clearer focus, higher contrast, and screen guidance.

## Privacy

AURA is designed to be local-first.

- No screenshots are uploaded.
- No screenshots are saved.
- No cloud processing is required for current prototype features.
- Active app detection runs locally.
- Windows UI Automation metadata is processed locally.
- The overlay does not modify other applications.

## Architecture

AURA uses:

- Electron for the desktop shell and transparent overlay window.
- A renderer UI built with HTML, CSS, and JavaScript.
- `preload.js` for safe IPC access from the frontend.
- `main.js` for Electron windows, IPC handlers, and local PowerShell execution.
- `active-window.ps1` for local active-window detection.
- `ui-automation-scan.ps1` for experimental Windows UI Automation metadata scanning.

The overlay is transparent, always on top, and click-through so users can continue using their desktop normally.

## Installation

For development, install dependencies:

```bash
npm install
```

Start AURA:

```bash
npm start
```

## Building From Source

Build Windows distribution files:

```bash
npm run dist
```

Electron Builder is configured to generate:

- Portable executable
- NSIS installer

Output is written to:

```text
release/
```

## Roadmap

- Add a custom AURA application icon for Windows builds.
- Improve Windows UI Automation reading-area detection.
- Refine overlay behavior for more applications.
- Connect the placeholder download button to GitHub Releases when public builds are ready.
- Continue improving local-first accessibility guidance.

## Known Limitations

- Reading area detection is experimental.
- Some applications may not expose useful Windows UI Automation metadata.
- The overlay applies visual support layers; it does not modify external applications.
- AURA is a prototype and is not certified accessibility software.
- AURA is not medical software and does not diagnose vision or health conditions.
