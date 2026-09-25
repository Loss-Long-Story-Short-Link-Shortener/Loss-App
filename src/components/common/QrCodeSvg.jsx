import { useMemo } from "react";
import { generateQrMatrix } from "../../utils/qrGenerator";
import { SHORT_LINK_BASE_URL } from "../../constants/domains";

export function QrCodeSvg({
  value,
  size = 140,
  fgColor = "#0f172a",
  bgColor = "#ffffff",
  className = "",
  id = "qr-svg",
  errorCorrectionLevel = "L",
  padding = 2,
  showCenterLogo = false,
  centerLogoUrl = "/loss.png",
}) {
  // If center logo is shown, error correction level must be at least Q or H to preserve scan reliability
  const effectiveEcLevel = showCenterLogo
    ? errorCorrectionLevel === "L" || errorCorrectionLevel === "M"
      ? "Q"
      : errorCorrectionLevel
    : errorCorrectionLevel;

  const qrData = useMemo(() => {
    try {
      return generateQrMatrix(value || SHORT_LINK_BASE_URL, {
        errorCorrectionLevel: effectiveEcLevel,
      });
    } catch {
      return generateQrMatrix(SHORT_LINK_BASE_URL, {
        errorCorrectionLevel: effectiveEcLevel,
      });
    }
  }, [value, effectiveEcLevel]);

  const { size: matrixSize, matrix } = qrData;
  const totalGrid = matrixSize + padding * 2;

  // If showing center logo, define the center exclusion zone in grid coordinates
  const logoCenterRadius = Math.floor(matrixSize * 0.18);
  const mid = Math.floor(matrixSize / 2);

  // Build SVG path
  const pathD = useMemo(() => {
    let d = "";
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (matrix[r][c]) {
          // If center logo is enabled, avoid drawing modules inside the center logo circle/box
          if (
            showCenterLogo &&
            r >= mid - logoCenterRadius &&
            r <= mid + logoCenterRadius &&
            c >= mid - logoCenterRadius &&
            c <= mid + logoCenterRadius
          ) {
            continue;
          }

          const x = c + padding;
          const y = r + padding;
          d += `M${x},${y}h1v1h-1z `;
        }
      }
    }
    return d;
  }, [matrix, matrixSize, showCenterLogo, mid, logoCenterRadius, padding]);

  // Center logo placement
  const logoBoxSize = logoCenterRadius * 2 + 1.5;
  const logoX = padding + mid - logoCenterRadius - 0.25;
  const logoY = padding + mid - logoCenterRadius - 0.25;

  return (
    <svg
      id={id}
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${totalGrid} ${totalGrid}`}
      style={{
        background: bgColor,
        borderRadius: "8px",
        display: "block",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={pathD} fill={fgColor} />

      {showCenterLogo && (
        <g>
          {/* Logo badge background for maximum contrast */}
          <rect
            x={logoX}
            y={logoY}
            width={logoBoxSize}
            height={logoBoxSize}
            rx={logoBoxSize * 0.22}
            ry={logoBoxSize * 0.22}
            fill={bgColor}
            stroke={fgColor}
            strokeWidth="0.3"
          />
          {/* Embedded logo image */}
          <image
            x={logoX + logoBoxSize * 0.15}
            y={logoY + logoBoxSize * 0.15}
            width={logoBoxSize * 0.7}
            height={logoBoxSize * 0.7}
            href={centerLogoUrl}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      )}
    </svg>
  );
}

/**
 * Downloads the QR SVG as a standalone, scalable vector file.
 */
export function downloadQrSvg(id, filename = "qr-code.svg") {
  const svgEl = document.getElementById(id);
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports the QR code to an ultra-high resolution raster PNG (default 2400x2400 for 300 DPI print).
 */
export function downloadQrPng(id, filename = "qr-code.png", exportSize = 2400) {
  const svgEl = document.getElementById(id);
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const canvas = document.createElement("canvas");
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d");

  // Fill canvas background to avoid transparent black artifacts on some printers
  ctx.fillStyle = svgEl.style.backgroundColor || "#ffffff";
  ctx.fillRect(0, 0, exportSize, exportSize);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  img.onload = () => {
    ctx.drawImage(img, 0, 0, exportSize, exportSize);
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    link.click();
  };
}
