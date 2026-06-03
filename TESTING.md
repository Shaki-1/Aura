# AURA 0.3.0 Testing Log

## Test Goal
Verify that AURA detects the real active Windows application, selects the correct local accessibility profile, updates the overlay/status feedback, and keeps privacy local-first.

## Privacy Rules
- No screenshots are captured.
- No screenshots are saved.
- No screenshots are sent to AI.
- Analysis is based on active app name and local profiles.

## Testing UI Automation Scan

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\ui-automation-scan.ps1
```

Expected output is valid JSON containing:

- `activeApp`
- `windowTitle`
- `uiAutomationUsed: true`
- `elementCount`
- `elements` array

This uses Windows accessibility APIs. It does not take screenshots, save images, or upload anything.

## Detection Validation Checklist

Use this checklist while Screen Enforcement is active. Check the AURA overlay
status card and the developer console output from `AURA Detection Validation`.

### Apps To Test

1. Notepad / Notepad++
   Expected: Reading area detected around editor.

2. Google Docs in Chrome
   Expected: Reading area detected around document/editor region.

3. VS Code
   Expected: Reading area detected around code editor.

4. Chrome article page
   Expected: Reading area detected around main page content if available,
   otherwise General support active.

5. Spotify
   Expected: No reading area required; General support active is acceptable.

### Record For Each Test

| Test app | Active app | Element count | Important element count | Primary reading area found | Selected control type | Overlay status | Notes |
|---|---|---:|---:|---|---|---|---|
| Notepad / Notepad++ | | | | yes/no | | | |
| Google Docs in Chrome | | | | yes/no | | | |
| VS Code | | | | yes/no | | | |
| Chrome article page | | | | yes/no | | | |
| Spotify | | | | yes/no | | | |

## Test Cases

| App | Expected Profile | Expected Result | Pass/Fail |
|---|---|---|---|
| Notepad / Notepad++ | Text Readability Profile | Larger text and contrast suggestions | |
| Chrome / Edge | Browser Comfort Profile | Zoom, reader mode, focus visibility suggestions | |
| Windows Terminal | Terminal Readability Profile | Font size, contrast, transparency suggestions | |
| VS Code | Code Readability Profile | Editor font size, theme, line spacing suggestions | |
| Discord / Teams | Chat Comfort Profile | UI scale, motion reduction, important areas suggestions | |
| Unknown app | Default Profile | General accessibility suggestions | |

## Manual Test Steps

1. Open the target app.
2. Click inside the target app.
3. Open AURA.
4. Choose an accessibility mode and profile.
5. Click Activate accessibility support.
6. Check:
   - Selected mode and profile
   - Overlay status
   - Reading area detected or General support active
   - Privacy behavior
   - Visual filter

## Result Notes

### Test 1
App:
Detected:
Profile:
Overlay Status:
Privacy:
Result:

### Test 2
App:
Detected:
Profile:
Overlay Status:
Privacy:
Result:
