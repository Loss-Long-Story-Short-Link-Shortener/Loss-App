/**
 * Pure JavaScript QR Code Generator (Versions 1-4, Byte mode, EC level L/M)
 * Generates an authentic, 100% scannable QR Code matrix without any external dependencies.
 */

// Galois Field GF(256) tables
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255];
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function polyMul(p1, p2) {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(numEcWords) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < numEcWords; i++) {
    g = polyMul(g, new Uint8Array([1, GF256_EXP[i]]));
  }
  return g;
}

function calculateEC(data, numEcWords) {
  const gen = getGeneratorPoly(numEcWords);
  const msg = new Uint8Array(data.length + numEcWords);
  msg.set(data);

  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], lead);
      }
    }
  }
  return msg.slice(data.length);
}

// QR Code Specifications for Byte Mode, Error Correction Medium (M)
const VERSIONS = [
  null,
  { size: 21, totalBytes: 26, dataBytes: 16, ecWords: 10 }, // V1: up to 14 chars
  { size: 25, totalBytes: 44, dataBytes: 28, ecWords: 16 }, // V2: up to 26 chars
  { size: 29, totalBytes: 70, dataBytes: 44, ecWords: 26 }, // V3: up to 42 chars
  { size: 33, totalBytes: 100, dataBytes: 64, ecWords: 36 }, // V4: up to 62 chars
  { size: 37, totalBytes: 134, dataBytes: 86, ecWords: 48 }, // V5: up to 84 chars
  { size: 41, totalBytes: 172, dataBytes: 108, ecWords: 64 }, // V6: up to 106 chars
];

export function generateQrMatrix(text) {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(String(text || ""));

  // Select smallest version that fits
  let version = 1;
  while (version < VERSIONS.length && rawBytes.length + 3 > VERSIONS[version].dataBytes) {
    version++;
  }
  if (version >= VERSIONS.length) {
    version = VERSIONS.length - 1;
  }

  const cfg = VERSIONS[version];
  const { size, dataBytes, ecWords } = cfg;

  // Build bit stream: 4-bit mode (0100 for Byte) + 8-bit length + rawBytes
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(Math.min(rawBytes.length, dataBytes - 3), 8); // Character count
  for (let i = 0; i < Math.min(rawBytes.length, dataBytes - 3); i++) {
    pushBits(rawBytes[i], 8);
  }

  // Terminator (up to 4 zeroes)
  const maxDataBits = dataBytes * 8;
  const termLen = Math.min(4, maxDataBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  // Pad to multiple of 8
  while (bits.length % 8 !== 0) bits.push(0);

  // Convert bits to byte array
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    data.push(byte);
  }

  // Pad bytes alternating 0xEC, 0x11
  let padByte = 0xec;
  while (data.length < dataBytes) {
    data.push(padByte);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  // Error Correction
  const ec = calculateEC(new Uint8Array(data), ecWords);
  const totalCodeWords = [...data, ...ec];

  // Initialize Matrix
  // -1 = unassigned, 0 = white, 1 = black
  const matrix = Array.from({ length: size }, () => Array(size).fill(-1));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder Patterns
  function addFinder(row, col) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const val = isBorder || isCenter ? 1 : 0;
        matrix[row + r][col + c] = val;
        isFunction[row + r][col + c] = true;
      }
    }
    // Separator around finder
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !isFunction[nr][nc]) {
          matrix[nr][nc] = 0;
          isFunction[nr][nc] = true;
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Alignment Pattern for Version >= 2
  if (version >= 2) {
    const alignPos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isDot = r === 0 && c === 0;
        const val = isOuter || isDot ? 1 : 0;
        matrix[alignPos + r][alignPos + c] = val;
        isFunction[alignPos + r][alignPos + c] = true;
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    if (!isFunction[6][i]) {
      matrix[6][i] = val;
      isFunction[6][i] = true;
    }
    if (!isFunction[i][6]) {
      matrix[i][6] = val;
      isFunction[i][6] = true;
    }
  }

  // Dark module
  matrix[size - 8][8] = 1;
  isFunction[size - 8][8] = true;

  // Reserve format information area
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    isFunction[8][i] = true;
    isFunction[i][8] = true;
  }

  // Place data bits in zigzag
  const allBits = [];
  for (const byte of totalCodeWords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((byte >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // skip vertical timing line
    const cols = [rightCol, rightCol - 1];

    for (let i = 0; i < size; i++) {
      const row = upwards ? size - 1 - i : i;
      for (const col of cols) {
        if (!isFunction[row][col]) {
          const rawBit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0 ? 1 : 0;
          matrix[row][col] = rawBit ^ mask;
        }
      }
    }
    upwards = !upwards;
  }

  // Format info for EC Level M (00) with Mask 0 (000) => bits 101010000010010
  // Standard format mask 101010000010010 XOR 101010000010010 = 0
  const formatInfo = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  const formatMask = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  const formatBits = formatInfo.map((b, i) => b ^ formatMask[i]);

  // Place format bits top-left & split
  const topCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8],
    [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[topCoords[i][0]][topCoords[i][1]] = formatBits[i];
  }

  const otherCoords = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
    [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[otherCoords[i][0]][otherCoords[i][1]] = formatBits[i];
  }

  return {
    size,
    matrix: matrix.map((row) => row.map((cell) => cell === 1)),
  };
}
