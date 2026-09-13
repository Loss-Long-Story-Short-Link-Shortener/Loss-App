import { useMemo } from "react";
import { generateQrMatrix } from "../../utils/qrGenerator";

export function QrCodeSvg({
  value,
  size = 140,
  fgColor = "#0f172a",
  bgColor = "#ffffff",
  className = "",
  id = "qr-svg",
}) {
  const qrData = useMemo(() => {
    try {
      return generateQrMatrix(value || "https://go.consolaktif.com.tr");
    } catch {
      return generateQrMatrix("https://go.consolaktif.com.tr");
    }
  }, [value]);

  const { size: matrixSize, matrix } = qrData;
  const padding = 2; // quiet zone
  const totalGrid = matrixSize + padding * 2;

  // Build SVG path
  const pathD = useMemo(() => {
    let d = "";
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (matrix[r][c]) {
          const x = c + padding;
          const y = r + padding;
          d += `M${x},${y}h1v1h-1z `;
        }
      }
    }
    return d;
  }, [matrix, matrixSize]);

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
    </svg>
  );
}

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

export function downloadQrPng(id, filename = "qr-code.png", exportSize = 800) {
  const svgEl = document.getElementById(id);
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const canvas = document.createElement("canvas");
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  img.onload = () => {
    ctx.drawImage(img, 0, 0, exportSize, exportSize);
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    link.click();
  };
}
