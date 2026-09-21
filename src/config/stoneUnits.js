/**
 * Stone measurement — unit conversion + area calculation.
 *
 * Real-world formula (matches the mobile app):
 *   1. Convert Length to the OUTPUT unit.
 *   2. Convert Width  to the OUTPUT unit.
 *   3. Area = Length(out) × Width(out).
 *
 * Example (Inch input → Feet output):
 *   L = 122 in = 122 / 12 = 10.16667 ft
 *   W =  38 in =  38 / 12 =  3.16667 ft
 *   Area = 10.16667 × 3.16667 = 32.1944 ft²   ✅
 */

// ── Length units → metres (base) ─────────────────────────────
export const UNIT_TO_METRE = {
  inch:       0.0254,
  feet:       0.3048,
  meter:      1,
  centimeter: 0.01,
  millimeter: 0.001,
}

// UI-facing list (order matches the mobile dropdown in the screenshots)
export const UNITS = [
  { key: 'inch',       label: 'Inch' },
  { key: 'feet',       label: 'Feet' },
  { key: 'meter',      label: 'Meter' },
  { key: 'centimeter', label: 'Centimeter' },
  { key: 'millimeter', label: 'Millimeter' },
]

// Short symbol for the area unit, e.g. "ft²"
export const AREA_SYMBOL = {
  inch:       'in²',
  feet:       'ft²',
  meter:      'm²',
  centimeter: 'cm²',
  millimeter: 'mm²',
}

export const unitLabel = (key) => UNITS.find(u => u.key === key)?.label || key

/** Convert a single length value from `fromUnit` to `toUnit`. */
export function convertLength(value, fromUnit, toUnit) {
  const v = parseFloat(value)
  if (!isFinite(v)) return 0
  const metres = v * (UNIT_TO_METRE[fromUnit] ?? 1)
  return metres / (UNIT_TO_METRE[toUnit] ?? 1)
}

/**
 * Area of one row.
 * @param {number|string} length  raw length in `inputUnit`
 * @param {number|string} width   raw width  in `inputUnit`
 * @param {string} inputUnit      unit the user typed in (e.g. 'inch')
 * @param {string} outputUnit     unit the result is expressed in (e.g. 'feet')
 * @returns {number} area in outputUnit²  (0 when incomplete)
 */
export function rowArea(length, width, inputUnit, outputUnit) {
  const l = parseFloat(length)
  const w = parseFloat(width)
  if (!isFinite(l) || !isFinite(w) || l <= 0 || w <= 0) return 0
  const lOut = convertLength(l, inputUnit, outputUnit)
  const wOut = convertLength(w, inputUnit, outputUnit)
  return lOut * wOut
}

/** Sum of areas across all rows. */
export function sumArea(rows, inputUnit, outputUnit) {
  return rows.reduce((acc, r) => acc + rowArea(r.length, r.width, inputUnit, outputUnit), 0)
}

/** Round to a fixed number of decimals, returning a Number. */
export const round = (v, d = 4) => {
  const f = 10 ** d
  return Math.round((Number(v) + Number.EPSILON) * f) / f
}

/** Format an area value for display (4 decimals, like the mobile app). */
export const fmtArea = (v, d = 4) => round(v, d).toFixed(d)
