# AURA Architecture Overview

AURA is a local-first Windows accessibility assistant designed to improve visual comfort, focus, contrast, and readability directly on the user's desktop.

## High-Level Flow

```text
User
 │
 ▼
AURA Desktop App
 │
 ├── Accessibility Profiles
 │   ├── Color Blind / Voyager
 │   ├── Eye Strain / Guardian
 │   └── Low Vision / Beacon
 │
 ├── Detection Mode
 │   ├── Dynamic Detection
 │   └── General Support
 │
 ├── Local Detection Engine
 │   ├── Windows UI Automation
 │   ├── Active Window Detection
 │   └── Local Vision Layout Analysis
 │
 ├── Enforcement Engine
 │   ├── Global visual support
 │   └── Targeted reading-area support
 │
 └── Overlay Renderer
     ├── Profile filters
     ├── Reading-area focus
     └── Status panel
```

## Core Components

### Desktop App

The main Electron application provides the user interface, profile selection, support strength controls, and detection mode controls.

### Accessibility Profiles

AURA includes three accessibility profiles:

* **Color Blind / Voyager** – improves contrast separation and reduces reliance on color alone.
* **Eye Strain / Guardian** – applies softer, warmer visual comfort support for longer sessions.
* **Low Vision / Beacon** – increases reading-area visibility and focus.

### Detection Modes

AURA supports two detection modes:

* **Dynamic Detection** – attempts to detect the active reading area using local signals.
* **General Support** – applies the selected accessibility profile globally without targeted reading-area detection.

### Local Detection Engine

AURA uses local-only detection methods:

* Active window detection
* Windows UI Automation
* Local screenshot-based layout analysis in memory

Screenshots are not uploaded or stored.

### Enforcement Engine

The enforcement engine decides how the selected profile should affect the screen.

If a reading area is detected, AURA can apply targeted support around that region.

If no reliable reading area is found, AURA falls back to general profile support.

### Overlay Renderer

The overlay renderer displays the visual accessibility support on top of the active desktop.

It handles:

* Profile-specific filters
* Reading-area spotlight or focus effects
* General support mode
* Status display

## Privacy Model

AURA is designed around a local-first privacy model.

* No screenshot uploads
* No screenshot storage
* No cloud processing required for visual enforcement
* Detection happens locally whenever possible
* Users can choose General Support if Dynamic Detection is not accurate enough

## Current Limitations

AURA v0.4.0 is an experimental accessibility assistant currently under active development.

Known limitations:

* Reading-area detection can vary between applications
* Google Docs detection still needs refinement
* Complex layouts may require General Support mode
* Windows UI Automation availability depends on the active application

## Release Status

Current version: **AURA v0.4.0**

This version includes:

* Dynamic and General detection modes
* Improved local vision support
* Accessibility profile enforcement
* Updated website and documentation
* Windows installer and portable executable
