# AURA

AURA is a privacy-first accessibility assistant prototype for Windows.

## Project Status

- AURA v1: visual reverse-engineered replica of the original dark futuristic demo.
- AURA v2: real local active app detection through PowerShell and Electron IPC.
- AURA v2.1: adaptive local accessibility profiles based on the detected app.
- AURA v2.2: continuous local monitoring while Enforcer is active.
- AURA v2.3: compact scanner/report UI that preserves the original AURA landing-page feeling.
- AURA v2.4: real local transparent overlay window for accessibility filters.
- Next: deeper per-app overlay guidance without screenshots.

## Privacy Rules

- Screenshots are not captured.
- Screenshots are not saved.
- Screenshots are not sent to AI.
- Active app detection and accessibility profiles run locally.
- The external overlay does not modify other apps.
- The external overlay places a transparent accessibility layer above the screen.
- AI, if added later, should only receive safe summaries.

## Local Monitoring

When Aura Enforcer is active, AURA runs `active-window.ps1` through Electron IPC every 3 seconds. The app name is matched against local JavaScript accessibility profiles. The scanner, profile, suggestions, and visual filter are updated locally.

## Local Accessibility Overlay

When Aura Enforcer is active, AURA shows a transparent, click-through Electron overlay above the screen. The overlay can help with color comfort, eye strain, and low vision by applying local visual filter layers:

- Voyager: color-blind support feel with blue/purple focus guidance.
- Guardian: warm dim comfort layer for eye strain.
- Beacon: stronger high-contrast yellow/orange guidance.

The overlay does not inspect or modify other apps. It does not capture, save, or send screenshots.

## Portable Windows Build

Install dependencies, then run:

```bash
npm run dist
```

The build target is a portable Windows executable using `electron-builder`.
