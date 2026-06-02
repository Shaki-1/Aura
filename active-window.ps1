Write-Host "Click the app you want AURA to scan. Waiting 5 seconds..."
Start-Sleep -Seconds 5

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

$handle = [Win32]::GetForegroundWindow()

$titleBuilder = New-Object System.Text.StringBuilder 256
[Win32]::GetWindowText($handle, $titleBuilder, $titleBuilder.Capacity) | Out-Null

$processId = 0
[Win32]::GetWindowThreadProcessId($handle, [ref]$processId) | Out-Null

$process = Get-Process -Id $processId

$issues = @()

if ($process.ProcessName -match "notepad") {
    $issues += "Text editing apps may need larger font size for low vision users."
    $issues += "High contrast mode can improve readability."
}

if ($process.ProcessName -match "chrome|msedge|firefox") {
    $issues += "Browser pages may contain small text, low contrast buttons, or crowded layouts."
    $issues += "Zoom level and reader mode can improve accessibility."
}

if ($process.ProcessName -match "discord|teams|slack") {
    $issues += "Chat apps often contain dense text, small icons, and fast-moving content."
    $issues += "Increasing UI scale and reducing motion may improve comfort."
}

if ($issues.Count -eq 0) {
    $issues += "No app-specific rule found yet. General accessibility checks recommended: contrast, font size, spacing, and motion."
}

$result = @{
    activeApp = "$($process.ProcessName).exe"
    windowTitle = $titleBuilder.ToString()
    privacyMode = "local-first"
    screenshotSentToAI = $false
    detectedIssues = $issues
    aiSafeSummary = "AURA detected the active app locally and generated accessibility suggestions without sending screenshots."
}

$result | ConvertTo-Json -Depth 4