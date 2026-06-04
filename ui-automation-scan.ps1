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

function ConvertTo-SafeJsonString {
  param($Value)

  if ($null -eq $Value) {
    return ""
  }

  try {
    $text = [string]$Value
  } catch {
    return ""
  }

  if ([string]::IsNullOrEmpty($text)) {
    return ""
  }

  # UI Automation providers can expose raw control characters in names.
  # ConvertTo-Json escapes normal text, but invalid C0/control characters from
  # native providers can still break JSON parsing downstream, so normalize first.
  $builder = New-Object System.Text.StringBuilder

  foreach ($character in $text.ToCharArray()) {
    $code = [int][char]$character

    if ($code -eq 9 -or $code -eq 10 -or $code -eq 13) {
      [void]$builder.Append(" ")
      continue
    }

    if ($code -lt 32 -or ($code -ge 127 -and $code -le 159)) {
      continue
    }

    [void]$builder.Append($character)
  }

  return ($builder.ToString() -replace "\s{2,}", " ").Trim()
}

function New-SafeResult {
  param(
    [string]$Message,
    [string]$ActiveApp = "Unavailable",
    [string]$WindowTitle = "Unavailable"
  )

  $safeMessage = ConvertTo-SafeJsonString $Message
  $safeActiveApp = ConvertTo-SafeJsonString $ActiveApp
  $safeWindowTitle = ConvertTo-SafeJsonString $WindowTitle

  if ([string]::IsNullOrWhiteSpace($ActiveApp)) {
    $safeActiveApp = "Unavailable"
  }

  if ([string]::IsNullOrWhiteSpace($WindowTitle)) {
    $safeWindowTitle = "Unavailable"
  }

  if ([string]::IsNullOrWhiteSpace($safeMessage)) {
    $safeMessage = "Unknown local UI Automation error."
  }

  return [ordered]@{
    activeApp = $safeActiveApp
    windowTitle = $safeWindowTitle
    privacyMode = "local-first"
    screenshotSentToAI = $false
    uiAutomationUsed = $true
    elementCount = 0
    elements = @()
    caret = [ordered]@{
      available = $false
      x = 0
      y = 0
      width = 0
      height = 0
      sourceControlType = ""
      sourceName = ""
    }
    rootElement = $null
    rawElements = @()
    detectedIssues = @("AURA UI Automation scan failed locally: $safeMessage")
    aiSafeSummary = "AURA attempted a local Windows UI Automation scan. No screenshots were captured, saved, uploaded, or sent to AI."
    error = $safeMessage
  }
}

function Get-ControlTypeName {
  param($Element)

  try {
    return ConvertTo-SafeJsonString (($Element.Current.ControlType.ProgrammaticName -replace "^ControlType\.", ""))
  } catch {
    return "Unknown"
  }
}

function Get-ElementDiagnostic {
  param($Element)

  $name = ""
  $controlType = "Unknown"
  $automationId = ""
  $className = ""
  $localizedControlType = ""
  $isEnabled = $false
  $isKeyboardFocusable = $false
  $hasKeyboardFocus = $false
  $rectangle = $null

  try { $name = ConvertTo-SafeJsonString $Element.Current.Name } catch { $name = "" }
  try { $controlType = ConvertTo-SafeJsonString (Get-ControlTypeName $Element) } catch { $controlType = "Unknown" }
  try { $automationId = ConvertTo-SafeJsonString $Element.Current.AutomationId } catch { $automationId = "" }
  try { $className = ConvertTo-SafeJsonString $Element.Current.ClassName } catch { $className = "" }
  try { $localizedControlType = ConvertTo-SafeJsonString $Element.Current.LocalizedControlType } catch { $localizedControlType = "" }
  try { $isEnabled = [bool]$Element.Current.IsEnabled } catch { $isEnabled = $false }
  try { $isKeyboardFocusable = [bool]$Element.Current.IsKeyboardFocusable } catch { $isKeyboardFocusable = $false }
  try { $hasKeyboardFocus = [bool]$Element.Current.HasKeyboardFocus } catch { $hasKeyboardFocus = $false }
  try { $rectangle = Get-CleanRectangle $Element.Current.BoundingRectangle } catch { $rectangle = $null }

  $discardReason = ""
  if ($null -eq $rectangle) {
    $discardReason = "invalid-or-offscreen-rectangle"
  }

  return [ordered]@{
    name = $name
    controlType = $controlType
    automationId = $automationId
    className = $className
    localizedControlType = $localizedControlType
    isEnabled = $isEnabled
    isKeyboardFocusable = $isKeyboardFocusable
    hasKeyboardFocus = $hasKeyboardFocus
    x = if ($null -eq $rectangle) { 0 } else { $rectangle.x }
    y = if ($null -eq $rectangle) { 0 } else { $rectangle.y }
    width = if ($null -eq $rectangle) { 0 } else { $rectangle.width }
    height = if ($null -eq $rectangle) { 0 } else { $rectangle.height }
    discardReason = $discardReason
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

function Get-FirstTextRangeRectangle {
  param($TextRange)

  if ($null -eq $TextRange) {
    return $null
  }

  try {
    $rectangles = $TextRange.GetBoundingRectangles()

    if ($null -eq $rectangles -or $rectangles.Count -lt 4) {
      return $null
    }

    for ($index = 0; $index -le ($rectangles.Count - 4); $index += 4) {
      $x = [math]::Round($rectangles[$index], 0)
      $y = [math]::Round($rectangles[$index + 1], 0)
      $width = [math]::Round($rectangles[$index + 2], 0)
      $height = [math]::Round($rectangles[$index + 3], 0)

      if ($width -le 0 -or $height -le 0) {
        continue
      }

      if ($x -le -30000 -or $y -le -30000 -or $x -ge 30000 -or $y -ge 30000) {
        continue
      }

      return [ordered]@{
        x = $x
        y = $y
        width = $width
        height = $height
      }
    }
  } catch {}

  return $null
}

function Get-EmptyCaretDiagnostic {
  return [ordered]@{
    available = $false
    x = 0
    y = 0
    width = 0
    height = 0
    sourceControlType = ""
    sourceName = ""
  }
}

function Get-CaretDiagnostic {
  param(
    $Root,
    $AllElements
  )

  $candidates = New-Object System.Collections.Generic.List[object]

  try {
    $focusedElement = [System.Windows.Automation.AutomationElement]::FocusedElement
    if ($focusedElement) {
      $candidates.Add($focusedElement)
    }
  } catch {}

  if ($null -ne $AllElements) {
    try {
      for ($index = 0; $index -lt $AllElements.Count; $index++) {
        $candidate = $AllElements.Item($index)
        $controlType = Get-ControlTypeName $candidate
        $hasKeyboardFocus = $false

        try { $hasKeyboardFocus = [bool]$candidate.Current.HasKeyboardFocus } catch { $hasKeyboardFocus = $false }

        if ($hasKeyboardFocus -or $controlType -in @("Document", "Edit", "Text")) {
          $candidates.Add($candidate)
        }

        if ($candidates.Count -ge 25) {
          break
        }
      }
    } catch {}
  }

  if ($Root) {
    $candidates.Add($Root)
  }

  foreach ($candidate in $candidates) {
    if ($null -eq $candidate) {
      continue
    }

    $controlType = ""
    $name = ""
    try { $controlType = ConvertTo-SafeJsonString (Get-ControlTypeName $candidate) } catch { $controlType = "" }
    try { $name = ConvertTo-SafeJsonString $candidate.Current.Name } catch { $name = "" }

    try {
      $textPattern2 = $null
      $textPattern2Type = [type]::GetType("System.Windows.Automation.TextPattern2, UIAutomationClient")
      $textPattern2Pattern = if ($textPattern2Type) {
        $textPattern2Type.GetProperty("Pattern").GetValue($null, $null)
      } else {
        $null
      }

      if ($null -ne $textPattern2Pattern -and $candidate.TryGetCurrentPattern($textPattern2Pattern, [ref]$textPattern2)) {
        $isActive = $false
        $caretRange = $textPattern2.GetCaretRange([ref]$isActive)
        $rectangle = Get-FirstTextRangeRectangle $caretRange

        if ($null -ne $rectangle) {
          return [ordered]@{
            available = $true
            x = $rectangle.x
            y = $rectangle.y
            width = $rectangle.width
            height = $rectangle.height
            sourceControlType = $controlType
            sourceName = $name
          }
        }
      }
    } catch {}

    try {
      $textPattern = $null
      if ($candidate.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern, [ref]$textPattern)) {
        $selection = $textPattern.GetSelection()

        if ($null -ne $selection -and $selection.Count -gt 0) {
          $rectangle = Get-FirstTextRangeRectangle $selection[0]

          if ($null -ne $rectangle) {
            return [ordered]@{
              available = $true
              x = $rectangle.x
              y = $rectangle.y
              width = $rectangle.width
              height = $rectangle.height
              sourceControlType = $controlType
              sourceName = $name
            }
          }
        }
      }
    } catch {}
  }

  return Get-EmptyCaretDiagnostic
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
  $windowTitle = ConvertTo-SafeJsonString $titleBuilder.ToString()

  [uint32]$processId = 0
  [void][AuraNative]::GetWindowThreadProcessId($handle, [ref]$processId)

  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    $activeApp = ConvertTo-SafeJsonString "$($process.ProcessName).exe"
  } else {
    $activeApp = "Unknown.exe"
  }

  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)

  if ($null -eq $root) {
    throw "Windows UI Automation could not read the foreground window."
  }

  $rootDiagnostic = Get-ElementDiagnostic $root

  $allElements = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )

  $elements = New-Object System.Collections.Generic.List[object]
  $rawElements = New-Object System.Collections.Generic.List[object]
  $unnamedFocusableCount = 0
  $smallInteractiveCount = 0
  $maxElements = 100
  $maxRawElements = 20
  $caret = Get-CaretDiagnostic -Root $root -AllElements $allElements

  for ($index = 0; $index -lt $allElements.Count; $index++) {
    if ($elements.Count -ge $maxElements) {
      break
    }

    try {
      $element = $allElements.Item($index)

      if ($rawElements.Count -lt $maxRawElements) {
        try {
          $rawElements.Add((Get-ElementDiagnostic $element))
        } catch {}
      }

      $name = ""
      $automationId = ""
      $isEnabled = $false
      $isKeyboardFocusable = $false
      $hasKeyboardFocus = $false
      $rectangle = $null

      try { $name = ConvertTo-SafeJsonString $element.Current.Name } catch { $name = "" }
      try { $automationId = ConvertTo-SafeJsonString $element.Current.AutomationId } catch { $automationId = "" }
      try { $isEnabled = [bool]$element.Current.IsEnabled } catch { $isEnabled = $false }
      try { $isKeyboardFocusable = [bool]$element.Current.IsKeyboardFocusable } catch { $isKeyboardFocusable = $false }
      try { $hasKeyboardFocus = [bool]$element.Current.HasKeyboardFocus } catch { $hasKeyboardFocus = $false }
      try { $rectangle = Get-CleanRectangle $element.Current.BoundingRectangle } catch { $rectangle = $null }

      if ($null -eq $rectangle) {
        continue
      }

      $controlType = ConvertTo-SafeJsonString (Get-ControlTypeName $element)
      if ([string]::IsNullOrWhiteSpace($controlType)) {
        $controlType = "Unknown"
      }

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
    } catch {
      continue
    }
  }

  $detectedIssues = New-Object System.Collections.Generic.List[string]

  if ($unnamedFocusableCount -gt 0) {
    $detectedIssues.Add((ConvertTo-SafeJsonString "Focusable controls without readable names detected."))
  }

  if ($smallInteractiveCount -gt 0) {
    $detectedIssues.Add((ConvertTo-SafeJsonString "Small interactive controls detected."))
  }

  if ($allElements.Count -gt $maxElements -or $elements.Count -ge 80) {
    $detectedIssues.Add((ConvertTo-SafeJsonString "Dense interface detected."))
  }

  $result = [ordered]@{
    activeApp = ConvertTo-SafeJsonString $activeApp
    windowTitle = ConvertTo-SafeJsonString $windowTitle
    privacyMode = "local-first"
    screenshotSentToAI = $false
    uiAutomationUsed = $true
    elementCount = $elements.Count
    elements = @($elements.ToArray())
    caret = $caret
    rootElement = $rootDiagnostic
    rawElements = @($rawElements.ToArray())
    detectedIssues = @($detectedIssues.ToArray())
    aiSafeSummary = "AURA used Windows UI Automation locally to inspect accessible UI metadata. No screenshots were captured, saved, uploaded, or sent to AI."
  }

  $result | ConvertTo-Json -Depth 6 -Compress
} catch {
  $safeResult = New-SafeResult -Message $_.Exception.Message -ActiveApp $activeApp -WindowTitle $windowTitle
  $safeResult | ConvertTo-Json -Depth 6 -Compress
}
