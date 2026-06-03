# AURA

AURA is a privacy-first accessibility assistant prototype for Windows.

## Project Status

- AURA v1: visual reverse-engineered replica of the original dark futuristic demo.
- AURA v2: real local active app detection through PowerShell and Electron IPC.
- AURA v2.1: adaptive local accessibility profiles based on the detected app.
- AURA v2.2: continuous local monitoring while Enforcer is active.
- AURA v2.3: compact scanner/report UI that preserves the original AURA landing-page feeling.
- AURA v2.4: real local transparent overlay window for accessibility filters.
- AURA v3.0: automatic Windows UI Automation enforcement-area detection during active screen enforcement.
- Roadmap step 2: create a portable Windows `.exe`.
- Roadmap step 3: create the AURA download website.
- Future: deeper content-aware local guidance through Windows accessibility APIs.

## Privacy Rules

- Screenshots are not captured.
- Screenshots are not saved.
- Screenshots are not sent to AI.
- Active app detection and accessibility profiles run locally.
- Windows UI Automation scans read accessibility-tree metadata locally.
- The external overlay does not modify other apps.
- The external overlay places a transparent accessibility layer above the screen.
- AI, if added later, should only receive safe summaries.

## Local Monitoring

When Aura Enforcer is active, AURA runs `active-window.ps1` and `ui-automation-scan.ps1` through Electron IPC every 3 seconds. The app name is matched against local JavaScript accessibility profiles, and Windows UI Automation is used when available to detect real enforcement areas from the active window's accessibility tree. The scanner, profile, suggestions, visual filter, and overlay rectangles are updated locally.

## Local Accessibility Overlay

When Aura Enforcer is active, AURA shows a transparent, click-through Electron overlay above the screen. The overlay can help with color comfort, eye strain, and low vision by applying local visual filter layers:

- Voyager: color-blind support feel with blue/purple focus guidance.
- Guardian: warm dim comfort layer for eye strain.
- Beacon: stronger high-contrast yellow/orange guidance.

The overlay does not modify other apps. It does not capture, save, or send screenshots.

## Windows UI Automation Enforcement Areas

AURA v3.0 automatically runs `ui-automation-scan.ps1` during active screen enforcement. It uses Windows UI Automation to inspect accessible UI structure from the active foreground window when available.

The scan collects local metadata such as control names, control types, focusability, enabled state, automation IDs, and bounding rectangles. AURA uses local rules to flag possible accessibility concerns, including unnamed buttons, focusable controls without labels, tiny clickable areas, dense interfaces, and disabled important controls.

When UI Automation returns bounding rectangles, AURA sends those `enforcementAreas` to the transparent overlay and draws guidance rectangles only from that real local accessibility data. If no areas are available, AURA keeps the selected filter and edge frame active without drawing random boxes.

No screenshots are captured, saved, uploaded, or sent to AI.

## Portable Windows Build

Install dependencies, then run:

```bash
npm install
npm run dist
```

The build target is a portable Windows executable using `electron-builder`.

Output:

```text
release/AURA.exe
```

Depending on the electron-builder version, the portable file may also be named:

```text
release/AURA Portable.exe
```
