/**
 * productFieldSchema.js
 *
 * Category-driven field schema for the Add / Edit Product form.
 *
 * Each category "type" maps to an ordered list of field definitions. The form
 * renders these fields dynamically once a Category is chosen. Common fields
 * (name, pricing, stock, images, unit, gst) live outside this schema and are
 * always shown.
 *
 * Field definition shape:
 *   {
 *     key,          // unique key (also the attributes[] key when storeIn==='attributes')
 *     label,        // UI label
 *     type,         // 'text' | 'number' | 'select'
 *     options,      // string[] for selects (optional)
 *     unit,         // suffix shown after the input, e.g. 'mm', 'ft', 'cm' (optional)
 *     required,     // boolean — enforced by the form
 *     storeIn,      // 'column'  -> saved to an existing Product model field (key = column name)
 *                   // 'attributes' -> saved into product.attributes[key] (Mixed JSON)
 *     placeholder,  // optional input placeholder
 *   }
 *
 * storeIn === 'column' keys MUST match real Product schema columns:
 *   size, finish, material, color, surface, thickness, grade, tile_type,
 *   application, anti_skid, origin, manufacturer, design, collection,
 *   pcs_per_box, sqft_per_box, weight_per_box
 * Everything else uses storeIn: 'attributes'.
 *
 * Field lists are based on real-world tile / building-material trade practice
 * (IS 15622 / EN 14411 tile classes, granite thickness & grade conventions,
 * AAC/concrete block strength classes, sanitaryware mounting types).
 */

// Category "types" the form understands.
export const CATEGORY_TYPES = ['tiles', 'granite', 'marble', 'blocks', 'sanitaryware', 'other']

// ── Shared option lists ───────────────────────────────────────
const TILE_SIZES = [
  '300x300', '300x450', '300x600', '400x400', '450x900',
  '600x600', '600x1200', '800x800', '800x1600',
  '1000x1000', '1200x1200', '1200x2400',
]
const TILE_FINISHES  = ['Glossy', 'Matt', 'Satin', 'Polished', 'Rustic', 'Textured', 'Sugar', 'Carving', 'Natural']
const TILE_TYPES     = ['Floor Tile', 'Wall Tile', 'Floor & Wall', 'Outdoor', 'Pool Tile', 'Parking', 'Elevation', 'Mosaic']
const APPLICATIONS   = ['Living Room', 'Bedroom', 'Bathroom', 'Kitchen', 'Outdoor', 'Commercial', 'Parking', 'Swimming Pool']
const ANTI_SKID      = ['R9', 'R10', 'R11', 'R12', 'R13', 'Non Slip', 'Normal']
const WATER_ABS      = ['BIa (≤0.5% Vitrified)', 'BIb (0.5–3%)', 'BIIa (3–6%)', 'BIIb (6–10%)']
const PEI_RATING     = ['PEI I', 'PEI II', 'PEI III', 'PEI IV', 'PEI V']
const STONE_FINISHES = ['Polished', 'Honed', 'Leather', 'Flamed', 'Brushed', 'Lapotra', 'River Wash']
const STONE_GRADE    = ['Grade 1 (Commercial)', 'Grade 2 (Standard)', 'Grade 3 (Premium)', 'Grade 4 (Exotic)']
const STONE_THICK    = ['16mm', '18mm', '20mm (2cm)', '25mm', '30mm (3cm)', 'Custom']
const ORIGINS        = ['India', 'Italy', 'Spain', 'China', 'Portugal', 'Brazil', 'Turkey', 'UAE']
const BLOCK_TYPES    = ['AAC Block', 'Concrete Block', 'Fly Ash Brick', 'Solid Block', 'Hollow Block', 'Paver Block']
const BLOCK_GRADE    = ['AAC-2', 'AAC-3', 'AAC-4', 'AAC-6', 'Grade A', 'Grade B']
const SANITARY_TYPE  = ['Wash Basin', 'Water Closet (WC)', 'One Piece Closet', 'Urinal', 'Cistern', 'Pedestal', 'Squatting Pan', 'Bidet']
const SANITARY_MOUNT = ['Wall Hung', 'Floor Mounted', 'One Piece', 'Counter Top', 'Under Counter', 'Table Top']
const FLUSH_TYPES    = ['Single Flush', 'Dual Flush', 'Rimless', 'Concealed', 'External Cistern']

// ── Per-category field definitions ────────────────────────────
export const PRODUCT_FIELD_SCHEMA = {
  tiles: [
    { key: 'size',        label: 'Size (mm)',       type: 'select', options: TILE_SIZES,  required: true,  storeIn: 'column' },
    { key: 'tile_type',   label: 'Tile Type',       type: 'select', options: TILE_TYPES,  required: true,  storeIn: 'column' },
    { key: 'finish',      label: 'Finish',          type: 'select', options: TILE_FINISHES, required: true, storeIn: 'column' },
    { key: 'thickness',   label: 'Thickness',       type: 'text',   unit: 'mm',           required: true,  storeIn: 'column', placeholder: 'e.g. 8.5' },
    { key: 'water_absorption', label: 'Water Absorption Group', type: 'select', options: WATER_ABS, required: false, storeIn: 'attributes' },
    { key: 'pei_rating',  label: 'PEI Abrasion Rating', type: 'select', options: PEI_RATING, required: false, storeIn: 'attributes' },
    { key: 'anti_skid',   label: 'Anti-Skid Rating', type: 'select', options: ANTI_SKID,  required: false, storeIn: 'column' },
    { key: 'application', label: 'Application Area', type: 'select', options: APPLICATIONS, required: false, storeIn: 'column' },
    { key: 'surface',     label: 'Surface',          type: 'text',   required: false, storeIn: 'column' },
    { key: 'color',       label: 'Colour',           type: 'text',   required: false, storeIn: 'column' },
    { key: 'design',      label: 'Design / Series',  type: 'text',   required: false, storeIn: 'column' },
    { key: 'pcs_per_box', label: 'Pieces / Box',     type: 'number', required: false, storeIn: 'column' },
    { key: 'sqft_per_box', label: 'Sq.Ft / Box',     type: 'number', unit: 'sqft', required: false, storeIn: 'column' },
    { key: 'weight_per_box', label: 'Weight / Box',  type: 'number', unit: 'kg',   required: false, storeIn: 'column' },
  ],

  granite: [
    { key: 'color',        label: 'Colour',          type: 'text',   required: true,  storeIn: 'column',    placeholder: 'e.g. Black Galaxy' },
    { key: 'finish',       label: 'Finish',          type: 'select', options: STONE_FINISHES, required: true, storeIn: 'column' },
    { key: 'thickness',    label: 'Thickness',       type: 'select', options: STONE_THICK, required: true,  storeIn: 'column' },
    { key: 'slab_length_ft', label: 'Slab Length',   type: 'number', unit: 'ft',      required: true,  storeIn: 'attributes' },
    { key: 'slab_width_ft',  label: 'Slab Width',    type: 'number', unit: 'ft',      required: true,  storeIn: 'attributes' },
    { key: 'grade',        label: 'Grade / Quality', type: 'select', options: STONE_GRADE, required: false, storeIn: 'column' },
    { key: 'origin',       label: 'Origin',          type: 'select', options: ORIGINS, required: false, storeIn: 'column' },
    { key: 'vein_pattern', label: 'Vein / Pattern',  type: 'text',   required: false, storeIn: 'attributes' },
    { key: 'weight_per_box', label: 'Weight / Slab', type: 'number', unit: 'kg',      required: false, storeIn: 'column' },
  ],

  marble: [
    { key: 'color',        label: 'Colour',          type: 'text',   required: true,  storeIn: 'column',    placeholder: 'e.g. Makrana White' },
    { key: 'finish',       label: 'Finish',          type: 'select', options: STONE_FINISHES, required: true, storeIn: 'column' },
    { key: 'thickness',    label: 'Thickness',       type: 'select', options: STONE_THICK, required: true,  storeIn: 'column' },
    { key: 'slab_length_ft', label: 'Slab Length',   type: 'number', unit: 'ft',      required: true,  storeIn: 'attributes' },
    { key: 'slab_width_ft',  label: 'Slab Width',    type: 'number', unit: 'ft',      required: true,  storeIn: 'attributes' },
    { key: 'grade',        label: 'Grade / Quality', type: 'select', options: STONE_GRADE, required: false, storeIn: 'column' },
    { key: 'origin',       label: 'Origin',          type: 'select', options: ORIGINS, required: false, storeIn: 'column' },
    { key: 'vein_pattern', label: 'Vein / Pattern',  type: 'text',   required: false, storeIn: 'attributes' },
  ],

  blocks: [
    { key: 'block_type',   label: 'Block Type',      type: 'select', options: BLOCK_TYPES, required: true,  storeIn: 'attributes' },
    { key: 'block_length_mm', label: 'Length',       type: 'number', unit: 'mm',      required: true,  storeIn: 'attributes' },
    { key: 'block_height_mm', label: 'Height',       type: 'number', unit: 'mm',      required: true,  storeIn: 'attributes' },
    { key: 'block_thickness_mm', label: 'Thickness / Width', type: 'number', unit: 'mm', required: true, storeIn: 'attributes' },
    { key: 'grade',        label: 'Grade / Strength Class', type: 'select', options: BLOCK_GRADE, required: false, storeIn: 'column' },
    { key: 'compressive_strength', label: 'Compressive Strength', type: 'number', unit: 'N/mm²', required: false, storeIn: 'attributes' },
    { key: 'density',      label: 'Density',         type: 'number', unit: 'kg/m³',   required: false, storeIn: 'attributes' },
    { key: 'pcs_per_cubic_m', label: 'Pieces / m³',  type: 'number', required: false, storeIn: 'attributes' },
  ],

  sanitaryware: [
    { key: 'product_kind', label: 'Product Type',    type: 'select', options: SANITARY_TYPE, required: true,  storeIn: 'attributes' },
    { key: 'mounting',     label: 'Mounting',        type: 'select', options: SANITARY_MOUNT, required: true, storeIn: 'attributes' },
    { key: 'color',        label: 'Colour',          type: 'text',   required: true,  storeIn: 'column',    placeholder: 'e.g. White / Ivory' },
    { key: 'dimensions',   label: 'Dimensions (W×D×H)', type: 'text', unit: 'mm',     required: true,  storeIn: 'attributes', placeholder: 'e.g. 660x380x710' },
    { key: 'flush_type',   label: 'Flush Type',      type: 'select', options: FLUSH_TYPES, required: false, storeIn: 'attributes' },
    { key: 'design',       label: 'Model / Design',  type: 'text',   required: false, storeIn: 'column' },
  ],

  other: [
    { key: 'size',      label: 'Size',      type: 'text', required: true,  storeIn: 'column' },
    { key: 'finish',    label: 'Finish',    type: 'text', required: false, storeIn: 'column' },
    { key: 'color',     label: 'Colour',    type: 'text', required: false, storeIn: 'column' },
    { key: 'material',  label: 'Material',  type: 'text', required: false, storeIn: 'column' },
    { key: 'thickness', label: 'Thickness', type: 'text', unit: 'mm', required: false, storeIn: 'column' },
  ],
}

// Sensible default unit per category (used to preselect the Unit field).
export const CATEGORY_DEFAULT_UNIT = {
  tiles: 'Box',
  granite: 'Sq Ft',
  marble: 'Sq Ft',
  blocks: 'Nos',
  sanitaryware: 'Piece',
  other: 'Nos',
}

/**
 * Infer a category type from a free-text category / sub-category name.
 * Falls back to 'other' when nothing matches.
 */
export function matchCategoryType(...names) {
  const text = names.filter(Boolean).join(' ').toLowerCase()
  if (!text) return 'other'

  // Order matters: check more specific keywords first.
  if (/\b(granite)\b/.test(text)) return 'granite'
  if (/\b(marble|onyx|travertine|quartz|stone)\b/.test(text)) return 'marble'
  if (/\b(aac|block|brick|paver)\b/.test(text)) return 'blocks'
  if (/\b(sanitary|basin|closet|wc|urinal|cistern|toilet|bidet|pedestal)\b/.test(text)) return 'sanitaryware'
  if (/\b(tile|tiles|vitrified|ceramic|porcelain|mosaic|gvt|pgvt)\b/.test(text)) return 'tiles'
  return 'other'
}

/** Return the field list for a category type (never undefined). */
export function fieldsForType(type) {
  return PRODUCT_FIELD_SCHEMA[type] || PRODUCT_FIELD_SCHEMA.other
}

/** Human label for a category type. */
export function labelForType(type) {
  const map = {
    tiles: 'Tiles', granite: 'Granite', marble: 'Marble / Stone',
    blocks: 'Blocks / Bricks', sanitaryware: 'Sanitaryware', other: 'General',
  }
  return map[type] || 'General'
}

/** Humanize an attribute key that has no schema definition. */
export function humanizeKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bMm\b/, '(mm)')
    .replace(/\bFt\b/, '(ft)')
}
