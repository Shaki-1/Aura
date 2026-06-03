Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class AuraNative {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

function New-SafeResult {
  param(
    [string]$Message,
    [string]$ActiveApp = "Unavailable",
    [string]$WindowTitle = "Unavailable"
  )

  if ([string]::IsNullOrWhiteSpace($ActiveApp)) {
    $ActiveApp = "Unavailable"
  }

  if ([string]::IsNullOrWhiteSpace($WindowTitle)) {
    $WindowTitle = "Unavailable"
  }

  return [ordered]@{
    activeApp = $ActiveApp
    windowTitle = $WindowTitle
    privacyMode = "local-first"
    screenshotSentToAI = $false
    uiAutomationUsed = $true
    elementCount = 0
    elements = @()
    detectedIssues = @("AURA UI Automation scan failed locally: $Message")
    aiSafeSummary = "AURA attempted a local Windows UI Automation scan. No screenshots were captured, saved, uploaded, or sent to AI."
    error = $Message
  }
}

function Get-ControlTypeName {
  param($Element)

  try {
    return ($Element.Current.ControlType.ProgrammaticName -replace "^ControlType\.", "")
  } catch {
    return "Unknown"
  }
}

function Get-CleanRectangle {
  param($Rectangle)

  if ($null -eq $Rectangle -or $Rectangle.IsEmpty) {
    return $null
  }

  $x = [math]::Round($Rectangle.X, 0)
  $y = [math]::Round($Rectangle.Y, 0)
  $width = [math]::Round($Rectangle.Width, 0)
  $height = [math]::Round($Rectangle.Height, 0)

  if ($width -le 0 -or $height -le 0) {
    return $null
  }

  # Windows UI Automation can expose placeholder rectangles far off-screen.
  # These are metadata artifacts, not useful local UI areas.
  if ($x -le -30000 -or $y -le -30000) {
    return $null
  }

  if ($x -ge 30000 -or $y -ge 30000) {
    return $null
  }

  return [ordered]@{
    x = $x
    y = $y
    width = $width
    height = $height
  }
}

function Test-IsInteractiveControl {
  param(
    [string]$ControlType,
    [bool]$IsKeyboardFocusable
  )

  if ($IsKeyboardFocusable) {
    return $true
  }

  return $ControlType -in @(
    "Button",
    "Hyperlink",
    "MenuItem",
    "Edit",
    "ComboBox",
    "CheckBox",
    "RadioButton",
    "ListItem",
    "TabItem",
    "Slider",
    "Spinner"
  )
}

$activeApp = "Unavailable"
$windowTitle = "Unavailable"

try {
  $handle = [AuraNative]::GetForegroundWindow()

  if ($handle -eq [IntPtr]::Zero) {
    throw "No foreground window was detected."
  }

  $titleBuilder = New-Object System.Text.StringBuilder 1024
  [void][AuraNative]::GetWindowText($handle, $titleBuilder, $titleBuilder.Capacity)
  $windowTitle = $titleBuilder.ToString()

  [uint32]$processId = 0
  [void][AuraNative]::GetWindowThreadProcessId($handle, [ref]$processId)

  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    $activeApp = "$($process.ProcessName).exe"
  } else {
    $activeApp = "Unknown.exe"
  }

  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)

  if ($null -eq $root) {
    throw "Windows UI Automation could not read the foreground window."
  }

  $allElements = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )

  $elements = New-Object System.Collections.Generic.List[object]
  $unnamedFocusableCount = 0
  $smallInteractiveCount = 0
  $maxElements = 100

  for ($index = 0; $index -lt $allElements.Count; $index++) {
    if ($elements.Count -ge $maxElements) {
      break
    }

    $element = $allElements.Item($index)
    $name = ""
    $automationId = ""
    $isEnabled = $false
    $isKeyboardFocusable = $false
    $hasKeyboardFocus = $false
    $rectangle = $null

    try { $name = [string]$element.Current.Name } catch {}
    try { $automationId = [string]$element.Current.AutomationId } catch {}
    try { $isEnabled = [bool]$element.Current.IsEnabled } catch {}
    try { $isKeyboardFocusable = [bool]$element.Current.IsKeyboardFocusable } catch {}
    try { $hasKeyboardFocus = [bool]$element.Current.HasKeyboardFocus } catch {}
    try { $rectangle = Get-CleanRectangle $element.Current.BoundingRectangle } catch {}

    if ($null -eq $rectangle) {
      continue
    }

    $controlType = Get-ControlTypeName $element
    $isInteractive = Test-IsInteractiveControl -ControlType $controlType -IsKeyboardFocusable $isKeyboardFocusable
    $hasReadableName = -not [string]::IsNullOrWhiteSpace($name)

    if ($isKeyboardFocusable -and -not $hasReadableName) {
      $unnamedFocusableCount++
    }

    if ($isInteractive -and $isEnabled -and ($rectangle.width -lt 28 -or $rectangle.height -lt 28)) {
      $smallInteractiveCount++
    }

    $elements.Add([ordered]@{
      name = $name
      controlType = $controlType
      automationId = $automationId
      isEnabled = $isEnabled
      isKeyboardFocusable = $isKeyboardFocusable
      hasKeyboardFocus = $hasKeyboardFocus
      x = $rectangle.x
      y = $rectangle.y
      width = $rectangle.width
      height = $rectangle.height
    })
  }

  $detectedIssues = New-Object System.Collections.Generic.List[string]

  if ($unnamedFocusableCount -gt 0) {
    $detectedIssues.Add("Focusable controls without readable names detected.")
  }

  if ($smallInteractiveCount -gt 0) {
    $detectedIssues.Add("Small interactive controls detected.")
  }

  if ($allElements.Count -gt $maxElements -or $elements.Count -ge 80) {
    $detectedIssues.Add("Dense interface detected.")
  }

  $result = [ordered]@{
    activeApp = $activeApp
    windowTitle = $windowTitle
    privacyMode = "local-first"
    screenshotSentToAI = $false
    uiAutomationUsed = $true
    elementCount = $elements.Count
    elements = @($elements.ToArray())
    detectedIssues = @($detectedIssues.ToArray())
    aiSafeSummary = "AURA used Windows UI Automation locally to inspect accessible UI metadata. No screenshots were captured, saved, uploaded, or sent to AI."
  }

  $result | ConvertTo-Json -Depth 6 -Compress
} catch {
  $safeResult = New-SafeResult -Message $_.Exception.Message -ActiveApp $activeApp -WindowTitle $windowTitle
  $safeResult | ConvertTo-Json -Depth 6 -Compress
}
