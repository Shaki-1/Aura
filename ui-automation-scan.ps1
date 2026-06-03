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
    detectedIssues = @("AURA UI Automation scan failed locally: $Message")
    enforcementAreas = @()
    aiSafeSummary = "AURA attempted a local Windows UI Automation scan. No screenshots were captured, saved, uploaded, or sent to AI."
    error = $Message
  }
}

function Convert-BoundingRectangle {
  param($Rectangle)

  if ($null -eq $Rectangle -or $Rectangle.IsEmpty) {
    return $null
  }

  if ($Rectangle.Width -le 0 -or $Rectangle.Height -le 0) {
    return $null
  }

  return [ordered]@{
    x = [math]::Round($Rectangle.X, 0)
    y = [math]::Round($Rectangle.Y, 0)
    width = [math]::Round($Rectangle.Width, 0)
    height = [math]::Round($Rectangle.Height, 0)
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
  $activeApp = if ($process) { "$($process.ProcessName).exe" } else { "Unknown.exe" }

  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)

  if ($null -eq $root) {
    throw "Windows UI Automation could not read the foreground window."
  }

  $allElements = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )

  $elements = New-Object System.Collections.Generic.List[object]
  $detectedIssues = New-Object System.Collections.Generic.List[string]
  $enforcementAreas = New-Object System.Collections.Generic.List[object]
  $unnamedFocusableCount = 0
  $emptyButtonCount = 0
  $tinyClickableCount = 0
  $disabledImportantCount = 0
  $limit = [Math]::Min(100, $allElements.Count)

  for ($index = 0; $index -lt $limit; $index++) {
    $element = $allElements.Item($index)
    $name = ""
    $automationId = ""
    $isEnabled = $false
    $isKeyboardFocusable = $false

    try { $name = [string]$element.Current.Name } catch {}
    try { $automationId = [string]$element.Current.AutomationId } catch {}
    try { $isEnabled = [bool]$element.Current.IsEnabled } catch {}
    try { $isKeyboardFocusable = [bool]$element.Current.IsKeyboardFocusable } catch {}

    $controlType = Get-ControlTypeName $element
    $bounds = Convert-BoundingRectangle $element.Current.BoundingRectangle

    $elements.Add([ordered]@{
      name = $name
      controlType = $controlType
      automationId = $automationId
      isEnabled = $isEnabled
      isKeyboardFocusable = $isKeyboardFocusable
      boundingRectangle = $bounds
    })

    $hasName = -not [string]::IsNullOrWhiteSpace($name)
    $isImportantControl = $controlType -in @("Button", "Hyperlink", "MenuItem", "Edit", "ComboBox", "CheckBox", "RadioButton")

    if ($controlType -eq "Button" -and -not $hasName) {
      $emptyButtonCount++

      if ($bounds) {
        $enforcementAreas.Add([ordered]@{
          x = $bounds.x
          y = $bounds.y
          width = $bounds.width
          height = $bounds.height
          reason = "Button has no readable name"
          severity = "high"
        })
      }
    } elseif ($isKeyboardFocusable -and -not $hasName) {
      $unnamedFocusableCount++

      if ($bounds) {
        $enforcementAreas.Add([ordered]@{
          x = $bounds.x
          y = $bounds.y
          width = $bounds.width
          height = $bounds.height
          reason = "Focusable control has no readable label"
          severity = "high"
        })
      }
    }

    if ($bounds -and $isEnabled -and $isImportantControl -and ($bounds.width -lt 28 -or $bounds.height -lt 28)) {
      $tinyClickableCount++
      $enforcementAreas.Add([ordered]@{
        x = $bounds.x
        y = $bounds.y
        width = $bounds.width
        height = $bounds.height
        reason = "Clickable area may be too small"
        severity = "medium"
      })
    }

    if ($isImportantControl -and -not $isEnabled) {
      $disabledImportantCount++

      if ($bounds) {
        $enforcementAreas.Add([ordered]@{
          x = $bounds.x
          y = $bounds.y
          width = $bounds.width
          height = $bounds.height
          reason = "Important control appears disabled"
          severity = "low"
        })
      }
    }
  }

  if ($emptyButtonCount -gt 0) {
    $detectedIssues.Add("$emptyButtonCount button(s) have empty accessible names.")
  }

  if ($unnamedFocusableCount -gt 0) {
    $detectedIssues.Add("$unnamedFocusableCount focusable control(s) may be missing readable labels.")
  }

  if ($tinyClickableCount -gt 0) {
    $detectedIssues.Add("$tinyClickableCount clickable area(s) may be too small for comfortable use.")
  }

  if ($disabledImportantCount -gt 0) {
    $detectedIssues.Add("$disabledImportantCount important control(s) appear disabled or unavailable.")
  }

  if ($allElements.Count -gt 100) {
    $detectedIssues.Add("More than 100 controls were detected; this may be a dense interface.")
  }

  if ($detectedIssues.Count -eq 0) {
    $detectedIssues.Add("No obvious UI Automation accessibility issues were detected in the sampled elements.")
  }

  $uniqueAreas = $enforcementAreas |
    Sort-Object x, y, width, height, reason -Unique |
    Select-Object -First 24

  $result = [ordered]@{
    activeApp = $activeApp
    windowTitle = $windowTitle
    privacyMode = "local-first"
    screenshotSentToAI = $false
    uiAutomationUsed = $true
    elementCount = $elements.Count
    elements = $elements
    detectedIssues = $detectedIssues
    enforcementAreas = @($uniqueAreas)
    aiSafeSummary = "AURA used Windows UI Automation locally to inspect accessible UI metadata. No screenshots were captured, saved, uploaded, or sent to AI."
  }

  $result | ConvertTo-Json -Depth 8 -Compress
} catch {
  $safeResult = New-SafeResult -Message $_.Exception.Message -ActiveApp $activeApp -WindowTitle $windowTitle
  $safeResult | ConvertTo-Json -Depth 8 -Compress
}
