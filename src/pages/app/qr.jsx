import { useMemo } from "react";
import QRCode from "qrcode";

/** Build the module matrix (array of booleans) for a value. */
export function qrMatrix(value, ecc = "M") {
  const qr = QRCode.create(value || " ", { errorCorrectionLevel: ecc });
  const n = qr.modules.size;
  const data = qr.modules.data;
  return { size: n, get: (r, c) => Boolean(data[r * n + c]) };
}

const inFinder = (r, c, n) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

/**
 * SVG string for a QR code. `shape`: square | rounded | dots. A center logo is
 * only added with error-correction H so the code stays scannable.
 */
export function qrSvgString(value, { fg = "#111111", bg = "#ffffff", shape = "square", margin = 2, logo = false, size = 256 } = {}) {
  const ecc = logo ? "H" : "M";
  const m = qrMatrix(value, ecc);
  const n = m.size;
  const total = n + margin * 2;
  const parts = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!m.get(r, c)) continue;
      const x = c + margin, y = r + margin;
      if (shape === "dots" && !inFinder(r, c, n)) parts.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42"/>`);
      else if (shape === "rounded" && !inFinder(r, c, n)) parts.push(`<rect x="${x + 0.04}" y="${y + 0.04}" width="0.92" height="0.92" rx="0.3"/>`);
      else parts.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`);
    }
  }
  let logoSvg = "";
  if (logo) {
    const s = Math.round(n * 0.22);
    const x = total / 2 - s / 2;
    logoSvg = `<rect x="${x - 0.6}" y="${x - 0.6}" width="${s + 1.2}" height="${s + 1.2}" rx="1.2" fill="${bg}"/><rect x="${x}" y="${x}" width="${s}" height="${s}" rx="1" fill="#2f5bff"/><path d="M${x + s * 0.34} ${x + s * 0.66}l${s * 0.32}-${s * 0.32}M${x + s * 0.38} ${x + s * 0.3}l${s * 0.06}-${s * 0.06}a${s * 0.18} ${s * 0.18} 0 0 1 ${s * 0.26} ${s * 0.26}l-${s * 0.06} ${s * 0.06}M${x + s * 0.62} ${x + s * 0.7}l-${s * 0.06} ${s * 0.06}a${s * 0.18} ${s * 0.18} 0 0 1-${s * 0.26}-${s * 0.26}l${s * 0.06}-${s * 0.06}" fill="none" stroke="#fff" stroke-width="${s * 0.09}" stroke-linecap="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="${shape === "square" ? "crispEdges" : "geometricPrecision"}"><rect width="${total}" height="${total}" fill="${bg}"/><g fill="${fg}">${parts.join("")}</g>${logoSvg}</svg>`;
}

export function QrPreview({ value, size = 160, ...opts }) {
  const svg = useMemo(() => qrSvgString(value, { ...opts, size }), [value, size, opts.fg, opts.bg, opts.shape, opts.margin, opts.logo]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="qr-box" role="img" aria-label="QR code" style={{ width: size + 24 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Rasterise an SVG string to a PNG blob. */
export function svgToPng(svg, px = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = px;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, px, px);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
