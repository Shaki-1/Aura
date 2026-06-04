const { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, screen } = require("electron");
const { execFile, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

if (!app.isPackaged) {
  app.setPath("userData", path.join(__dirname, ".aura-user-data"));
}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-gpu-sandbox");

let mainWindow = null;
let overlayWindow = null;
let inputWatcherProcess = null;
// Local vision is optional and local-only. It is disabled by default. When it is
// enabled for future testing, screenshots are held in memory only and reduced to
// rectangle metadata before anything is returned to the renderer.
let localVisionEnabled = false;
const LOCAL_VISION_TEXT_DEBUG = true;
const scriptBasePath = app.isPackaged
  ? process.resourcesPath
  : __dirname;
const activeWindowScript = path.join(scriptBasePath, "active-window.ps1");
const uiAutomationScript = path.join(scriptBasePath, "ui-automation-scan.ps1");
let latestOverlayState = {
  mode: "voyager",
  detectionMode: "dynamic",
  profileName: "Default Accessibility Profile",
  filterClass: "filter-default",
  activeApp: "Waiting",
  colorVisionProfile: "contrast-boost",
  selectedColorVisionProfile: "contrast-boost",
  eyeStrainProfile: "warm-comfort",
  selectedEyeStrainProfile: "warm-comfort",
  lowVisionProfile: "high-contrast",
  selectedLowVisionProfile: "high-contrast",
  filterIntensity: 60,
  screenEnforcementActive: false,
  scanStatus: "Waiting",
  enforcementAreas: [],
  primaryReadingArea: null
};
let latestActiveWindowState = {
  activeApp: "",
  windowTitle: ""
};

const inputWatcherScript = String.raw`
Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class AuraInputWatcher {
  private const int WH_KEYBOARD_LL = 13;
  private const int WH_MOUSE_LL = 14;
  private const int WM_KEYDOWN = 0x0100;
  private const int WM_SYSKEYDOWN = 0x0104;
  private const int WM_LBUTTONDOWN = 0x0201;
  private const int WM_RBUTTONDOWN = 0x0204;
  private const int WM_MBUTTONDOWN = 0x0207;
  private const int WM_MOUSEWHEEL = 0x020A;
  private const int WM_MOUSEHWHEEL = 0x020E;

  private static LowLevelProc keyboardProc = KeyboardHookCallback;
  private static LowLevelProc mouseProc = MouseHookCallback;
  private static IntPtr keyboardHook = IntPtr.Zero;
  private static IntPtr mouseHook = IntPtr.Zero;

  public static void Run() {
    keyboardHook = SetHook(WH_KEYBOARD_LL, keyboardProc);
    mouseHook = SetHook(WH_MOUSE_LL, mouseProc);
    Application.Run();
    UnhookWindowsHookEx(keyboardHook);
    UnhookWindowsHookEx(mouseHook);
  }

  private static IntPtr SetHook(int hookType, LowLevelProc proc) {
    using (Process currentProcess = Process.GetCurrentProcess())
    using (ProcessModule currentModule = currentProcess.MainModule) {
      return SetWindowsHookEx(hookType, proc, GetModuleHandle(currentModule.ModuleName), 0);
    }
  }

  private delegate IntPtr LowLevelProc(int nCode, IntPtr wParam, IntPtr lParam);

  private static IntPtr KeyboardHookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
    if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
      Console.WriteLine("keyboard navigation");
      Console.Out.Flush();
    }

    return CallNextHookEx(keyboardHook, nCode, wParam, lParam);
  }

  private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
    if (nCode >= 0) {
      int message = wParam.ToInt32();

      if (message == WM_MOUSEWHEEL || message == WM_MOUSEHWHEEL) {
        Console.WriteLine("scroll activity");
        Console.Out.Flush();
      } else if (message == WM_LBUTTONDOWN || message == WM_RBUTTONDOWN || message == WM_MBUTTONDOWN) {
        Console.WriteLine("mouse activity");
        Console.Out.Flush();
      }
    }

    return CallNextHookEx(mouseHook, nCode, wParam, lParam);
  }

  [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
  private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelProc lpfn, IntPtr hMod, uint dwThreadId);

  [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  private static extern bool UnhookWindowsHookEx(IntPtr hhk);

  [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
  private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

  [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
  private static extern IntPtr GetModuleHandle(string lpModuleName);
}
"@

[AuraInputWatcher]::Run()
`;

function createSafeScanError(errorMessage) {
  return {
    privacyMode: "local-first",
    detectedIssues: [
      "AURA could not read the active window right now. Try again after selecting an app."
    ],
    aiSafeSummary: "AURA scan failed locally. No screenshots were sent to AI.",
    windowTitle: "Unavailable",
    activeApp: "Unavailable",
    screenshotSentToAI: false,
    error: errorMessage
  };
}

function parsePowerShellJson(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("PowerShell output did not contain JSON.");
  }

  return JSON.parse(output.slice(firstBrace, lastBrace + 1));
}

function createSafeUIScanError(errorMessage) {
  return {
    activeApp: "Unavailable",
    windowTitle: "Unavailable",
    privacyMode: "local-first",
    screenshotSentToAI: false,
    uiAutomationUsed: true,
    elementCount: 0,
    detectedIssues: [
      "AURA could not inspect UI Automation metadata for the active window right now."
    ],
    enforcementAreas: [],
    aiSafeSummary: "AURA UI Automation scan failed locally. No screenshots were captured, saved, uploaded, or sent to AI.",
    error: errorMessage
  };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatAreaTrace(area) {
  if (!area) {
    return {
      type: null,
      source: null,
      x: null,
      y: null,
      width: null,
      height: null,
      confidence: null,
      reason: "none"
    };
  }

  return {
    type: area.type || null,
    source: area.source || null,
    x: Number(area.x || 0),
    y: Number(area.y || 0),
    width: Number(area.width || 0),
    height: Number(area.height || 0),
    confidence: Number(area.confidence || 0),
    reason: area.reason || "selected"
  };
}

function createLocalVisionSafeCenterArea(sourceSize) {
  return {
    type: "visual-safe-center",
    name: "Local vision safe center",
    x: Math.round(sourceSize.width * 0.15),
    y: Math.round(sourceSize.height * 0.18),
    width: Math.round(sourceSize.width * 0.7),
    height: Math.round(sourceSize.height * 0.65),
    confidence: 45,
    source: "local-vision",
    reason: "fallback: screenshot capture succeeded but no visual candidates survived"
  };
}

function getLocalVisionAppContext() {
  const activeApp = String(latestActiveWindowState.activeApp || latestOverlayState.activeApp || "").toLowerCase();
  const windowTitle = String(latestActiveWindowState.windowTitle || "").toLowerCase();
  const profileName = String(latestOverlayState.profileName || "").toLowerCase();
  const browserApps = ["chrome.exe", "msedge.exe", "firefox.exe", "brave.exe"];
  const simpleEditorApps = ["notepad.exe", "notepad++.exe", "wordpad.exe", "winword.exe", "sublime_text.exe"];
  const codeEditorApps = ["code.exe", "code - insiders.exe"];

  return {
    activeApp,
    windowTitle,
    profileName,
    isBrowserLike: browserApps.includes(activeApp) || profileName.includes("browser") || windowTitle.includes("google docs"),
    isSimpleEditor: simpleEditorApps.includes(activeApp) || profileName.includes("readability"),
    isCodeEditor: codeEditorApps.includes(activeApp) || profileName.includes("code")
  };
}

function detectDebugTextBounds(thumbnail, sourceSize, appContext = getLocalVisionAppContext()) {
  if (!LOCAL_VISION_TEXT_DEBUG || !thumbnail || thumbnail.isEmpty()) {
    return null;
  }

  const maxSampleWidth = 360;
  const sampleScale = Math.min(1, maxSampleWidth / Math.max(1, sourceSize.width));
  const sampleWidth = Math.max(1, Math.round(sourceSize.width * sampleScale));
  const sampleHeight = Math.max(1, Math.round(sourceSize.height * sampleScale));
  const sampleImage = thumbnail.resize({
    width: sampleWidth,
    height: sampleHeight
  });
  const bitmap = sampleImage.toBitmap();
  const brightnessMap = Array.from({ length: sampleHeight }, () => Array(sampleWidth).fill(0));
  const rowCounts = Array(sampleHeight).fill(0);
  const columnCounts = Array(sampleWidth).fill(0);
  const textPixels = [];
  let totalSampledPixels = 0;
  let textLikePixelCount = 0;
  let minTextX = sampleWidth;
  let maxTextX = -1;
  let minTextY = sampleHeight;
  let maxTextY = -1;

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const index = (y * sampleWidth + x) * 4;
      const blue = bitmap[index];
      const green = bitmap[index + 1];
      const red = bitmap[index + 2];
      brightnessMap[y][x] = (red + green + blue) / 3;
      totalSampledPixels += 1;
    }
  }

  function getLocalAverage(x, y) {
    let totalBrightness = 0;
    let count = 0;
    const radius = 3;

    for (let localY = Math.max(0, y - radius); localY <= Math.min(sampleHeight - 1, y + radius); localY += 1) {
      for (let localX = Math.max(0, x - radius); localX <= Math.min(sampleWidth - 1, x + radius); localX += 1) {
        if (Math.abs(localX - x) <= 1 && Math.abs(localY - y) <= 1) {
          continue;
        }

        totalBrightness += brightnessMap[localY][localX];
        count += 1;
      }
    }

    return count > 0 ? totalBrightness / count : brightnessMap[y][x];
  }

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const brightness = brightnessMap[y][x];
      const localAverage = getLocalAverage(x, y);
      const contrast = Math.abs(brightness - localAverage);
      const darkAgainstAverage = brightness < localAverage - 24 && brightness < 150;
      const brightAgainstAverage = brightness > localAverage + 24 && brightness > 105;
      const extremeInk = brightness < 72 || brightness > 228;
      const textLike = (
        contrast >= 28 ||
        darkAgainstAverage ||
        brightAgainstAverage ||
        (extremeInk && contrast >= 16)
      );

      if (!textLike) {
        continue;
      }

      textLikePixelCount += 1;
      rowCounts[y] += 1;
      columnCounts[x] += 1;
      minTextX = Math.min(minTextX, x);
      maxTextX = Math.max(maxTextX, x);
      minTextY = Math.min(minTextY, y);
      maxTextY = Math.max(maxTextY, y);
      textPixels.push({ x, y });
    }
  }

  const minimumRowCount = Math.max(2, Math.round(sampleWidth * 0.006));
  const minimumColumnCount = Math.max(2, Math.round(sampleHeight * 0.006));
  const textRows = rowCounts
    .map((count, index) => ({ count, index }))
    .filter((row) => row.count >= minimumRowCount);
  const textColumns = columnCounts
    .map((count, index) => ({ count, index }))
    .filter((column) => column.count >= minimumColumnCount);
  const textLikeRowsCount = textRows.length;
  const textLikeColumnsCount = textColumns.length;
  let rejectedReason = "";

  if (textLikePixelCount < 24) {
    rejectedReason = "too few text-like contrast pixels";
  } else if (textRows.length === 0 || textColumns.length === 0) {
    rejectedReason = "text-like pixels did not form stable rows/columns";
  }

  const sampleTextBounds = rejectedReason
    ? null
    : {
      x: Math.min(...textColumns.map((column) => column.index)),
      y: Math.min(...textRows.map((row) => row.index)),
      width: Math.max(...textColumns.map((column) => column.index)) - Math.min(...textColumns.map((column) => column.index)) + 1,
      height: Math.max(...textRows.map((row) => row.index)) - Math.min(...textRows.map((row) => row.index)) + 1
    };
  const scaleBack = sourceSize.width / sampleWidth;
  const textBounds = sampleTextBounds
    ? {
      x: Math.round(sampleTextBounds.x * scaleBack),
      y: Math.round(sampleTextBounds.y * scaleBack),
      width: Math.round(sampleTextBounds.width * scaleBack),
      height: Math.round(sampleTextBounds.height * scaleBack)
    }
    : null;

  console.log("Local vision text-pixel diagnostics:", {
    totalSampledPixels,
    textLikePixelCount,
    textLikeRowsCount,
    textLikeColumnsCount,
    minTextX: minTextX === sampleWidth ? null : Math.round(minTextX * scaleBack),
    maxTextX: maxTextX === -1 ? null : Math.round(maxTextX * scaleBack),
    minTextY: minTextY === sampleHeight ? null : Math.round(minTextY * scaleBack),
    maxTextY: maxTextY === -1 ? null : Math.round(maxTextY * scaleBack)
  });

  console.log("TEXT_DEBUG_SAMPLE:", {
    textLikePixelCount,
    textBounds,
    rejectedReason: rejectedReason || "accepted for coordinate debugging"
  });

  const clusterCellSize = 16;

  function buildTextClusters(bounds, passName) {
    const clusterColumns = Math.ceil(sampleWidth / clusterCellSize);
    const clusterRows = Math.ceil(sampleHeight / clusterCellSize);
    const clusterCellCounts = Array.from({ length: clusterRows }, () => Array(clusterColumns).fill(0));
    const clusterCellDensity = Array.from({ length: clusterRows }, () => Array(clusterColumns).fill(0));
    const clusterActive = Array.from({ length: clusterRows }, () => Array(clusterColumns).fill(false));
    const minAllowedX = Math.round(bounds.minX * sampleScale);
    const maxAllowedX = Math.round(bounds.maxX * sampleScale);
    const minAllowedY = Math.round(bounds.minY * sampleScale);
    const maxAllowedY = Math.round(bounds.maxY * sampleScale);
    let activeCellCount = 0;

    textPixels.forEach((pixel) => {
      if (
        pixel.x < minAllowedX ||
        pixel.x > maxAllowedX ||
        pixel.y < minAllowedY ||
        pixel.y > maxAllowedY
      ) {
        return;
      }

      const column = Math.floor(pixel.x / clusterCellSize);
      const row = Math.floor(pixel.y / clusterCellSize);

      if (row >= 0 && row < clusterRows && column >= 0 && column < clusterColumns) {
        clusterCellCounts[row][column] += 1;
      }
    });

    for (let row = 0; row < clusterRows; row += 1) {
      for (let column = 0; column < clusterColumns; column += 1) {
        const sampleX = column * clusterCellSize;
        const sampleY = row * clusterCellSize;
        const sampleCellWidth = Math.min(sampleWidth, sampleX + clusterCellSize) - sampleX;
        const sampleCellHeight = Math.min(sampleHeight, sampleY + clusterCellSize) - sampleY;
        const cellArea = Math.max(1, sampleCellWidth * sampleCellHeight);
        const density = clusterCellCounts[row][column] / cellArea;
        clusterCellDensity[row][column] = density;

        if (
          sampleX >= minAllowedX &&
          sampleX <= maxAllowedX &&
          sampleY >= minAllowedY &&
          sampleY <= maxAllowedY &&
          clusterCellCounts[row][column] >= 8 &&
          density >= 0.06
        ) {
          clusterActive[row][column] = true;
          activeCellCount += 1;
        }
      }
    }

    const clusterVisited = Array.from({ length: clusterRows }, () => Array(clusterColumns).fill(false));
    const clusters = [];
    const neighborOffsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];

    for (let row = 0; row < clusterRows; row += 1) {
      for (let column = 0; column < clusterColumns; column += 1) {
        if (!clusterActive[row][column] || clusterVisited[row][column]) {
          continue;
        }

        const queue = [[row, column]];
        let minRow = row;
        let maxRow = row;
        let minColumn = column;
        let maxColumn = column;
        let cellCount = 0;
        let textPixelTotal = 0;
        clusterVisited[row][column] = true;

        while (queue.length > 0) {
          const [currentRow, currentColumn] = queue.shift();
          minRow = Math.min(minRow, currentRow);
          maxRow = Math.max(maxRow, currentRow);
          minColumn = Math.min(minColumn, currentColumn);
          maxColumn = Math.max(maxColumn, currentColumn);
          cellCount += 1;
          textPixelTotal += clusterCellCounts[currentRow][currentColumn];

          neighborOffsets.forEach(([rowOffset, columnOffset]) => {
            const nextRow = currentRow + rowOffset;
            const nextColumn = currentColumn + columnOffset;

            if (
              nextRow >= 0 &&
              nextRow < clusterRows &&
              nextColumn >= 0 &&
              nextColumn < clusterColumns &&
              clusterActive[nextRow][nextColumn] &&
              !clusterVisited[nextRow][nextColumn] &&
              Math.abs(clusterCellDensity[nextRow][nextColumn] - clusterCellDensity[currentRow][currentColumn]) <= 0.16
            ) {
              clusterVisited[nextRow][nextColumn] = true;
              queue.push([nextRow, nextColumn]);
            }
          });
        }

        const sampleX = minColumn * clusterCellSize;
        const sampleY = minRow * clusterCellSize;
        const sampleClusterWidth = Math.min(sampleWidth, (maxColumn + 1) * clusterCellSize) - sampleX;
        const sampleClusterHeight = Math.min(sampleHeight, (maxRow + 1) * clusterCellSize) - sampleY;
        const x = Math.round(sampleX * scaleBack);
        const y = Math.round(sampleY * scaleBack);
        const width = Math.round(sampleClusterWidth * scaleBack);
        const height = Math.round(sampleClusterHeight * scaleBack);
        const density = textPixelTotal / Math.max(1, sampleClusterWidth * sampleClusterHeight);

        clusters.push({
          x,
          y,
          width,
          height,
          density: Number(density.toFixed(3)),
          cellCount,
          textPixelTotal,
          passName
        });
      }
    }

    return {
      activeCellCount,
      clusters
    };
  }

  const fullClusterPass = buildTextClusters({
    minX: 0,
    maxX: sourceSize.width,
    minY: sourceSize.height * 0.12,
    maxY: sourceSize.height * 0.92
  }, "main-content");
  const hasHugeFullScreenCluster = fullClusterPass.clusters.some((cluster) => (
    cluster.width > sourceSize.width * 0.8 &&
    cluster.height > sourceSize.height * 0.8
  ));
  const clusterPass = hasHugeFullScreenCluster
    ? buildTextClusters({
      minX: sourceSize.width * 0.08,
      maxX: sourceSize.width * 0.92,
      minY: sourceSize.height * 0.15,
      maxY: sourceSize.height * 0.9
    }, "middle-content-retry")
    : fullClusterPass;
  const allClusters = clusterPass.clusters;

  const acceptedClusterLogs = [];
  const rejectedClusterLogs = [];
  const clusterRankingRows = [];
  const clusterReadingEligibilityRows = [];

  function getAreaBox(area) {
    return {
      x: area?.x ?? null,
      y: area?.y ?? null,
      width: area?.width ?? null,
      height: area?.height ?? null
    };
  }

  function getReadingAreaEligibility(cluster) {
    if (cluster.width < 250 || cluster.height < 100 || cluster.cellCount < 8) {
      return {
        eligible: false,
        reason: "too small for reading area"
      };
    }

    return {
      eligible: true,
      reason: "eligible"
    };
  }

  function rankTextCluster(cluster, clusterId) {
    const widthRatio = cluster.width / Math.max(1, sourceSize.width);
    const heightRatio = cluster.height / Math.max(1, sourceSize.height);
    const xRatio = cluster.x / Math.max(1, sourceSize.width);
    const centerX = cluster.x + cluster.width / 2;
    const screenCenterX = sourceSize.width / 2;
    const centerDistance = Math.abs(centerX - screenCenterX) / Math.max(1, screenCenterX);
    const penalties = [];
    const bonuses = [];
    let penaltyTotal = 0;
    let bonusTotal = 0;

    // Rank for useful text/content specificity, not just total cluster size.
    const rawScore = (
      cluster.cellCount * 2.4 +
      Math.min(80, cluster.width / 18) +
      Math.min(120, cluster.height / 7) +
      Math.min(45, cluster.density * 45)
    );
    const broadWidth = widthRatio > 0.75;
    const broadHeight = heightRatio > 0.7;
    const nearLeftEdge = xRatio < 0.02;
    const nearTextMargin = xRatio >= 0.03 && xRatio <= 0.45;
    const almostFullWindow = (
      widthRatio > 0.96 &&
      heightRatio > 0.88 &&
      cluster.x < sourceSize.width * 0.02 &&
      cluster.y < sourceSize.height * 0.08
    );
    const reachesFarRightEdge = cluster.x + cluster.width > sourceSize.width * 0.96;
    const largeSparseRegion = (
      (widthRatio > 0.5 || heightRatio > 0.45) &&
      cluster.density < 0.07
    );
    const readingEligibility = getReadingAreaEligibility(cluster);
    const strongLargeReadingRegion = Boolean(
      readingEligibility.eligible &&
      cluster.cellCount >= 16 &&
      cluster.density >= 0.06 &&
      (broadWidth || broadHeight)
    );

    if (broadWidth) {
      penaltyTotal += strongLargeReadingRegion ? 8 : 22;
      penalties.push("wide reading region soft penalty");
    }

    if (broadHeight) {
      penaltyTotal += strongLargeReadingRegion ? 6 : 18;
      penalties.push("tall reading region soft penalty");
    }

    if (nearLeftEdge) {
      penaltyTotal += 42;
      penalties.push("starts near app border");
    }

    if (almostFullWindow) {
      penaltyTotal += 45;
      penalties.push("near full-window region");
    }

    if (largeSparseRegion && !strongLargeReadingRegion) {
      penaltyTotal += 38;
      penalties.push("large empty/background area");
    }

    if (!readingEligibility.eligible) {
      penaltyTotal += 95;
      penalties.push(readingEligibility.reason);
    }

    if (widthRatio >= 0.1 && widthRatio <= 0.55) {
      bonusTotal += 34;
      bonuses.push("medium width bonus");
    } else if (widthRatio > 0.55 && widthRatio <= 0.75) {
      bonusTotal += 10;
      bonuses.push("wide content bonus");
    } else if (strongLargeReadingRegion) {
      bonusTotal += 24;
      bonuses.push("large editor width bonus");
    }

    if (heightRatio >= 0.035 && heightRatio <= 0.45) {
      bonusTotal += 22;
      bonuses.push("readable height bonus");
    } else if (heightRatio > 0.45 && heightRatio <= 0.7) {
      bonusTotal += 8;
      bonuses.push("tall content bonus");
    } else if (strongLargeReadingRegion) {
      bonusTotal += 18;
      bonuses.push("large editor height bonus");
    }

    if (cluster.density >= 0.08) {
      bonusTotal += 20;
      bonuses.push("text density bonus");
    }

    if (cluster.density >= 0.16) {
      bonusTotal += 18;
      bonuses.push("strong text density bonus");
    }

    // Notepad-like editors usually have a small text margin after the app border.
    if (nearTextMargin) {
      bonusTotal += 18;
      bonuses.push("text margin alignment bonus");
    }

    if (strongLargeReadingRegion) {
      bonusTotal += 26;
      bonuses.push("strong large reading region bonus");
    }

    if (cluster.cellCount >= 20 && cluster.height >= 250) {
      bonusTotal += 120;
      bonuses.push("multi-line reading region bonus");
    }

    if (cluster.width >= 300 && cluster.height >= 250) {
      bonusTotal += 80;
      bonuses.push("useful reading size bonus");
    }

    if (cluster.height < 160) {
      penaltyTotal += 120;
      penalties.push("short dense block penalty");
    }

    if (cluster.y < 180 && cluster.height < 180) {
      penaltyTotal += 80;
      penalties.push("title/header-like cluster penalty");
    }

    if (appContext.isSimpleEditor && cluster.cellCount >= 20 && cluster.height >= 250) {
      bonusTotal += 80;
      bonuses.push("simple editor largest readable content bonus");
    }

    if (appContext.isBrowserLike) {
      if (centerDistance < 0.22) {
        bonusTotal += 26;
        bonuses.push("browser/document center-column bonus");
      }

      if (widthRatio >= 0.4 && widthRatio <= 0.75) {
        bonusTotal += 38;
        bonuses.push("browser/document page-width bonus");
      }

      if (xRatio > 0.05 && !reachesFarRightEdge) {
        bonusTotal += 20;
        bonuses.push("browser/document side-margin bonus");
      }

      if (widthRatio > 0.85) {
        penaltyTotal += 34;
        penalties.push("browser/document full-width penalty");
      }

      if (cluster.y < sourceSize.height * 0.16) {
        penaltyTotal += 20;
        penalties.push("browser toolbar area penalty");
      }
    }

    if (appContext.isCodeEditor) {
      if (cluster.x > sourceSize.width * 0.12 && cluster.x < sourceSize.width * 0.42) {
        bonusTotal += 18;
        bonuses.push("code editor pane alignment bonus");
      }

      if (cluster.x + cluster.width > sourceSize.width * 0.94) {
        penaltyTotal += 16;
        penalties.push("code editor far-right/minimap penalty");
      }
    }

    if (appContext.isSimpleEditor && strongLargeReadingRegion) {
      bonusTotal += 24;
      bonuses.push("simple editor large reading-region bonus");
    }

    const centerBonus = Math.round((1 - Math.min(1, centerDistance)) * 10);
    bonusTotal += centerBonus;
    bonuses.push(`center proximity bonus: ${centerBonus}`);

    const finalScore = rawScore + bonusTotal - penaltyTotal;
    const tooBroad = nearLeftEdge || almostFullWindow || (largeSparseRegion && !strongLargeReadingRegion);
    const confidenceCap = tooBroad ? 58 : 86;
    const confidence = readingEligibility.eligible
      ? clampNumber(Math.round(42 + finalScore / 4), 35, confidenceCap)
      : 45;

    return {
      clusterId,
      rawScore: Number(rawScore.toFixed(2)),
      bonuses,
      penalties,
      finalScore: Number(finalScore.toFixed(2)),
      confidence,
      tooBroad,
      readingEligible: readingEligibility.eligible,
      readingEligibilityReason: readingEligibility.reason
    };
  }

  allClusters.forEach((cluster, index) => {
    const clusterId = index + 1;
    const ranking = rankTextCluster(cluster, clusterId);
    let rejectionReason = "";

    if (cluster.cellCount < 2) {
      rejectionReason = "too small";
    } else if (cluster.width < 24 || cluster.height < 12) {
      rejectionReason = "bounds too small";
    } else if (cluster.y < sourceSize.height * 0.08) {
      rejectionReason = "top toolbar region";
    } else if (cluster.density < 0.01) {
      rejectionReason = "low density";
    }

    clusterRankingRows.push({
      clusterId,
      x: cluster.x,
      y: cluster.y,
      width: cluster.width,
      height: cluster.height,
      density: cluster.density,
      cellCount: cluster.cellCount,
      rawScore: ranking.rawScore,
      penalties: ranking.penalties.join(", ") || "none",
      finalScore: ranking.finalScore,
      confidence: ranking.confidence,
      selected: false,
      rejected: Boolean(rejectionReason),
      rejectionReason: rejectionReason || "accepted"
    });
    clusterReadingEligibilityRows.push({
      clusterId,
      width: cluster.width,
      height: cluster.height,
      cellCount: cluster.cellCount,
      eligible: ranking.readingEligible,
      reason: ranking.readingEligibilityReason
    });

    if (rejectionReason) {
      rejectedClusterLogs.push({
        clusterId,
        x: cluster.x,
        y: cluster.y,
        width: cluster.width,
        height: cluster.height,
        density: cluster.density,
        cellCount: cluster.cellCount,
        rawScore: ranking.rawScore,
        bonuses: ranking.bonuses,
        penalties: ranking.penalties,
        finalScore: ranking.finalScore,
        rejectionReason
      });
    } else {
      acceptedClusterLogs.push({
        clusterId,
        x: cluster.x,
        y: cluster.y,
        width: cluster.width,
        height: cluster.height,
        density: cluster.density,
        cellCount: cluster.cellCount,
        rawScore: ranking.rawScore,
        bonuses: ranking.bonuses,
        penalties: ranking.penalties,
        score: ranking.finalScore,
        confidence: ranking.confidence,
        tooBroad: ranking.tooBroad,
        readingEligible: ranking.readingEligible,
        readingEligibilityReason: ranking.readingEligibilityReason
      });
    }
  });

  acceptedClusterLogs.sort((first, second) => second.score - first.score);
  const readingAreaCandidates = acceptedClusterLogs.filter((cluster) => cluster.readingEligible);
  function createSimpleEditorMergedReadingArea(candidates) {
    if (!appContext.isSimpleEditor || candidates.length === 0) {
      return null;
    }

    const mainContentTop = sourceSize.height * 0.1;
    const mainContentBottom = sourceSize.height * 0.92;
    const eligibleClusters = candidates
      .filter((cluster) => (
        cluster.y >= mainContentTop &&
        cluster.y + cluster.height <= mainContentBottom &&
        cluster.width >= 250 &&
        cluster.height >= 100 &&
        cluster.cellCount >= 8
      ))
      .sort((first, second) => first.y - second.y);

    if (eligibleClusters.length === 0) {
      console.log("NOTEPAD_MERGED_READING_AREA", {
        includedClusterIds: [],
        beforeClusters: [],
        mergedArea: null,
        reason: "no simple-editor clusters survived merge eligibility"
      });
      return null;
    }

    const anchor = eligibleClusters
      .slice()
      .sort((first, second) => (
        second.cellCount - first.cellCount ||
        second.height - first.height
      ))[0];
    const anchorX = anchor.x;
    const anchorRight = anchor.x + anchor.width;
    const includedClusters = eligibleClusters.filter((cluster) => {
      const clusterRight = cluster.x + cluster.width;
      const xDistance = Math.abs(cluster.x - anchorX);
      const rightDistance = Math.abs(clusterRight - anchorRight);
      const horizontalOverlap = Math.max(0, Math.min(clusterRight, anchorRight) - Math.max(cluster.x, anchorX));
      const overlapRatio = horizontalOverlap / Math.max(1, Math.min(cluster.width, anchor.width));

      return (
        xDistance <= Math.max(90, sourceSize.width * 0.08) ||
        rightDistance <= Math.max(140, sourceSize.width * 0.12) ||
        overlapRatio >= 0.45 ||
        cluster.width > sourceSize.width * 0.75
      );
    });

    if (includedClusters.length === 0) {
      return null;
    }

    const minX = Math.min(...includedClusters.map((cluster) => cluster.x));
    const minY = Math.min(...includedClusters.map((cluster) => cluster.y));
    const maxRight = Math.max(...includedClusters.map((cluster) => cluster.x + cluster.width));
    const maxBottom = Math.max(...includedClusters.map((cluster) => cluster.y + cluster.height));
    const padding = 32;
    const mergedArea = {
      clusterId: "notepad-merged",
      x: clampNumber(Math.round(minX - padding), 0, sourceSize.width),
      y: clampNumber(Math.round(minY - padding), Math.round(sourceSize.height * 0.08), sourceSize.height),
      width: 0,
      height: 0,
      density: Number((includedClusters.reduce((total, cluster) => total + cluster.density, 0) / includedClusters.length).toFixed(3)),
      cellCount: includedClusters.reduce((total, cluster) => total + cluster.cellCount, 0),
      rawScore: 0,
      bonuses: ["simple editor merged reading area"],
      penalties: [],
      score: Math.max(...includedClusters.map((cluster) => cluster.score)) + 140,
      confidence: 86,
      tooBroad: false,
      readingEligible: true,
      readingEligibilityReason: "eligible"
    };
    const paddedRight = clampNumber(Math.round(maxRight + padding), mergedArea.x + 1, sourceSize.width);
    const paddedBottom = clampNumber(Math.round(maxBottom + padding), mergedArea.y + 1, Math.round(sourceSize.height * 0.94));
    mergedArea.width = paddedRight - mergedArea.x;
    mergedArea.height = paddedBottom - mergedArea.y;

    const includesToolbarOrTaskbar = mergedArea.y < sourceSize.height * 0.08 || mergedArea.y + mergedArea.height > sourceSize.height * 0.96;

    console.log("NOTEPAD_MERGED_READING_AREA", {
      includedClusterIds: includedClusters.map((cluster) => cluster.clusterId),
      beforeClusters: includedClusters.map((cluster) => getAreaBox(cluster)),
      mergedArea,
      reason: includesToolbarOrTaskbar
        ? "rejected: merged area includes toolbar/taskbar"
        : "accepted: vertically stacked simple-editor text clusters merged"
    });

    return includesToolbarOrTaskbar ? null : mergedArea;
  }

  const simpleEditorMergedCluster = createSimpleEditorMergedReadingArea(readingAreaCandidates);

  function getFinalSelectionScore(cluster) {
    const centerX = cluster.x + cluster.width / 2;
    const screenCenterX = sourceSize.width / 2;
    const centerDistance = Math.abs(centerX - screenCenterX) / Math.max(1, screenCenterX);
    const activeApp = appContext.activeApp || "unknown";
    const adjustmentLogs = [];
    let score = cluster.score;

    function applyAppSpecificAdjustment(amount, reason) {
      const beforeScore = score;
      score += amount;
      adjustmentLogs.push({
        activeApp,
        clusterId: cluster.clusterId,
        beforeScore: Number(beforeScore.toFixed(2)),
        adjustmentReason: reason,
        afterScore: Number(score.toFixed(2))
      });
    }

    if (cluster.height >= 220) {
      score += 120;
    }

    if (cluster.height < 180) {
      score -= 240;
    }

    if (appContext.isBrowserLike) {
      if (cluster.height >= 350) {
        applyAppSpecificAdjustment(160, "browser/document tall body bonus");
      } else {
        applyAppSpecificAdjustment(-110, "browser/document short region penalty");
      }

      if (cluster.width >= 350 && cluster.width <= 950) {
        applyAppSpecificAdjustment(180, "browser/document page width bonus");
      }

      if (cluster.x > sourceSize.width * 0.04) {
        applyAppSpecificAdjustment(50, "browser/document not near left edge bonus");
      } else {
        applyAppSpecificAdjustment(-140, "browser/document starts near left edge penalty");
      }

      if (centerDistance < 0.28) {
        applyAppSpecificAdjustment(80, "browser/document centered column bonus");
      }

      if (cluster.width > sourceSize.width * 0.85) {
        applyAppSpecificAdjustment(-180, "browser/document too wide penalty");
      }

      if (cluster.y < 120) {
        applyAppSpecificAdjustment(-90, "browser/document toolbar area penalty");
      }

      if (
        cluster.y < 180 &&
        cluster.height < 180 &&
        cluster.width > sourceSize.width * 0.7
      ) {
        applyAppSpecificAdjustment(-520, "browser/document top header strip rejection penalty");
      }
    }

    if (appContext.isCodeEditor) {
      if (cluster.height >= 300) {
        applyAppSpecificAdjustment(150, "code editor tall pane bonus");
      } else {
        applyAppSpecificAdjustment(-130, "code editor short strip penalty");
      }

      if (cluster.width >= 450) {
        applyAppSpecificAdjustment(120, "code editor useful width bonus");
      }

      if (cluster.x >= 220 && cluster.width >= 450 && cluster.height >= 250) {
        applyAppSpecificAdjustment(220, "code editor main editor pane bonus");
      }

      if (cluster.x < 180) {
        applyAppSpecificAdjustment(-420, "code editor left explorer/sidebar penalty");
      }

      if (cluster.x < sourceSize.width * 0.08) {
        applyAppSpecificAdjustment(-180, "code editor starts near app border penalty");
      }

      if (cluster.x + cluster.width < sourceSize.width * 0.92) {
        applyAppSpecificAdjustment(60, "code editor avoids far-right/minimap bonus");
      } else {
        applyAppSpecificAdjustment(-160, "code editor far-right/minimap penalty");
      }

      if (cluster.y > sourceSize.height * 0.65 || cluster.y + cluster.height > sourceSize.height * 0.96) {
        applyAppSpecificAdjustment(-140, "code editor bottom-only strip penalty");
      }
    }

    adjustmentLogs.forEach((logEntry) => {
      console.log("APP_SPECIFIC_RANKING_ADJUSTMENT", logEntry);
    });

    return Number(score.toFixed(2));
  }

  function prepareFinalSelectionPool(candidates) {
    return candidates
      .map((cluster) => ({
        ...cluster,
        finalSelectionScore: getFinalSelectionScore(cluster)
      }))
      .sort((first, second) => second.finalSelectionScore - first.finalSelectionScore);
  }

  const tallEligibleClusters = prepareFinalSelectionPool(readingAreaCandidates.filter((cluster) => cluster.height >= 220));
  const shortFallbackClusters = prepareFinalSelectionPool(readingAreaCandidates.filter((cluster) => cluster.height < 220));

  function isAppPreferredTallCluster(cluster) {
    const centerX = cluster.x + cluster.width / 2;
    const screenCenterX = sourceSize.width / 2;
    const centerDistance = Math.abs(centerX - screenCenterX) / Math.max(1, screenCenterX);
    const right = cluster.x + cluster.width;

    if (appContext.isBrowserLike) {
      return (
        cluster.height >= 350 &&
        cluster.width >= 350 &&
        cluster.width <= 950 &&
        cluster.x > sourceSize.width * 0.04 &&
        right < sourceSize.width * 0.96 &&
        centerDistance < 0.38 &&
        cluster.y >= 180
      );
    }

    if (appContext.isCodeEditor) {
      return (
        cluster.height >= 300 &&
        cluster.width >= 450 &&
        cluster.x >= 220 &&
        right < sourceSize.width * 0.92 &&
        cluster.y < sourceSize.height * 0.65 &&
        cluster.y + cluster.height < sourceSize.height * 0.96
      );
    }

    return false;
  }

  const appPreferredTallClusters = prepareFinalSelectionPool(tallEligibleClusters.filter(isAppPreferredTallCluster));
  function getAppSpecificDisqualification(cluster) {
    const right = cluster.x + cluster.width;

    if (appContext.isBrowserLike) {
      if (cluster.y < 180 && cluster.height < 180 && cluster.width > sourceSize.width * 0.7) {
        return "browser/document top header strip";
      }

      if (cluster.y < 140 && cluster.width > sourceSize.width * 0.75) {
        return "browser/document toolbar-wide region";
      }
    }

    if (appContext.isCodeEditor) {
      if (cluster.x < 180) {
        return "code editor left explorer/sidebar";
      }

      if (cluster.x > sourceSize.width * 0.72 || (right > sourceSize.width * 0.94 && cluster.width < 420)) {
        return "code editor far-right/minimap";
      }

      if (cluster.y > sourceSize.height * 0.65 || cluster.y + cluster.height > sourceSize.height * 0.96) {
        return "code editor bottom-only strip";
      }
    }

    return "";
  }

  const appSpecificClusterFilters = readingAreaCandidates.map((cluster) => ({
    clusterId: cluster.clusterId,
    x: cluster.x,
    y: cluster.y,
    width: cluster.width,
    height: cluster.height,
    disqualified: Boolean(getAppSpecificDisqualification(cluster)),
    reason: getAppSpecificDisqualification(cluster) || "usable"
  }));
  const usableTallClusters = tallEligibleClusters.filter((cluster) => !getAppSpecificDisqualification(cluster));
  const usableShortFallbackClusters = shortFallbackClusters.filter((cluster) => !getAppSpecificDisqualification(cluster));
  const canUseSimpleEditorMergedCluster = Boolean(
    simpleEditorMergedCluster &&
    (simpleEditorMergedCluster.height >= 220 || tallEligibleClusters.length === 0)
  );
  const selectedCluster = canUseSimpleEditorMergedCluster
    ? simpleEditorMergedCluster
    : appPreferredTallClusters[0] || usableTallClusters[0] || usableShortFallbackClusters[0] || tallEligibleClusters[0] || shortFallbackClusters[0] || null;
  const selectedFrom = selectedCluster && (
    selectedCluster.height >= 220 ||
    appPreferredTallClusters.some((cluster) => cluster.clusterId === selectedCluster.clusterId) ||
    usableTallClusters.some((cluster) => cluster.clusterId === selectedCluster.clusterId) ||
    tallEligibleClusters.some((cluster) => cluster.clusterId === selectedCluster.clusterId)
  )
    ? "tall"
    : "fallback";
  const selectedPool = selectedCluster && appPreferredTallClusters.some((cluster) => cluster.clusterId === selectedCluster.clusterId)
    ? appPreferredTallClusters
    : selectedCluster && usableTallClusters.some((cluster) => cluster.clusterId === selectedCluster.clusterId)
      ? usableTallClusters
      : selectedCluster && usableShortFallbackClusters.some((cluster) => cluster.clusterId === selectedCluster.clusterId)
        ? usableShortFallbackClusters
    : selectedFrom === "tall"
      ? tallEligibleClusters
      : shortFallbackClusters;
  const runnerUpCluster = selectedPool.find((cluster) => (
    !selectedCluster || cluster.clusterId !== selectedCluster.clusterId
  )) || readingAreaCandidates.find((cluster) => (
    !selectedCluster || cluster.clusterId !== selectedCluster.clusterId
  )) || null;

  function refineWideClusterHorizontally(cluster) {
    if (!cluster) {
      return {
        area: cluster,
        reason: "not refined: no selected cluster"
      };
    }

    if (cluster.clusterId === "notepad-merged") {
      return {
        area: cluster,
        reason: "not refined: simple editor merged reading area should keep full editor bounds"
      };
    }

    const sampleMinX = clampNumber(Math.round(cluster.x * sampleScale), 0, sampleWidth - 1);
    const sampleMaxX = clampNumber(Math.round((cluster.x + cluster.width) * sampleScale), 0, sampleWidth - 1);
    const sampleMinY = clampNumber(Math.round(cluster.y * sampleScale), 0, sampleHeight - 1);
    const sampleMaxY = clampNumber(Math.round((cluster.y + cluster.height) * sampleScale), 0, sampleHeight - 1);
    const sourceColumnWidth = 32;
    const sampleColumnWidth = Math.max(1, Math.round(sourceColumnWidth * sampleScale));
    const histogramColumnCount = Math.max(1, Math.ceil((sampleMaxX - sampleMinX + 1) / sampleColumnWidth));
    const columnCounts = Array(histogramColumnCount).fill(0);

    textPixels.forEach((pixel) => {
      if (
        pixel.x >= sampleMinX &&
        pixel.x <= sampleMaxX &&
        pixel.y >= sampleMinY &&
        pixel.y <= sampleMaxY
      ) {
        const columnIndex = clampNumber(
          Math.floor((pixel.x - sampleMinX) / sampleColumnWidth),
          0,
          histogramColumnCount - 1
        );
        columnCounts[columnIndex] += 1;
      }
    });

    const maxColumnCount = Math.max(...columnCounts);
    const activeThreshold = Math.ceil(maxColumnCount * 0.25);
    const activeColumns = columnCounts.map((count) => count >= activeThreshold && maxColumnCount > 0);
    const activeColumnRanges = [];
    let currentRange = null;

    activeColumns.forEach((active, columnIndex) => {
      if (active && !currentRange) {
        currentRange = {
          startColumn: columnIndex,
          endColumn: columnIndex,
          totalCount: columnCounts[columnIndex]
        };
        return;
      }

      if (active && currentRange) {
        currentRange.endColumn = columnIndex;
        currentRange.totalCount += columnCounts[columnIndex];
        return;
      }

      if (!active && currentRange) {
        activeColumnRanges.push(currentRange);
        currentRange = null;
      }
    });

    if (currentRange) {
      activeColumnRanges.push(currentRange);
    }

    const selectedColumnRange = activeColumnRanges
      .map((range) => ({
        ...range,
        columnSpan: range.endColumn - range.startColumn + 1
      }))
      .sort((first, second) => (
        second.columnSpan - first.columnSpan ||
        second.totalCount - first.totalCount
      ))[0] || null;

    const logColumnRange = (range) => {
      if (!range) {
        return null;
      }

      const startSampleX = sampleMinX + range.startColumn * sampleColumnWidth;
      const endSampleX = Math.min(sampleMaxX, sampleMinX + (range.endColumn + 1) * sampleColumnWidth - 1);

      return {
        startColumn: range.startColumn,
        endColumn: range.endColumn,
        columnSpan: range.columnSpan || (range.endColumn - range.startColumn + 1),
        totalCount: range.totalCount,
        x: Math.round(startSampleX * scaleBack),
        width: Math.round((endSampleX - startSampleX + 1) * scaleBack)
      };
    };

    console.log("TEXT_COLUMN_HISTOGRAM", {
      maxColumnCount,
      activeColumnRanges: activeColumnRanges.map(logColumnRange),
      selectedColumnRange: logColumnRange(selectedColumnRange)
    });

    if (!selectedColumnRange) {
      return {
        area: cluster,
        reason: "not refined: no active text column range survived"
      };
    }

    const padding = Math.round(40 * sampleScale);
    const rangeStartSampleX = sampleMinX + selectedColumnRange.startColumn * sampleColumnWidth;
    const rangeEndSampleX = Math.min(
      sampleMaxX + 1,
      sampleMinX + (selectedColumnRange.endColumn + 1) * sampleColumnWidth
    );
    const refinedSampleX = clampNumber(rangeStartSampleX - padding, sampleMinX, sampleMaxX);
    const refinedSampleRight = clampNumber(rangeEndSampleX + padding, sampleMinX + 1, sampleMaxX + 1);
    const refinedX = Math.round(refinedSampleX * scaleBack);
    const refinedWidth = Math.max(0, Math.round((refinedSampleRight - refinedSampleX) * scaleBack));

    if (refinedWidth < 350) {
      return {
        area: cluster,
        reason: "not refined: active column range would shrink below 350px"
      };
    }

    if (refinedWidth >= cluster.width * 0.96) {
      return {
        area: cluster,
        reason: "not refined: active column range already spans the selected width"
      };
    }

    return {
      area: {
        ...cluster,
        x: refinedX,
        width: refinedWidth
      },
      reason: "refined wide cluster to dense text columns with 40px padding"
    };
  }

  clusterRankingRows.forEach((row) => {
    row.selected = Boolean(selectedCluster && row.clusterId === selectedCluster.clusterId);
  });

  console.log("TEXT_CLUSTER_SUMMARY");
  console.log("activeCellCount", clusterPass.activeCellCount);
  console.log("clusterCount", allClusters.length);
  console.log("first 20 clusters");
  console.table(allClusters.slice(0, 20).map((cluster, index) => ({
    clusterId: index + 1,
    x: cluster.x,
    y: cluster.y,
    width: cluster.width,
    height: cluster.height,
    density: cluster.density,
    cellCount: cluster.cellCount,
    passName: cluster.passName
  })));
  console.log("acceptedClusterCount", acceptedClusterLogs.length);
  console.log("rejectedClusterCount", rejectedClusterLogs.length);
  console.log("CLUSTER_READING_ELIGIBILITY");
  console.table(clusterReadingEligibilityRows);
  console.log("CLUSTER_RANKING");
  console.table(clusterRankingRows.map((row) => ({
    clusterId: row.clusterId,
    rawScore: row.rawScore,
    penalties: row.penalties,
    finalScore: row.finalScore,
    selected: row.selected
  })));
  console.log("FINAL_SELECTION_POOL", {
    appSpecificClusterFilters,
    appPreferredTallClusters: appPreferredTallClusters.map((cluster) => ({
      clusterId: cluster.clusterId,
      x: cluster.x,
      y: cluster.y,
      width: cluster.width,
      height: cluster.height,
      score: cluster.finalSelectionScore
    })),
    tallEligibleClusters: tallEligibleClusters.map((cluster) => ({
      clusterId: cluster.clusterId,
      x: cluster.x,
      y: cluster.y,
      width: cluster.width,
      height: cluster.height,
      score: cluster.finalSelectionScore
    })),
    shortFallbackClusters: shortFallbackClusters.map((cluster) => ({
      clusterId: cluster.clusterId,
      x: cluster.x,
      y: cluster.y,
      width: cluster.width,
      height: cluster.height,
      score: cluster.finalSelectionScore
    })),
    selectedFrom,
    selectionPoolReason: appPreferredTallClusters.length > 0
      ? "app-preferred tall cluster available"
      : usableTallClusters.length > 0
        ? "usable generic tall cluster available"
        : tallEligibleClusters.length > 0
          ? "only app-disqualified tall clusters available"
        : "falling back because no tall cluster exists"
  });
  console.log("READING_AREA_FINAL_SELECTION", {
    selectedClusterId: selectedCluster?.clusterId || null,
    selectedScore: selectedCluster
      ? Number((selectedCluster.finalSelectionScore ?? selectedCluster.score).toFixed(2))
      : null,
    runnerUpClusterId: runnerUpCluster?.clusterId || null,
    runnerUpScore: runnerUpCluster
      ? Number((runnerUpCluster.finalSelectionScore ?? runnerUpCluster.score).toFixed(2))
      : null,
    reasonSelected: selectedCluster
      ? selectedCluster.tooBroad
        ? "selected broad fallback because no specific reading-eligible cluster survived"
        : "selected highest-ranked reading-eligible text/content cluster"
      : "no reading-eligible cluster survived"
  });
  console.log("WINNER_REASON", selectedCluster ? {
    clusterId: selectedCluster.clusterId,
    area: selectedCluster.width * selectedCluster.height,
    density: selectedCluster.density,
    cellCount: selectedCluster.cellCount,
    height: selectedCluster.height,
    width: selectedCluster.width,
    bonuses: selectedCluster.bonuses,
    penalties: selectedCluster.penalties,
    finalScore: Number((selectedCluster.finalSelectionScore ?? selectedCluster.score).toFixed(2))
  } : null);
  acceptedClusterLogs.forEach((cluster) => {
    const { score, tooBroad, confidence, ...logCluster } = cluster;
    console.log("Accepted cluster:", logCluster);
  });
  rejectedClusterLogs.forEach((cluster) => {
    console.log("Rejected cluster:", cluster);
  });

  if (selectedCluster) {
    const { score, tooBroad, confidence, rawScore, penalties, ...cluster } = selectedCluster;
    const refinedSelection = refineWideClusterHorizontally(cluster);
    const refinedCluster = refinedSelection.area;
    console.log("READING_AREA_REFINED", {
      before: getAreaBox(cluster),
      after: getAreaBox(refinedCluster),
      reason: refinedSelection.reason
    });

    return {
      type: "visual-text-cluster",
      name: "Local vision text cluster",
      source: "local-vision",
      x: refinedCluster.x,
      y: refinedCluster.y,
      width: refinedCluster.width,
      height: refinedCluster.height,
      confidence,
      reason: tooBroad
        ? "selected broad fallback because no specific cluster survived"
        : "selected specific text/content cluster"
    };
  }

  if (!textBounds) {
    return null;
  }

  return {
    type: "debug-text-bounds",
    name: "Debug text bounds",
    x: textBounds.x,
    y: textBounds.y,
    width: textBounds.width,
    height: textBounds.height,
    confidence: 50,
    source: "local-vision-debug",
    reason: "debug-only: text-like contrast bounds"
  };
}

function getLargestDocumentLikeArea(thumbnail, sourceSize) {
  if (!thumbnail || thumbnail.isEmpty()) {
    return null;
  }

  const maxSampleWidth = 240;
  const sampleScale = Math.min(1, maxSampleWidth / Math.max(1, sourceSize.width));
  const sampleWidth = Math.max(1, Math.round(sourceSize.width * sampleScale));
  const sampleHeight = Math.max(1, Math.round(sourceSize.height * sampleScale));
  const sampleImage = thumbnail.resize({
    width: sampleWidth,
    height: sampleHeight
  });
  const bitmap = sampleImage.toBitmap();
  const cellSize = 6;
  const columns = Math.ceil(sampleWidth / cellSize);
  const rows = Math.ceil(sampleHeight / cellSize);
  const cellBrightness = Array.from({ length: rows }, () => Array(columns).fill(0));
  const topToolbarLimit = Math.round(90 * sampleScale);
  let totalSampledPixels = 0;
  let brightPixelCount = 0;
  let darkPixelCount = 0;
  let contrastPixelCount = 0;
  let totalSampleBrightness = 0;
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let totalBrightness = 0;
      let pixelCount = 0;
      const startX = column * cellSize;
      const startY = row * cellSize;
      const endX = Math.min(sampleWidth, startX + cellSize);
      const endY = Math.min(sampleHeight, startY + cellSize);

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const index = (y * sampleWidth + x) * 4;
          const blue = bitmap[index];
          const green = bitmap[index + 1];
          const red = bitmap[index + 2];
          const brightness = (red + green + blue) / 3;
          totalBrightness += brightness;
          totalSampleBrightness += brightness;
          totalSampledPixels += 1;
          minBrightness = Math.min(minBrightness, brightness);
          maxBrightness = Math.max(maxBrightness, brightness);

          if (brightness >= 205) {
            brightPixelCount += 1;
          }

          if (brightness <= 112) {
            darkPixelCount += 1;
          }

          if (brightness >= 205 || brightness <= 112) {
            contrastPixelCount += 1;
          }

          pixelCount += 1;
        }
      }

      const averageBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
      cellBrightness[row][column] = averageBrightness;
    }
  }

  console.log("Local vision pixel diagnostics:", {
    totalSampledPixels,
    brightPixelCount,
    darkPixelCount,
    contrastPixelCount,
    averageBrightness: totalSampledPixels > 0
      ? Math.round(totalSampleBrightness / totalSampledPixels)
      : 0,
    minBrightness: Math.round(minBrightness),
    maxBrightness: Math.round(maxBrightness)
  });

  const screenArea = sourceSize.width * sourceSize.height;
  const scaleBack = sourceSize.width / sampleWidth;

  function getAverageNeighborBrightness(minRow, maxRow, minColumn, maxColumn) {
    let totalBrightness = 0;
    let count = 0;

    for (let row = Math.max(0, minRow - 2); row <= Math.min(rows - 1, maxRow + 2); row += 1) {
      for (let column = Math.max(0, minColumn - 2); column <= Math.min(columns - 1, maxColumn + 2); column += 1) {
        if (row >= minRow && row <= maxRow && column >= minColumn && column <= maxColumn) {
          continue;
        }

        totalBrightness += cellBrightness[row][column];
        count += 1;
      }
    }

    return count > 0 ? totalBrightness / count : 0;
  }

  function collectComponents(threshold, reason) {
    const eligibleCells = Array.from({ length: rows }, () => Array(columns).fill(false));
    const visited = Array.from({ length: rows }, () => Array(columns).fill(false));
    const candidates = [];
    const rejectionCounts = {
      "too small": 0,
      "too wide": 0,
      "too short": 0,
      "not bright enough": 0,
      "not enough contrast": 0,
      offscreen: 0,
      "toolbar-like": 0
    };
    let eligibleCellCount = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const isToolbarLike = row * cellSize <= topToolbarLimit;
        const isBrightEnough = cellBrightness[row][column] >= threshold;
        eligibleCells[row][column] = !isToolbarLike && isBrightEnough;

        if (eligibleCells[row][column]) {
          eligibleCellCount += 1;
        } else if (isToolbarLike) {
          rejectionCounts["toolbar-like"] += 1;
        } else {
          rejectionCounts["not bright enough"] += 1;
        }
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (!eligibleCells[row][column] || visited[row][column]) {
          continue;
        }

        const queue = [[row, column]];
        let minRow = row;
        let maxRow = row;
        let minColumn = column;
        let maxColumn = column;
        let brightnessTotal = 0;
        let count = 0;
        visited[row][column] = true;

        while (queue.length > 0) {
          const [currentRow, currentColumn] = queue.shift();
          minRow = Math.min(minRow, currentRow);
          maxRow = Math.max(maxRow, currentRow);
          minColumn = Math.min(minColumn, currentColumn);
          maxColumn = Math.max(maxColumn, currentColumn);
          brightnessTotal += cellBrightness[currentRow][currentColumn];
          count += 1;

          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([rowOffset, columnOffset]) => {
            const nextRow = currentRow + rowOffset;
            const nextColumn = currentColumn + columnOffset;

            if (
              nextRow >= 0 &&
              nextRow < rows &&
              nextColumn >= 0 &&
              nextColumn < columns &&
              eligibleCells[nextRow][nextColumn] &&
              !visited[nextRow][nextColumn]
            ) {
              visited[nextRow][nextColumn] = true;
              queue.push([nextRow, nextColumn]);
            }
          });
        }

        const sampleX = minColumn * cellSize;
        const sampleY = minRow * cellSize;
        const sampleRectWidth = Math.min(sampleWidth, (maxColumn + 1) * cellSize) - sampleX;
        const sampleRectHeight = Math.min(sampleHeight, (maxRow + 1) * cellSize) - sampleY;
        const x = Math.round(sampleX * scaleBack);
        const y = Math.round(sampleY * scaleBack);
        const width = Math.round(sampleRectWidth * scaleBack);
        const height = Math.round(sampleRectHeight * scaleBack);
        const area = width * height;

        if (x < 0 || y < 0 || x > sourceSize.width || y > sourceSize.height) {
          rejectionCounts.offscreen += 1;
          continue;
        }

        if (y < 80) {
          rejectionCounts["toolbar-like"] += 1;
          continue;
        }

        if (width < 160 || area < screenArea * 0.012) {
          rejectionCounts["too small"] += 1;
          continue;
        }

        if (height < 150) {
          rejectionCounts["too short"] += 1;
          continue;
        }

        if (area > screenArea * 0.94 || width > sourceSize.width * 0.94) {
          rejectionCounts["too wide"] += 1;
          continue;
        }

        const averageBrightness = brightnessTotal / Math.max(1, count);
        const neighborBrightness = getAverageNeighborBrightness(minRow, maxRow, minColumn, maxColumn);
        const contrast = averageBrightness - neighborBrightness;
        const widthRatio = width / Math.max(1, sourceSize.width);
        const heightRatio = height / Math.max(1, sourceSize.height);
        const aspectRatio = width / Math.max(1, height);
        const horizontalCenter = x + width / 2;
        const distanceFromCenter = Math.abs(horizontalCenter - sourceSize.width / 2) / Math.max(1, sourceSize.width / 2);
        const hasSideMargins = x > sourceSize.width * 0.06 && (x + width) < sourceSize.width * 0.94;
        const startsAtLeftEdge = x <= 6;
        const coversBroadWidth = widthRatio > 0.8;
        const coversAlmostFullWidth = widthRatio > 0.92;
        const isTopChromeLike = y < 120 && height < sourceSize.height * 0.45;
        const isTooWide = widthRatio > 0.82;
        const isTooShort = heightRatio < 0.22;
        let score = 35;
        const reasons = [reason];

        score += Math.round((1 - distanceFromCenter) * 24);
        reasons.push("centered horizontally");

        if (widthRatio >= 0.35 && widthRatio <= 0.75) {
          score += 26;
          reasons.push("document width range");
        } else if (widthRatio >= 0.22 && widthRatio < 0.35) {
          score += 10;
          reasons.push("narrow reading column");
        } else if (widthRatio > 0.75 && widthRatio <= 0.82) {
          score += 4;
          reasons.push("wide content column");
        }

        if (heightRatio > 0.35) {
          score += 18;
          reasons.push("tall reading region");
        }

        if (contrast > 18) {
          score += 18;
          reasons.push("bright interior with border contrast");
        } else if (contrast > 8) {
          score += 8;
          reasons.push("some border contrast");
        } else {
          rejectionCounts["not enough contrast"] += 1;
          reasons.push("diagnostic: not enough contrast");
        }

        if (aspectRatio >= 0.45 && aspectRatio <= 1.65) {
          score += 22;
          reasons.push("portrait/document-shaped");
        } else if (aspectRatio > 1.65 && aspectRatio <= 2.4) {
          score += 6;
          reasons.push("wide readable content");
        } else {
          score -= 12;
          reasons.push("weak document shape");
        }

        if (hasSideMargins) {
          score += 16;
          reasons.push("left and right margins");
        }

        if (threshold >= 232) {
          score += 14;
          reasons.push("high-brightness inner region");
        }

        if (startsAtLeftEdge) {
          score -= 32;
          reasons.push("penalty: starts at x=0");
        }

        if (coversBroadWidth) {
          score -= 30;
          reasons.push("penalty: covers more than 80% width");
        }

        if (coversAlmostFullWidth) {
          score -= 24;
          reasons.push("penalty: almost full screen width");
        }

        if (isTopChromeLike) {
          score -= 24;
          reasons.push("penalty: includes browser toolbar/top chrome");
        }

        if (isTooShort) {
          score -= 18;
          reasons.push("penalty: too short");
        }

        if (isTooWide) {
          score -= 16;
          reasons.push("penalty: too wide");
        }

        const confidence = clampNumber(Math.round(score), 20, 96);

        candidates.push({
          type: "visual-reading-region",
          name: "Local vision reading region",
          x,
          y,
          width,
          height,
          confidence,
          source: "local-vision",
          area,
          reason: reasons.join("; ")
        });
      }
    }

    console.log(`Local vision candidate rejection reasons (${reason}, threshold ${threshold}):`, {
      ...rejectionCounts,
      eligibleCellCount,
      acceptedCandidates: candidates.length
    });

    return candidates;
  }

  function detectTextBlockInRegion(region) {
    if (!region) {
      return null;
    }

    console.log("original visual region:", {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      confidence: region.confidence
    });

    const gridCellSize = 32;
    const gridCols = Math.ceil(sourceSize.width / gridCellSize);
    const gridRows = Math.ceil(sourceSize.height / gridCellSize);
    
    // Scale factor to map screen pixels to downsampled thumbnail pixels
    const cellWidthDs = gridCellSize * (sampleWidth / sourceSize.width);
    const cellHeightDs = gridCellSize * (sampleHeight / sourceSize.height);

    const cellActive = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));

    // 1 & 2. Create coarse grid and count text-like pixels per cell
    for (let r = 0; r < gridRows; r += 1) {
      for (let c = 0; c < gridCols; c += 1) {
        const startX = Math.floor(c * cellWidthDs);
        const startY = Math.floor(r * cellHeightDs);
        const endX = Math.min(sampleWidth, Math.ceil((c + 1) * cellWidthDs));
        const endY = Math.min(sampleHeight, Math.ceil((r + 1) * cellHeightDs));

        if (endX <= startX || endY <= startY) {
          continue;
        }

        let darkPixels = 0;
        let brightPixels = 0;
        let pixelCount = 0;
        let minB = 255;
        let maxB = 0;
        let sumB = 0;
        const cellPixels = [];

        for (let y = startY; y < endY; y += 1) {
          for (let x = startX; x < endX; x += 1) {
            const index = (y * sampleWidth + x) * 4;
            const blue = bitmap[index];
            const green = bitmap[index + 1];
            const red = bitmap[index + 2];
            const brightness = (red + green + blue) / 3;

            cellPixels.push(brightness);
            if (brightness < minB) minB = brightness;
            if (brightness > maxB) maxB = brightness;
            sumB += brightness;

            if (brightness < 120) {
              darkPixels += 1;
            }
            if (brightness > 140) {
              brightPixels += 1;
            }
            pixelCount += 1;
          }
        }

        const cellContrast = maxB - minB;
        let textLikeCount = 0;

        if (cellContrast >= 45 && pixelCount > 0) {
          const avgB = sumB / pixelCount;
          for (const b of cellPixels) {
            if (avgB > 127) {
              if (b < 120) textLikeCount += 1;
            } else {
              if (b > 140) textLikeCount += 1;
            }
          }
        }

        const textDensity = pixelCount > 0 ? textLikeCount / pixelCount : 0;

        // 3. Mark cell active only if textDensity > threshold (e.g. 0.05)
        if (textDensity >= 0.05) {
          cellActive[r][c] = true;
        }
      }
    }

    // 4. Flood-fill neighboring active cells into clusters (8-connectivity)
    const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
    const rawClusters = [];

    for (let r = 0; r < gridRows; r += 1) {
      for (let c = 0; c < gridCols; c += 1) {
        if (cellActive[r][c] && !visited[r][c]) {
          const clusterCells = [];
          const queue = [[r, c]];
          visited[r][c] = true;

          while (queue.length > 0) {
            const [currR, currC] = queue.shift();
            clusterCells.push([currR, currC]);

            for (let dr = -1; dr <= 1; dr += 1) {
              for (let dc = -1; dc <= 1; dc += 1) {
                if (dr === 0 && dc === 0) continue;
                const nr = currR + dr;
                const nc = currC + dc;

                if (
                  nr >= 0 &&
                  nr < gridRows &&
                  nc >= 0 &&
                  nc < gridCols &&
                  cellActive[nr][nc] &&
                  !visited[nr][nc]
                ) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }
          rawClusters.push(clusterCells);
        }
      }
    }

    const screenArea = sourceSize.width * sourceSize.height;
    const allClusters = [];

    // 5. For each cluster calculate: x, y, width, height, area, density
    for (const clusterCells of rawClusters) {
      let minR = gridRows;
      let maxR = -1;
      let minC = gridCols;
      let maxC = -1;

      for (const [r, c] of clusterCells) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }

      const cellHeight = maxR - minR + 1;
      const cellWidth = maxC - minC + 1;

      const x = minC * gridCellSize;
      const y = minR * gridCellSize;
      const width = Math.min(sourceSize.width - x, cellWidth * gridCellSize);
      const height = Math.min(sourceSize.height - y, cellHeight * gridCellSize);
      const area = width * height;

      const bboxCells = cellHeight * cellWidth;
      const density = clusterCells.length / bboxCells;

      allClusters.push({
        x,
        y,
        width,
        height,
        area,
        density,
        cellHeight,
        cellWidth,
        cellCount: clusterCells.length,
        clusterCells
      });
    }

    console.log("TEXT_CLUSTER_SUMMARY");
    console.log(`clusterCount = ${allClusters.length}`);
    if (allClusters.length > 0) {
      console.table(allClusters.slice(0, 20).map((cluster, index) => ({
        clusterId: index + 1,
        x: cluster.x,
        y: cluster.y,
        width: cluster.width,
        height: cluster.height,
        density: Number(cluster.density.toFixed(3)),
        cellCount: cluster.cellCount
      })));
      console.log("reason clustering terminated:", "raw text-density clusters created; continuing to existing rejection/ranking logic");
    } else {
      console.log("No clusters created.");
      console.log("reason clustering terminated:", "no neighboring active text-density cells were found after flood-fill");
    }

    // 6. Reject clusters
    const validClusters = [];
    let rejectedCount = 0;
    let acceptedCount = 0;
    const clusterDebugRows = [];

    for (const [index, cluster] of allClusters.entries()) {
      let rejectedReason = "";

      // Reject if in top 12% of screen
      if (cluster.y < sourceSize.height * 0.12) {
        rejectedReason = "top toolbar region";
      }

      // Reject if in bottom 8% of screen
      if (!rejectedReason && (cluster.y + cluster.height) > sourceSize.height * 0.92) {
        rejectedReason = "bottom system/status region";
      }

      // Reject if smaller than 3 cells
      if (!rejectedReason && cluster.clusterCells.length < 3) {
        rejectedReason = "too small";
      }

      // Reject if very thin horizontal strips
      const isThinHorizontal = (cluster.cellHeight === 1 && cluster.cellWidth >= 3) || 
                               (cluster.height <= 64 && cluster.width / cluster.height > 8);
      if (!rejectedReason && isThinHorizontal) {
        rejectedReason = "thin horizontal strip";
      }

      // Reject if very thin vertical strips
      const isThinVertical = (cluster.cellWidth === 1 && cluster.cellHeight >= 3) || 
                             (cluster.width <= 64 && cluster.height / cluster.width > 8);
      if (!rejectedReason && isThinVertical) {
        rejectedReason = "thin vertical strip";
      }

      const debugRow = {
        clusterId: index + 1,
        x: cluster.x,
        y: cluster.y,
        width: cluster.width,
        height: cluster.height,
        density: Number(cluster.density.toFixed(3)),
        cellCount: cluster.cellCount,
        status: rejectedReason ? "rejected" : "accepted",
        reason: rejectedReason || "accepted"
      };
      clusterDebugRows.push(debugRow);

      if (rejectedReason) {
        rejectedCount += 1;
        console.log(`Rejected cluster ${index + 1}:`);
        console.log("reason:", rejectedReason);
        console.log(debugRow);
        continue;
      }

      acceptedCount += 1;
      console.log("Accepted cluster:");
      console.log(debugRow);
      validClusters.push(cluster);
    }

    const rejectedClusterLogs = clusterDebugRows
      .filter((cluster) => cluster.status === "rejected")
      .map((cluster) => ({
        x: cluster.x,
        y: cluster.y,
        width: cluster.width,
        height: cluster.height,
        density: cluster.density,
        cellCount: cluster.cellCount,
        rejectionReason: cluster.reason
      }));
    const acceptedClusterLogs = clusterDebugRows
      .filter((cluster) => cluster.status === "accepted")
      .map((cluster) => ({
        x: cluster.x,
        y: cluster.y,
        width: cluster.width,
        height: cluster.height,
        density: cluster.density,
        cellCount: cluster.cellCount
      }));

    console.log("TEXT_CLUSTER_SUMMARY:");
    console.log("clusterCount:", allClusters.length);
    console.log("acceptedClusterCount:", acceptedClusterLogs.length);
    console.log("rejectedClusterCount:", rejectedClusterLogs.length);
    rejectedClusterLogs.forEach((cluster) => {
      console.log("Rejected cluster:", cluster);
    });
    acceptedClusterLogs.forEach((cluster) => {
      console.log("Accepted cluster:", cluster);
    });

    // 7. Rank clusters
    for (const cluster of validClusters) {
      let score = 0;

      // + large area
      const areaRatio = cluster.area / screenArea;
      score += areaRatio * 100;

      // + high density
      score += cluster.density * 50;

      // + near center
      const centerX = cluster.x + cluster.width / 2;
      const centerY = cluster.y + cluster.height / 2;
      const screenCenterX = sourceSize.width / 2;
      const screenCenterY = sourceSize.height / 2;
      const distanceX = Math.abs(centerX - screenCenterX) / screenCenterX;
      const distanceY = Math.abs(centerY - screenCenterY) / screenCenterY;
      const distanceToCenter = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      score += (1 - Math.min(1, distanceToCenter)) * 30;

      // + document-like aspect ratio
      const aspect = cluster.width / cluster.height;
      if (aspect >= 0.5 && aspect <= 2.0) {
        score += 20;
      } else if (aspect > 2.0 && aspect <= 4.0) {
        score += 8;
      }

      cluster.score = score;
    }

    // 9. Log TEXT_CLUSTER_DEBUG
    console.log("TEXT_CLUSTER_DEBUG");
    console.table(clusterDebugRows);
    console.log("TEXT_CLUSTER_SUMMARY", {
      candidateCount: allClusters.length,
      rejectedCount,
      acceptedCount
    });

    if (validClusters.length === 0) {
      console.log("selected cluster:", null);
      return null;
    }

    // Sort descending
    validClusters.sort((a, b) => b.score - a.score);
    const bestCluster = validClusters[0];

    // 8. Return best cluster
    const confidence = 105;

    const result = {
      type: "visual-text-cluster",
      name: "Local vision text cluster",
      x: bestCluster.x,
      y: bestCluster.y,
      width: bestCluster.width,
      height: bestCluster.height,
      confidence: confidence,
      source: "local-vision"
    };

    console.log("selected cluster:", result);
    return result;
  }

  const candidates = [
    ...collectComponents(205, "broad bright/content region"),
    ...collectComponents(232, "specific bright document/page region")
  ].sort((first, second) => (
    second.confidence - first.confidence ||
    second.area - first.area
  ));

  console.log("Local vision candidates:");
  console.table(candidates.slice(0, 8).map((candidate) => ({
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
    confidence: candidate.confidence,
    reason: candidate.reason
  })));

  if (!candidates[0]) {
    console.log("Local vision text blocks detected: 0");
    console.log("Selected visual text block:", null);
    return null;
  }

  const { area, reason, ...layoutArea } = candidates[0];
  const textBlock = detectTextBlockInRegion(layoutArea);
  const finalLocalVisionResult = textBlock || layoutArea;
  console.log("LOG_FINAL_LOCAL_VISION_RESULT:", formatAreaTrace(finalLocalVisionResult));
  return finalLocalVisionResult;
}

// IPC lets the private main process run local Windows commands while the UI stays sandboxed.
ipcMain.handle("scan-active-window", async () => {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-ExecutionPolicy", "Bypass", "-File", activeWindowScript],
      { cwd: scriptBasePath, windowsHide: true, timeout: 12000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve(createSafeScanError(stderr || error.message));
          return;
        }

        try {
          const result = parsePowerShellJson(stdout);
          latestActiveWindowState = {
            activeApp: result.activeApp || "",
            windowTitle: result.windowTitle || ""
          };
          resolve(result);
        } catch (parseError) {
          resolve(createSafeScanError(parseError.message));
        }
      }
    );
  });
});

ipcMain.handle("scan-ui-automation", async () => {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-ExecutionPolicy", "Bypass", "-File", uiAutomationScript],
      { cwd: scriptBasePath, windowsHide: true, timeout: 18000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve(createSafeUIScanError(stderr || error.message));
          return;
        }

        try {
          const result = parsePowerShellJson(stdout);
          resolve(result);
        } catch (parseError) {
          resolve(createSafeUIScanError(parseError.message));
        }
      }
    );
  });
});

ipcMain.handle("diagnose-ui-automation", async () => {
  const command = "powershell.exe";
  const args = ["-ExecutionPolicy", "Bypass", "-File", uiAutomationScript];
  const exactCommand = `${command} ${args.map((arg) => `"${arg}"`).join(" ")}`;
  const scriptExists = fs.existsSync(uiAutomationScript);

  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { cwd: scriptBasePath, windowsHide: true, timeout: 18000 },
      (error, stdout, stderr) => {
        let parsed = null;
        let parseError = "";

        try {
          parsed = parsePowerShellJson(stdout || "");
        } catch (caughtError) {
          parseError = caughtError.message;
        }

        resolve({
          scriptPath: uiAutomationScript,
          scriptExists,
          command: exactCommand,
          exitCode: error && typeof error.code !== "undefined" ? error.code : 0,
          rawStdoutLength: stdout ? stdout.length : 0,
          rawStdoutPreview: stdout ? stdout.slice(0, 1000) : "",
          rawStderr: stderr || "",
          powerShellError: error ? error.message : "",
          parseError,
          activeApp: parsed?.activeApp || "Unavailable",
          windowTitle: parsed?.windowTitle || "Unavailable",
          parsedElementCount: Array.isArray(parsed?.elements)
            ? parsed.elements.length
            : Number(parsed?.elementCount || 0),
          caret: parsed?.caret || {
            available: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            sourceControlType: "",
            sourceName: ""
          },
          firstTenElements: Array.isArray(parsed?.elements)
            ? parsed.elements.slice(0, 10)
            : [],
          parsed
        });
      }
    );
  });
});

ipcMain.handle("analyze-local-layout", async () => {
  if (!localVisionEnabled) {
    return {
      enabled: false,
      usedScreenshot: false,
      savedScreenshot: false,
      uploadedScreenshot: false,
      layoutAreas: []
    };
  }

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const thumbnailSize = {
      width: Math.max(1, Math.round(primaryDisplay.size.width)),
      height: Math.max(1, Math.round(primaryDisplay.size.height))
    };
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize
    });
    const primarySource = sources.find((source) => (
      String(source.display_id || "") === String(primaryDisplay.id || "")
    )) || sources[0];
    const thumbnail = primarySource?.thumbnail;
    const size = thumbnail && !thumbnail.isEmpty()
      ? thumbnail.getSize()
      : { width: 0, height: 0 };
    console.log("Local vision screenshot metadata:", {
      sourceCount: sources.length,
      selectedSourceName: primarySource?.name || "Unavailable",
      selectedSourceId: primarySource?.id || "Unavailable",
      thumbnailWidth: size.width,
      thumbnailHeight: size.height,
      primaryDisplayScaleFactor: primaryDisplay.scaleFactor,
      primaryDisplayBounds: primaryDisplay.bounds,
      captureSizeRequested: thumbnailSize
    });
    const largestLayoutArea = thumbnail && !thumbnail.isEmpty()
      ? getLargestDocumentLikeArea(thumbnail, size)
      : null;
    const debugTextBoundsArea = thumbnail && !thumbnail.isEmpty()
      ? detectDebugTextBounds(thumbnail, size)
      : null;
    const captureSucceeded = Boolean(thumbnail && !thumbnail.isEmpty() && size.width > 0 && size.height > 0);
    const fallbackLayoutArea = captureSucceeded && !largestLayoutArea && !debugTextBoundsArea
      ? createLocalVisionSafeCenterArea(size)
      : null;
    const layoutAreas = debugTextBoundsArea
      ? [debugTextBoundsArea]
      : largestLayoutArea
      ? [largestLayoutArea]
      : fallbackLayoutArea
        ? [fallbackLayoutArea]
        : [];

    if (debugTextBoundsArea) {
      console.log("Local vision debug text bounds area returned:", formatAreaTrace(debugTextBoundsArea));
    }

    if (fallbackLayoutArea) {
      console.log("Local vision fallback area returned:", formatAreaTrace(fallbackLayoutArea));
    }

    console.log(`Local vision areas detected: ${layoutAreas.length}`);

    // The screenshot thumbnail exists only as an in-memory NativeImage in this
    // function. AURA does not save it, upload it, send it to AI, or expose image
    // bytes to the renderer. Only rectangles/metadata are returned.
    return {
      enabled: true,
      usedScreenshot: Boolean(thumbnail && !thumbnail.isEmpty()),
      savedScreenshot: false,
      uploadedScreenshot: false,
      width: size.width,
      height: size.height,
      layoutAreas
    };
  } catch (error) {
    console.warn("Local vision analysis failed:", error.message);
    return {
      enabled: true,
      usedScreenshot: false,
      savedScreenshot: false,
      uploadedScreenshot: false,
      width: 0,
      height: 0,
      layoutAreas: [],
      error: error.message
    };
  }
});

ipcMain.handle("enable-local-vision-testing", () => {
  // Developer-only session helper. This does not persist, does not add a public
  // setting, and resets when AURA restarts.
  localVisionEnabled = true;
  console.info("Local vision enabled for this app session only.");

  return {
    enabled: localVisionEnabled,
    persisted: false
  };
});

function sendOverlayUpdate() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  if (overlayWindow.webContents.isLoading()) {
    overlayWindow.webContents.once("did-finish-load", sendOverlayUpdate);
    return;
  }

  console.log("Forwarding overlay update:", latestOverlayState);
  console.log("LOG_PRIMARY_AREA_BEFORE_OVERLAY_FORWARD:", latestOverlayState.primaryReadingArea);
  console.log("Forwarding overlay primaryReadingArea exists:", Boolean(latestOverlayState.primaryReadingArea));
  console.log("LOG_MAIN_FORWARD_PRIMARY_AREA:", formatAreaTrace(latestOverlayState.primaryReadingArea));
  overlayWindow.webContents.send("overlay-update", latestOverlayState);
}

function sendInputActivity(reason) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  console.log("AURA input activity detected:", reason);
  mainWindow.webContents.send("input-activity", { reason });
}

function startInputWatcher() {
  if (process.platform !== "win32" || inputWatcherProcess) {
    return;
  }

  inputWatcherProcess = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", inputWatcherScript],
    { windowsHide: true }
  );

  let stdoutBuffer = "";
  inputWatcherProcess.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || "";

    lines.forEach((line) => {
      const reason = line.trim();

      if (
        reason === "scroll activity" ||
        reason === "mouse activity" ||
        reason === "keyboard navigation"
      ) {
        sendInputActivity(reason);
      }
    });
  });

  inputWatcherProcess.stderr.on("data", (chunk) => {
    console.warn("AURA input watcher warning:", chunk.toString().trim());
  });

  inputWatcherProcess.on("exit", (code) => {
    console.warn("AURA input watcher stopped:", code);
    inputWatcherProcess = null;
  });
}

function stopInputWatcher() {
  if (!inputWatcherProcess) {
    return;
  }

  inputWatcherProcess.kill();
  inputWatcherProcess = null;
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));

  overlayWindow.webContents.once("did-finish-load", sendOverlayUpdate);
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}

function ensureOverlayWindow() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
  }
}

ipcMain.handle("overlay-show", () => {
  ensureOverlayWindow();
  overlayWindow.showInactive();
  overlayWindow.setIgnoreMouseEvents(true);
  sendOverlayUpdate();
});

ipcMain.handle("overlay-hide", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

ipcMain.handle("overlay-update", (_event, overlayState) => {
  const detectionMode = ["dynamic", "general"].includes(overlayState?.detectionMode)
    ? overlayState.detectionMode
    : "dynamic";

  latestOverlayState = {
    mode: overlayState?.mode || "voyager",
    detectionMode,
    profileName: overlayState?.profileName || "Default Accessibility Profile",
    filterClass: overlayState?.filterClass || "filter-default",
    activeApp: overlayState?.activeApp || "Waiting",
    colorVisionProfile: overlayState?.colorVisionProfile || "contrast-boost",
    selectedColorVisionProfile: overlayState?.selectedColorVisionProfile || overlayState?.colorVisionProfile || "contrast-boost",
    eyeStrainProfile: overlayState?.eyeStrainProfile || "warm-comfort",
    selectedEyeStrainProfile: overlayState?.selectedEyeStrainProfile || overlayState?.eyeStrainProfile || "warm-comfort",
    lowVisionProfile: overlayState?.lowVisionProfile || "high-contrast",
    selectedLowVisionProfile: overlayState?.selectedLowVisionProfile || overlayState?.lowVisionProfile || "high-contrast",
    filterIntensity: Number.isFinite(Number(overlayState?.filterIntensity))
      ? Number(overlayState.filterIntensity)
      : 60,
    screenEnforcementActive: overlayState?.screenEnforcementActive === true,
    scanStatus: detectionMode === "general" && overlayState?.screenEnforcementActive === true
      ? "General support active"
      : overlayState?.scanStatus || "Waiting",
    enforcementAreas: Array.isArray(overlayState?.enforcementAreas)
      ? overlayState.enforcementAreas
      : [],
    primaryReadingArea: detectionMode === "general" ? null : overlayState?.primaryReadingArea || null,
    uiAutomationUsed: overlayState?.uiAutomationUsed === true,
    elementCount: Number.isFinite(Number(overlayState?.elementCount))
      ? Number(overlayState.elementCount)
      : 0,
    importantElementCount: Number.isFinite(Number(overlayState?.importantElementCount))
      ? Number(overlayState.importantElementCount)
      : 0,
    detectionStatus: detectionMode === "general" ? "general-support" : overlayState?.detectionStatus || "general-support"
  };

  sendOverlayUpdate();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#020514",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.on("closed", () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }

    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  createOverlayWindow();
  startInputWatcher();
  globalShortcut.register("CommandOrControl+Alt+A", () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("emergency-stop");
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  stopInputWatcher();
  globalShortcut.unregisterAll();
});
