import QRCode from "qrcode";
import { SHORT_LINK_BASE_URL } from "../constants/domains";

/**
 * Pure & Standards-Compliant QR Code Generator with Dynamic Density
 * Uses optimal mask evaluation and minimum error correction (Level L, ~7%)
 * to generate the simplest, cleanest, and most spacious QR code matrix
 * dynamically sized according to the URL length.
 *
 * @param {string} text - URL or text to encode
 * @param {object} options - { errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H', version?: number }
 * @returns {{ size: number, version: number, matrix: boolean[][] }}
 */
export function generateQrMatrix(text, options = {}) {
  const content = String(text || SHORT_LINK_BASE_URL);
  const errorCorrectionLevel = options.errorCorrectionLevel || "L";

  try {
    const qr = QRCode.create(content, {
      errorCorrectionLevel,
      version: options.version,
    });

    const size = qr.modules.size;
    const matrix = [];

    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        row.push(qr.modules.get(r, c) === 1);
      }
      matrix.push(row);
    }

    return {
      size,
      version: qr.version,
      matrix,
    };
  } catch (err) {
    console.error("QR matrix generation error:", err);
    return {
      size: 21,
      version: 1,
      matrix: Array.from({ length: 21 }, () => Array(21).fill(false)),
    };
  }
}
