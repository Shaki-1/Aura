# AURA v2.1 Testing Log

## Test Goal
Verify that AURA detects the real active Windows application, selects the correct local accessibility profile, updates the scanner panel, and keeps privacy local-first.

## Privacy Rules
- No screenshots are captured.
- No screenshots are saved.
- No screenshots are sent to AI.
- Analysis is based on active app name and local profiles.

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
4. Click Simulate Aura Enforcer.
5. Check:
   - Scanning value
   - Fixes Applied count
   - Active Profile
   - Suggestions list
   - Privacy note
   - Visual filter

## Result Notes

### Test 1
App:
Detected:
Profile:
Fixes Applied:
Privacy:
Result:

### Test 2
App:
Detected:
Profile:
Fixes Applied:
Privacy:
Result:
