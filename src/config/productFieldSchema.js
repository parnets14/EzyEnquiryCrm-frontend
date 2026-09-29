/**
 * productFieldSchema.js
 *
 * Product-type-driven field schema for the Add / Edit Product form.
 *
 * Each product "type" maps to an ordered list of field definitions. The form
 * renders these fields dynamically once a Product Type is chosen. Common fields
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
 *     section,      // optional section label for grouping in UI
 *     autoCompute,  // optional — if true, input is read-only; value computed from other fields
 *   }
 *
 * storeIn === 'column' keys MUST match real Product schema columns:
 *   size, finish, material, color, surface, thickness, grade, tile_type,
 *   application, anti_skid, origin, manufacturer, design, collection,
 *   pcs_per_box, sqft_per_box, weight_per_box
 * Everything else uses storeIn: 'attributes'.
 *
 * Field lists are based on real-world natural stone trade practice:
 *   - Granite: dimensional stone with slab/tile specs, finish, Mohs hardness,
 *     density, water absorption, compressive strength per ASTM / IS standards.
 *   - Marble: calcareous stone with veining patterns, polish grade,
 *     acid sensitivity, typical flooring / countertop specs.
 *   - Natural Stone Block: raw quarry block with gross/net dimensions,
 *     CBM volume, tonnage, block ID, quarry reference, fissure info.
 *   - Non-Sanitary Item: general merchandise (tools, accessories, chemicals,
 *     packaging) with SKU, barcode, net/gross weight, shelf life etc.
 */

// ── Explicit product types the user can select directly ──────────────
export const PRODUCT_TYPES = [
  { value: 'granite',         label: 'Granite' },
  { value: 'marble',          label: 'Marble' },
  { value: 'stone_block',     label: 'Natural Stone Block' },
  { value: 'non_sanitary',    label: 'Non-Sanitary Item' },
  { value: 'tiles',           label: 'Tiles / Vitrified' },
  { value: 'sanitaryware',    label: 'Sanitaryware' },
  { value: 'other',           label: 'Other / General' },
]

export const CATEGORY_TYPES = PRODUCT_TYPES.map(p => p.value)

// ── Shared option lists ────────────────────────────────────────────────
const TILE_SIZES = [
  '300x300','300x450','300x600','400x400','450x900',
  '600x600','600x1200','800x800','800x1600',
  '1000x1000','1200x1200','1200x2400',
]
const SLAB_SIZES_FEET = [
  '2x2 ft','2x4 ft','3x5 ft','3x6 ft','3x7 ft','3x8 ft',
  '4x2 ft','4x6 ft','4x7 ft','4x8 ft','4x9 ft','4x10 ft',
  '5x2 ft','5x3 ft','5x4 ft','5x5 ft','5x6 ft','5x7 ft','5x8 ft',
  '6x3 ft','6x4 ft','6x5 ft','6x6 ft','7x4 ft','8x4 ft','9x5 ft','10x5 ft',
  'Custom',
]
const SLAB_SIZES_MM = [
  '600x600 mm','800x800 mm','900x900 mm','1000x1000 mm',
  '1200x600 mm','1200x800 mm','1200x1200 mm','1600x800 mm',
  '1800x900 mm','2400x1200 mm','3000x1500 mm','Custom',
]
const TILE_FINISHES  = ['Glossy','Matt','Satin','Polished','Rustic','Textured','Sugar','Carving','Natural']
const TILE_TYPES     = ['Floor Tile','Wall Tile','Floor & Wall','Outdoor','Pool Tile','Parking','Elevation','Mosaic']
const APPLICATIONS   = ['Living Room','Bedroom','Bathroom','Kitchen','Outdoor','Commercial','Parking','Swimming Pool','Countertop','Cladding','Steps & Risers']
const ANTI_SKID      = ['R9','R10','R11','R12','R13','Non Slip','Normal']
const WATER_ABS_TILE = ['BIa (≤0.5% Vitrified)','BIb (0.5–3%)','BIIa (3–6%)','BIIb (6–10%)','BIII (>10%)']
const PEI_RATING     = ['PEI I (Light)','PEI II (Moderate)','PEI III (Medium)','PEI IV (Heavy)','PEI V (Extra Heavy)']

// ── Natural-stone-specific options ─────────────────────────────────────
const STONE_FINISHES = [
  'Polished','Honed','Leather (Brushed)','Flamed','River Wash',
  'Sawn Cut','Sand Blasted','Bush Hammered','Tumbled','Lapidotro','Natural Cleft',
]
const GRANITE_GRADES = [
  'Grade 1 (Commercial)','Grade 2 (Standard)','Grade 3 (Premium)','Grade 4 (Exotic / Rare)',
]
const MARBLE_GRADES = [
  'A Grade (Premium / Premium Select)','B Grade (Standard)','C Grade (Commercial)','D Grade (Rustic / Filled)',
]
const STONE_THICKNESS_MM = [
  '15 mm','16 mm','18 mm','20 mm (2 cm)','25 mm','30 mm (3 cm)','40 mm (4 cm)','50 mm (5 cm)','Custom',
]
const STONE_ORIGINS = [
  'India','Italy','Spain','China','Portugal','Brazil','Turkey','UAE',
  'Greece','Egypt','Vietnam','Iran','Norway','Finland','South Africa','USA','Mexico',
]
const GRANITE_VARIETIES = [
  'Black Galaxy','Steel Grey','Kuppam Green','Mysore White','Hassan Green',
  'Imperial Red','Lavender Blue','Siva Blue','Sapphire Blue','Crystal Yellow',
  'Desert Brown','Juparana Granite','Alaska White','Absolute Black','Black Pearl',
  'Tan Brown','Coffee Brown','Paradiso Classic','Vizag Blue','Amba White','Custom',
]
const MARBLE_VARIETIES = [
  'Makrana White','Rajnagar White','Udaipur Green','Ambaji White','Agaria White',
  'Morwad White','Banswara White','Wonder White','Statuario (Italy)','Carrara (Italy)',
  'Calacatta (Italy)','Botticino (Italy)','Emperador (Spain)','Crema Marfil (Spain)',
  'Rosa Portogallo','Verde Guatemala','Thassos White','Black Marquina','Custom',
]
const STONE_PRODUCT_FORM = [
  'Slab (Raw)','Slab (Polished)','Cut-to-Size Tile','Strips','Steps & Risers',
  'Countertop Blank','Vanity Top','Window Sill','Curb Stone','Kerb Stone',
  'Paving Stone','Wall Cladding','Monument / Tombstone','Custom',
]
const VEIN_PATTERNS = [
  'Solid / Uniform','Light Veining','Moderate Veining','Heavy Veining',
  'Book-Matchable','Flowing Veins','Spider Veins','Cloudy Pattern','Brecciated','Fossiliferous',
]
const MOHS_HARDNESS = ['4','5','6','6.5','7','7.5','8']
const ABSORPTION_LEVELS = [
  '< 0.1% (Very Low)','0.1 – 0.3% (Low)','0.3 – 0.5% (Medium)','0.5 – 1.0% (High)','> 1.0% (Very High)',
]
const ACID_SENSITIVITY = ['None / Low','Moderate (seal recommended)','High (must seal)']
const DENSITY_RANGE = ['2600','2650','2700','2750','2800','2850','2900','2950','3000','3100']
const COMPRESSIVE_MPA  = ['80','100','120','140','160','180','200','220','240','260','300']
const FLEXURAL_MPA     = ['10','12','14','16','18','20','22','25','28','30']

// ── Natural Stone Block options ────────────────────────────────────────
const BLOCK_STONE_KIND = [
  'Granite Block','Marble Block','Sandstone Block','Limestone Block',
  'Slate Block','Quartzite Block','Basalt Block','Travertine Block','Onyx Block',
]
const BLOCK_QUALITY_GRADE = [
  'A Grade (Export / Premium)','B Grade (Standard)','C Grade (Commercial / RCC)','Rough / Unclassified',
]
const BLOCK_FISSURE_RATING = [
  'No Visible Fissures','Minor Fissures (Fillable)','Moderate Fissures','Heavy Fissures / Faults',
]
const QUARRY_NAMES_INDIA = [
  'Kishangarh (Rajasthan)','Makrana (Rajasthan)','Rajsamand (Rajasthan)','Udaipur (Rajasthan)',
  'Jalore (Rajasthan)','Sirohi (Rajasthan)','Koppal (Karnataka)','Hassan (Karnataka)',
  'Mysore (Karnataka)','Chittoor (AP)','Krishna (AP)','Jodhpur (Rajasthan)','Custom',
]

// ── Non-Sanitary (general goods) options ────────────────────────────────
const NS_ITEM_CATEGORY = [
  'Adhesives & Chemicals','Grout & Mortar','Sealers & Protectants','Cleaning & Care',
  'Tools & Equipment','Safety & PPE','Packaging Material','Spacers & Levellers',
  'Taps & Accessories','Lighting Fixtures','Hardware','Profile Edging',
  'Miscellaneous Accessories','Flooring Accessories',
]
const NS_MATERIAL = [
  'Plastic / PVC','Stainless Steel (SS304)','Stainless Steel (SS316)','Brass',
  'Aluminium','Ceramic','Rubber','Glass','Wood','Paper / Cardboard','Cotton / Fabric',
  'Epoxy / Resin','Cementitious','Chemical / Liquid','Nylon / Polymer','Other',
]
const NS_UNIT_LIST = [
  'Nos','Piece','Packet','Box','Carton','Bag','Bottle','Can','Drum','Roll','Pair','Set','Kg','Litre','Metre','Sq Ft','Sq Mtr',
]
const HAZARD_CLASSES = ['Non-Hazardous','Flammable','Corrosive','Toxic / Harmful','Oxidizing','Aerosol / Pressurized']

// ── Sanitaryware / Blocks / Tiles legacy options (kept for existing data) ──
const BLOCK_TYPES    = ['AAC Block','Concrete Block','Fly Ash Brick','Solid Block','Hollow Block','Paver Block']
const BLOCK_SIZES    = [
  '600x200x100 mm','600x200x150 mm','600x200x200 mm','600x200x230 mm',
  '600x250x100 mm','600x250x150 mm','600x250x200 mm',
  '400x200x100 mm','400x200x200 mm','230x110x75 mm','Custom',
]
const BLOCK_GRADE_CB = ['AAC-2','AAC-3','AAC-4','AAC-6','Grade A','Grade B']
const SANITARY_TYPE  = ['Wash Basin','Water Closet (WC)','One Piece Closet','Urinal','Cistern','Pedestal','Squatting Pan','Bidet']
const SANITARY_MOUNT = ['Wall Hung','Floor Mounted','One Piece','Counter Top','Under Counter','Table Top']
const FLUSH_TYPES    = ['Single Flush','Dual Flush','Rimless','Concealed','External Cistern']

// ── Per-product-type field definitions ──────────────────────────────────
export const PRODUCT_FIELD_SCHEMA = {
  tiles: [
    { key: 'size',            label: 'Size (mm)',              type: 'select', options: TILE_SIZES,     required: true,  storeIn: 'column' },
    { key: 'tile_type',       label: 'Tile Type',              type: 'select', options: TILE_TYPES,     required: true,  storeIn: 'column' },
    { key: 'finish',          label: 'Finish',                 type: 'select', options: TILE_FINISHES,  required: true,  storeIn: 'column' },
    { key: 'thickness',       label: 'Thickness',              type: 'text',   unit: 'mm',              required: true,  storeIn: 'column', placeholder: 'e.g. 8.5' },
    { key: 'water_absorption',label: 'Water Absorption Group', type: 'select', options: WATER_ABS_TILE, required: false, storeIn: 'attributes' },
    { key: 'pei_rating',      label: 'PEI Abrasion Rating',    type: 'select', options: PEI_RATING,     required: false, storeIn: 'attributes' },
    { key: 'anti_skid',       label: 'Anti-Skid Rating',       type: 'select', options: ANTI_SKID,      required: false, storeIn: 'column' },
    { key: 'application',     label: 'Application Area',       type: 'select', options: APPLICATIONS,   required: false, storeIn: 'column' },
    { key: 'surface',         label: 'Surface',                type: 'text',                            required: false, storeIn: 'column' },
    { key: 'color',           label: 'Colour',                 type: 'select', options: [],             required: false, storeIn: 'column' },
    { key: 'design',          label: 'Design / Series',        type: 'select', options: [],             required: false, storeIn: 'column' },
    { key: 'pcs_per_box',     label: 'Pieces / Box',           type: 'number',                          required: false, storeIn: 'column' },
    { key: 'sqft_per_box',    label: 'Sq.Ft / Box',            type: 'number', unit: 'sqft',            required: false, storeIn: 'column' },
    { key: 'weight_per_box',  label: 'Weight / Box',           type: 'number', unit: 'kg',              required: false, storeIn: 'column' },
  ],

  // ──────────────── GRANITE ────────────────
  granite: [
    // ── Product Identification
    { key: 'stone_variety',   label: 'Granite Variety / Trade Name', type: 'select', options: GRANITE_VARIETIES, required: true,  storeIn: 'attributes', placeholder: 'e.g. Black Galaxy, Steel Grey' },
    { key: 'color',           label: 'Dominant Colour',            type: 'select', options: [],                required: true,  storeIn: 'column',    placeholder: 'e.g. Black, Grey, Red' },
    { key: 'origin',          label: 'Country / Region of Origin', type: 'select', options: STONE_ORIGINS,     required: true,  storeIn: 'column' },
    { key: 'grade',           label: 'Quality Grade',              type: 'select', options: GRANITE_GRADES,    required: false, storeIn: 'column' },
    { key: 'product_form',    label: 'Product Form',               type: 'select', options: STONE_PRODUCT_FORM,required: true,  storeIn: 'attributes' },

    // ── Dimensional Specifications
    { key: 'size_mm',         label: 'Slab / Tile Size (mm)',      type: 'select', options: SLAB_SIZES_MM,     required: false, storeIn: 'attributes' },
    { key: 'size_ft',         label: 'Slab Size (Feet)',           type: 'select', options: SLAB_SIZES_FEET,   required: false, storeIn: 'attributes' },
    { key: 'length_mm',       label: 'Length',                     type: 'number', unit: 'mm',                required: false, storeIn: 'attributes', placeholder: 'Exact length in mm' },
    { key: 'width_mm',        label: 'Width',                      type: 'number', unit: 'mm',                required: false, storeIn: 'attributes', placeholder: 'Exact width in mm' },
    { key: 'thickness',       label: 'Thickness',                  type: 'select', options: STONE_THICKNESS_MM,required: true,  storeIn: 'column' },

    // ── Surface & Visual
    { key: 'finish',          label: 'Surface Finish',             type: 'select', options: STONE_FINISHES,    required: true,  storeIn: 'column' },
    { key: 'veining_texture', label: 'Veining / Texture Pattern',  type: 'select', options: VEIN_PATTERNS,     required: false, storeIn: 'attributes' },
    { key: 'surface',         label: 'Surface Remarks',            type: 'text',                            required: false, storeIn: 'column', placeholder: 'e.g. Mirror Polish, Leather finish' },
    { key: 'design',          label: 'Design / Pattern Name',      type: 'select', options: [],                required: false, storeIn: 'column' },

    // ── Physical / Mechanical Properties
    { key: 'density',         label: 'Density',                    type: 'select', options: DENSITY_RANGE,     required: false, storeIn: 'attributes', unit: 'kg/m³' },
    { key: 'water_absorption',label: 'Water Absorption',           type: 'select', options: ABSORPTION_LEVELS, required: false, storeIn: 'attributes' },
    { key: 'mohs_hardness',   label: 'Mohs Hardness',              type: 'select', options: MOHS_HARDNESS,     required: false, storeIn: 'attributes' },
    { key: 'compressive_strength', label: 'Compressive Strength',  type: 'select', options: COMPRESSIVE_MPA,   required: false, storeIn: 'attributes', unit: 'MPa' },
    { key: 'flexural_strength',label: 'Flexural / Modulus Strength',type: 'select', options: FLEXURAL_MPA,     required: false, storeIn: 'attributes', unit: 'MPa' },
    { key: 'acid_sensitivity',label: 'Chemical / Acid Sensitivity',type: 'select', options: ACID_SENSITIVITY,  required: false, storeIn: 'attributes' },

    // ── Packing & Quantity
    { key: 'pcs_per_crate',   label: 'Pieces / Crate',             type: 'number',                          required: false, storeIn: 'attributes' },
    { key: 'sqft_per_crate',  label: 'Sq.Ft / Crate',              type: 'number', unit: 'sqft',              required: false, storeIn: 'attributes' },
    { key: 'weight_per_crate',label: 'Weight / Crate',             type: 'number', unit: 'kg',                required: false, storeIn: 'attributes' },
  ],

  // ──────────────── MARBLE ────────────────
  marble: [
    // ── Product Identification
    { key: 'stone_variety',   label: 'Marble Variety / Trade Name',type: 'select', options: MARBLE_VARIETIES,  required: true,  storeIn: 'attributes', placeholder: 'e.g. Makrana White, Statuario' },
    { key: 'color',           label: 'Dominant Colour',            type: 'select', options: [],                required: true,  storeIn: 'column',    placeholder: 'e.g. White, Beige, Green' },
    { key: 'origin',          label: 'Country / Quarry Origin',    type: 'select', options: STONE_ORIGINS,     required: true,  storeIn: 'column' },
    { key: 'grade',           label: 'Quality Grade',              type: 'select', options: MARBLE_GRADES,     required: true,  storeIn: 'column' },
    { key: 'product_form',    label: 'Product Form',               type: 'select', options: STONE_PRODUCT_FORM,required: true,  storeIn: 'attributes' },

    // ── Dimensional Specifications
    { key: 'size_mm',         label: 'Slab / Tile Size (mm)',      type: 'select', options: SLAB_SIZES_MM,     required: false, storeIn: 'attributes' },
    { key: 'size_ft',         label: 'Slab Size (Feet)',           type: 'select', options: SLAB_SIZES_FEET,   required: false, storeIn: 'attributes' },
    { key: 'length_mm',       label: 'Length',                     type: 'number', unit: 'mm',                required: false, storeIn: 'attributes', placeholder: 'Exact length mm' },
    { key: 'width_mm',        label: 'Width',                      type: 'number', unit: 'mm',                required: false, storeIn: 'attributes', placeholder: 'Exact width mm' },
    { key: 'thickness',       label: 'Thickness',                  type: 'select', options: STONE_THICKNESS_MM,required: true,  storeIn: 'column' },

    // ── Surface & Visual
    { key: 'finish',          label: 'Surface Finish',             type: 'select', options: STONE_FINISHES,    required: true,  storeIn: 'column' },
    { key: 'vein_pattern',    label: 'Vein / Pattern Type',        type: 'select', options: VEIN_PATTERNS,     required: false, storeIn: 'attributes' },
    { key: 'book_matchable',  label: 'Book-Match Available',       type: 'select', options: ['Yes','No'],      required: false, storeIn: 'attributes' },
    { key: 'surface',         label: 'Surface Remarks',            type: 'text',                            required: false, storeIn: 'column' },
    { key: 'design',          label: 'Design / Batch Name',        type: 'select', options: [],                required: false, storeIn: 'column' },

    // ── Physical / Chemical Properties
    { key: 'density',         label: 'Density',                    type: 'select', options: DENSITY_RANGE,     required: false, storeIn: 'attributes', unit: 'kg/m³' },
    { key: 'water_absorption',label: 'Water Absorption',           type: 'select', options: ABSORPTION_LEVELS, required: false, storeIn: 'attributes' },
    { key: 'mohs_hardness',   label: 'Mohs Hardness',              type: 'select', options: ['3','3.5','4','4.5','5'], required: false, storeIn: 'attributes' },
    { key: 'compressive_strength', label: 'Compressive Strength',  type: 'select', options: COMPRESSIVE_MPA,   required: false, storeIn: 'attributes', unit: 'MPa' },
    { key: 'acid_sensitivity',label: 'Acid Sensitivity (Etch Risk)',type: 'select', options: ACID_SENSITIVITY,  required: false, storeIn: 'attributes' },
    { key: 'sealant_recommended', label: 'Sealant Recommended',    type: 'select', options: ['Yes – Before install','Yes – Periodic','No'], required: false, storeIn: 'attributes' },

    // ── Packing & Quantity
    { key: 'pcs_per_crate',   label: 'Pieces / Crate',             type: 'number',                          required: false, storeIn: 'attributes' },
    { key: 'sqft_per_crate',  label: 'Sq.Ft / Crate',              type: 'number', unit: 'sqft',              required: false, storeIn: 'attributes' },
    { key: 'weight_per_crate',label: 'Weight / Crate',             type: 'number', unit: 'kg',                required: false, storeIn: 'attributes' },
  ],

  // ──────────────── NATURAL STONE BLOCK ────────────────
  stone_block: [
    // ── Block Identification
    { key: 'block_id',        label: 'Block ID / Lot No.',         type: 'text',                            required: true,  storeIn: 'attributes', placeholder: 'e.g. BLK-RAJ-2025-0417' },
    { key: 'block_stone_type',label: 'Stone Type',                 type: 'select', options: BLOCK_STONE_KIND,  required: true,  storeIn: 'attributes' },
    { key: 'stone_variety',   label: 'Variety / Trade Name',       type: 'select', options: [...GRANITE_VARIETIES, ...MARBLE_VARIETIES], required: true, storeIn: 'attributes' },
    { key: 'color',           label: 'Dominant Colour',            type: 'select', options: [],                required: true,  storeIn: 'column' },
    { key: 'origin',          label: 'Origin / Country',           type: 'select', options: STONE_ORIGINS,     required: true,  storeIn: 'column' },
    { key: 'quarry_name',     label: 'Quarry / Mine Location',     type: 'select', options: QUARRY_NAMES_INDIA, required: false, storeIn: 'attributes' },
    { key: 'block_grade',     label: 'Quality Grade',              type: 'select', options: BLOCK_QUALITY_GRADE,required: true,  storeIn: 'attributes' },

    // ── Gross Block Dimensions (mm)
    { key: 'gross_length_mm', label: 'Gross Length',               type: 'number', unit: 'mm',                required: true,  storeIn: 'attributes', placeholder: 'Before cutting' },
    { key: 'gross_width_mm',  label: 'Gross Width / Height',       type: 'number', unit: 'mm',                required: true,  storeIn: 'attributes', placeholder: 'Before cutting' },
    { key: 'gross_height_mm', label: 'Gross Thickness / Depth',    type: 'number', unit: 'mm',                required: true,  storeIn: 'attributes', placeholder: 'Before cutting' },

    // ── Net (Usable) Block Dimensions (mm)
    { key: 'net_length_mm',   label: 'Net (Usable) Length',        type: 'number', unit: 'mm',                required: false, storeIn: 'attributes', placeholder: 'After dressing' },
    { key: 'net_width_mm',    label: 'Net (Usable) Width',         type: 'number', unit: 'mm',                required: false, storeIn: 'attributes', placeholder: 'After dressing' },
    { key: 'net_height_mm',   label: 'Net (Usable) Thickness',     type: 'number', unit: 'mm',                required: false, storeIn: 'attributes', placeholder: 'After dressing' },

    // ── Computed Volume & Weight (auto, but editable)
    { key: 'gross_cbm',       label: 'Gross Volume (CBM)',         type: 'number', unit: 'm³',                required: false, storeIn: 'attributes', placeholder: 'L×W×H ÷ 1e9 (auto)' },
    { key: 'net_cbm',         label: 'Net (Usable) Volume (CBM)',  type: 'number', unit: 'm³',                required: false, storeIn: 'attributes', placeholder: 'auto if net dims filled' },
    { key: 'density',         label: 'Assumed Density',            type: 'select', options: DENSITY_RANGE,     required: false, storeIn: 'attributes', unit: 'kg/m³', placeholder: 'Default 2700 kg/m³' },
    { key: 'gross_weight_tons',label: 'Gross Weight',              type: 'number', unit: 'Tons',              required: false, storeIn: 'attributes', placeholder: 'CBM × Density ÷ 1000 (auto)' },
    { key: 'net_weight_tons', label: 'Net Weight',                 type: 'number', unit: 'Tons',              required: false, storeIn: 'attributes', placeholder: 'auto if net CBM filled' },

    // ── Visual & Quality Notes
    { key: 'veining_texture', label: 'Veining / Texture',          type: 'select', options: VEIN_PATTERNS,     required: false, storeIn: 'attributes' },
    { key: 'fissure_rating',  label: 'Fissure / Crack Rating',     type: 'select', options: BLOCK_FISSURE_RATING,required: false, storeIn: 'attributes' },
    { key: 'expected_slabs',  label: 'Expected Slab Yield (Nos)',  type: 'number',                          required: false, storeIn: 'attributes', placeholder: 'Estimated recoverable slabs' },
    { key: 'expected_sqft',   label: 'Expected Sq.Ft Yield',       type: 'number', unit: 'sqft',              required: false, storeIn: 'attributes' },
    { key: 'block_notes',     label: 'Block Notes / Remarks',      type: 'text',                            required: false, storeIn: 'attributes', placeholder: 'e.g. Wire saw cut, dye test pass, reserve block' },
  ],

  // ──────────────── NON-SANITARY ITEM (general goods) ────────────────
  non_sanitary: [
    // ── Identification
    { key: 'item_sku',        label: 'SKU / Item Code',            type: 'text',                            required: true,  storeIn: 'attributes', placeholder: 'Internal SKU e.g. ADH-001' },
    { key: 'ns_category',     label: 'Item Category',              type: 'select', options: NS_ITEM_CATEGORY,  required: true,  storeIn: 'attributes' },
    { key: 'brand',           label: 'Make / Brand',               type: 'select', options: [],                required: false, storeIn: 'attributes' },
    { key: 'model',           label: 'Model / Part No.',           type: 'select', options: [],                required: false, storeIn: 'attributes' },

    // ── Physical Specs
    { key: 'ns_material',     label: 'Material / Composition',     type: 'select', options: NS_MATERIAL,       required: false, storeIn: 'attributes' },
    { key: 'color',           label: 'Colour',                     type: 'select', options: [],                required: false, storeIn: 'column' },
    { key: 'item_length_cm',  label: 'Length',                     type: 'number', unit: 'cm',                required: false, storeIn: 'attributes' },
    { key: 'item_width_cm',   label: 'Width',                      type: 'number', unit: 'cm',                required: false, storeIn: 'attributes' },
    { key: 'item_height_cm',  label: 'Height',                     type: 'number', unit: 'cm',                required: false, storeIn: 'attributes' },
    { key: 'net_weight_g',    label: 'Net Weight',                 type: 'number', unit: 'g',                 required: false, storeIn: 'attributes' },
    { key: 'gross_weight_g',  label: 'Gross Weight (with pack)',   type: 'number', unit: 'g',                 required: false, storeIn: 'attributes' },

    // ── Packing & Shipping
    { key: 'pack_qty',        label: 'Qty / Pack',                 type: 'number',                          required: false, storeIn: 'attributes', placeholder: 'Pieces per inner pack' },
    { key: 'pack_qty_outer',  label: 'Qty / Outer Carton',         type: 'number',                          required: false, storeIn: 'attributes', placeholder: 'Pieces per master carton' },
    { key: 'ns_unit',         label: 'Sales Unit',                 type: 'select', options: NS_UNIT_LIST,      required: false, storeIn: 'attributes' },
    { key: 'barcode',         label: 'EAN / Barcode',              type: 'text',                            required: false, storeIn: 'column' },
    { key: 'hsn_code',        label: 'HSN / Tariff Code',          type: 'text',                            required: false, storeIn: 'column' },
    { key: 'country_of_origin',label: 'Country of Manufacture',    type: 'select', options: STONE_ORIGINS,     required: false, storeIn: 'attributes' },

    // ── Handling & Shelf Life
    { key: 'hazard_class',    label: 'Hazard / Handling Class',    type: 'select', options: HAZARD_CLASSES,    required: false, storeIn: 'attributes' },
    { key: 'shelf_life_months',label: 'Shelf Life',                type: 'number', unit: 'Months',            required: false, storeIn: 'attributes', placeholder: 'Expiry / best before' },
    { key: 'storage_conditions',label: 'Storage Instructions',     type: 'text',                            required: false, storeIn: 'attributes', placeholder: 'e.g. Cool dry place, keep away from fire' },
    { key: 'warranty_months', label: 'Warranty Period',            type: 'number', unit: 'Months',            required: false, storeIn: 'attributes' },
    { key: 'usage_directions',label: 'Usage Directions',           type: 'text',                            required: false, storeIn: 'attributes', placeholder: 'Short usage / application notes' },
  ],

  // ── Legacy (kept for existing data and non-stone masonry products) ──
  blocks: [
    { key: 'block_type',          label: 'Block Type',               type: 'select', options: BLOCK_TYPES,       required: true,  storeIn: 'attributes' },
    { key: 'size',                label: 'Size (LxHxW)',             type: 'select', options: BLOCK_SIZES,       required: true,  storeIn: 'column' },
    { key: 'grade',               label: 'Grade / Strength Class',   type: 'select', options: BLOCK_GRADE_CB,    required: false, storeIn: 'column' },
    { key: 'compressive_strength',label: 'Compressive Strength',     type: 'number', unit: 'N/mm²',             required: false, storeIn: 'attributes' },
    { key: 'density',             label: 'Density',                  type: 'number', unit: 'kg/m³',             required: false, storeIn: 'attributes' },
    { key: 'pcs_per_cubic_m',     label: 'Pieces / m³',              type: 'number',                          required: false, storeIn: 'attributes' },
  ],

  sanitaryware: [
    { key: 'product_kind',    label: 'Product Type',               type: 'select', options: SANITARY_TYPE,     required: true,  storeIn: 'attributes' },
    { key: 'mounting',        label: 'Mounting',                   type: 'select', options: SANITARY_MOUNT,     required: true,  storeIn: 'attributes' },
    { key: 'color',           label: 'Colour',                     type: 'select', options: [],                required: true,  storeIn: 'column',    placeholder: 'e.g. White / Ivory' },
    { key: 'dimensions',      label: 'Dimensions (W×D×H)',         type: 'select', options: [],                unit: 'mm',      required: true,  storeIn: 'attributes', placeholder: 'e.g. 660x380x710' },
    { key: 'flush_type',      label: 'Flush Type',                 type: 'select', options: FLUSH_TYPES,       required: false, storeIn: 'attributes' },
    { key: 'design',          label: 'Model / Design',             type: 'select', options: [],                required: false, storeIn: 'column' },
  ],

  other: [
    { key: 'size',      label: 'Size',      type: 'select', options: [], required: true,  storeIn: 'column' },
    { key: 'finish',    label: 'Finish',    type: 'select', options: [], required: false, storeIn: 'column' },
    { key: 'color',     label: 'Colour',    type: 'select', options: [], required: false, storeIn: 'column' },
    { key: 'material',  label: 'Material',  type: 'select', options: [], required: false, storeIn: 'column' },
    { key: 'thickness', label: 'Thickness', type: 'select', options: [], unit: 'mm', required: false, storeIn: 'column' },
  ],
}

// Sensible default unit per product type (used to preselect the Unit field).
export const CATEGORY_DEFAULT_UNIT = {
  tiles:         'Box',
  granite:       'Sq Ft',
  marble:        'Sq Ft',
  stone_block:   'CBM',
  blocks:        'Nos',
  sanitaryware:  'Piece',
  non_sanitary:  'Nos',
  other:         'Nos',
}

/**
 * Match a free-text category / sub-category name to one of the known product
 * types. Falls back to 'other' when nothing matches.
 * NOTE: keyword checks are ordered — more specific first.
 */
export function matchCategoryType(...names) {
  const text = names.filter(Boolean).join(' ').toLowerCase()
  if (!text) return 'other'

  if (/\b(granite)\b/.test(text))                                                          return 'granite'
  if (/\b(marble|onyx|travertine|quartzite?|limestone|sandstone|slate|basalt|travertin)\b/.test(text)) return 'marble'
  if (/\b(stone.?block|quarry.?block|raw.?block|granite.?block|marble.?block|block.?stone)\b/.test(text)) return 'stone_block'
  if (/\b(aac|block|brick|paver|clc|fly.?ash|hollow.?block|solid.?block)\b/.test(text))   return 'blocks'
  if (/\b(sanitary|basin|closet|wc|urinal|cistern|toilet|bidet|pedestal|water.?closet)\b/.test(text)) return 'sanitaryware'
  if (/\b(non.?sanitary|accessory|chemical|adhesive|grout|sealer|tool|hardware|packaging)\b/.test(text)) return 'non_sanitary'
  if (/\b(tile|tiles|vitrified|ceramic|porcelain|mosaic|gvt|pgvt|double.?charge)\b/.test(text)) return 'tiles'
  return 'other'
}

/** Return the field list for a category type (never undefined). */
export function fieldsForType(type) {
  return PRODUCT_FIELD_SCHEMA[type] || PRODUCT_FIELD_SCHEMA.other
}

/** Human label for a product type (shown in form headings etc). */
export function labelForType(type) {
  const map = {
    tiles:          'Tiles / Vitrified',
    granite:        'Granite (Natural Stone)',
    marble:         'Marble / Decorative Stone',
    stone_block:    'Natural Stone Block (Quarry Block)',
    blocks:         'AAC / Concrete Blocks & Bricks',
    sanitaryware:   'Sanitaryware',
    non_sanitary:   'Non-Sanitary / General Items',
    other:          'General Product',
  }
  return map[type] || 'General Product'
}

/** Short one/two word label (for dropdowns, chips). */
export function shortLabelForType(type) {
  const map = {
    tiles:          'Tiles',
    granite:        'Granite',
    marble:         'Marble',
    stone_block:    'Stone Block',
    blocks:         'Blocks',
    sanitaryware:   'Sanitaryware',
    non_sanitary:   'Non-Sanitary',
    other:          'Other',
  }
  return map[type] || 'Other'
}

/** Humanize an attribute key that has no schema definition. */
export function humanizeKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bMm\b/g, '(mm)')
    .replace(/\bFt\b/g, '(ft)')
    .replace(/\bCbm\b/g, 'CBM')
    .replace(/\bSqft\b/g, 'Sq.Ft')
    .replace(/\bSku\b/g, 'SKU')
    .replace(/\bEan\b/g, 'EAN')
    .replace(/\bHsn\b/g, 'HSN')
    .replace(/\bWc\b/g, 'WC')
}
