/**
 * Theme Utilities — Dynamic color palette generation, font management & CSS variable management.
 *
 * Generates a full Tailwind-style color palette (50–900) from a single hex color,
 * manages font family selection, and applies them as CSS custom properties on :root.
 */

/* ══════════════════════════════════════════
 *  Color conversion helpers
 * ══════════════════════════════════════════ */

/** Convert hex (#rrggbb) → { r, g, b } (0–255) */
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

/** Mix two hex colours. ratio 0 → color1, ratio 1 → color2 */
const mixColors = (hex1, hex2, ratio) => {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/* ══════════════════════════════════════════
 *  Palette generation
 * ══════════════════════════════════════════ */

/**
 * Generate a full 50–900 palette from a single "500" base colour.
 * Lighter shades are mixed with white, darker shades with black.
 */
export const generatePalette = (baseHex) => ({
  50:  mixColors(baseHex, '#ffffff', 0.93),
  100: mixColors(baseHex, '#ffffff', 0.85),
  200: mixColors(baseHex, '#ffffff', 0.72),
  300: mixColors(baseHex, '#ffffff', 0.52),
  400: mixColors(baseHex, '#ffffff', 0.28),
  500: baseHex,
  600: mixColors(baseHex, '#000000', 0.12),
  700: mixColors(baseHex, '#000000', 0.26),
  800: mixColors(baseHex, '#000000', 0.42),
  900: mixColors(baseHex, '#000000', 0.58),
});

/** Convert a hex colour to a space-separated RGB string for Tailwind vars: "30 58 95" */
export const hexToRgbString = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
};

/* ══════════════════════════════════════════
 *  Available fonts
 * ══════════════════════════════════════════ */

export const AVAILABLE_FONTS = [
  { name: 'Inter',          value: 'Inter',           category: 'Sans-serif', description: 'Modern & clean (default)' },
  { name: 'Poppins',        value: 'Poppins',         category: 'Sans-serif', description: 'Geometric & friendly' },
  { name: 'Nunito',         value: 'Nunito',          category: 'Sans-serif', description: 'Rounded & warm' },
  { name: 'Roboto',         value: 'Roboto',          category: 'Sans-serif', description: 'Google\'s signature font' },
  { name: 'Open Sans',      value: 'Open Sans',       category: 'Sans-serif', description: 'Professional & readable' },
  { name: 'Lato',           value: 'Lato',            category: 'Sans-serif', description: 'Elegant & stable' },
  { name: 'Montserrat',     value: 'Montserrat',      category: 'Sans-serif', description: 'Bold & impactful' },
  { name: 'Raleway',        value: 'Raleway',         category: 'Sans-serif', description: 'Stylish & thin' },
  { name: 'Source Sans 3',  value: 'Source Sans 3',   category: 'Sans-serif', description: 'Adobe\'s open-source sans' },
  { name: 'DM Sans',        value: 'DM Sans',         category: 'Sans-serif', description: 'Low-contrast geometric' },
  { name: 'Quicksand',      value: 'Quicksand',       category: 'Sans-serif', description: 'Playful & rounded' },
  { name: 'Outfit',         value: 'Outfit',          category: 'Sans-serif', description: 'Contemporary & versatile' },
];

export const DEFAULT_FONT = 'Inter';
export const DEFAULT_FONT_STYLE = 'normal';

/* ══════════════════════════════════════════
 *  Font Style options
 * ══════════════════════════════════════════ */

/**
 * Font style is stored as a space-separated string of active styles.
 * Possible values: "normal", "bold", "italic", "uppercase"
 * Combinations: "bold italic", "bold uppercase", "italic uppercase", "bold italic uppercase"
 */
export const FONT_STYLE_OPTIONS = [
  { key: 'bold',      label: 'Bold',      icon: 'B',  css: { fontWeight: 'bold' },        cssVar: '--font-weight',    cssValue: 'bold',      description: 'Make headings bolder' },
  { key: 'italic',    label: 'Italic',    icon: 'I',  css: { fontStyle: 'italic' },       cssVar: '--font-style',     cssValue: 'italic',    description: 'Add italic emphasis' },
  { key: 'uppercase', label: 'Uppercase', icon: 'AA', css: { textTransform: 'uppercase' }, cssVar: '--text-transform', cssValue: 'uppercase', description: 'MAKE HEADINGS UPPERCASE' },
];

/** Parse the font_style string into an array of active style keys */
export const parseFontStyle = (styleStr) => {
  if (!styleStr || styleStr === 'normal') return [];
  return styleStr.split(' ').filter(s => ['bold', 'italic', 'uppercase'].includes(s));
};

/** Convert active style keys array back to a stored string */
export const serializeFontStyle = (stylesArray) => {
  if (!stylesArray || stylesArray.length === 0) return 'normal';
  return stylesArray.join(' ');
};

/* ══════════════════════════════════════════
 *  Apply / remove theme
 * ══════════════════════════════════════════ */

/**
 * Apply a theme by setting CSS custom properties on :root.
 * @param {string} primaryHex   – Primary brand colour (#rrggbb)
 * @param {string} accentHex    – Accent/secondary colour (#rrggbb)
 * @param {string} fontFamily   – Font family name (e.g. 'Poppins')
 * @param {string} fontStyle    – Font style string (e.g. 'bold italic uppercase')
 */
export const applyTheme = (primaryHex, accentHex, fontFamily, fontStyle) => {
  const root = document.documentElement;

  if (primaryHex) {
    const palette = generatePalette(primaryHex);
    Object.entries(palette).forEach(([shade, hex]) => {
      root.style.setProperty(`--primary-${shade}`, hexToRgbString(hex));
    });
  }

  if (accentHex) {
    const palette = generatePalette(accentHex);
    Object.entries(palette).forEach(([shade, hex]) => {
      root.style.setProperty(`--accent-${shade}`, hexToRgbString(hex));
    });
  }

  if (fontFamily) {
    root.style.setProperty('--font-family', `'${fontFamily}', system-ui, sans-serif`);
    document.body.style.fontFamily = `'${fontFamily}', system-ui, sans-serif`;
  }

  // Apply font style (bold, italic, uppercase) as CSS variables for headings
  if (fontStyle !== undefined) {
    applyFontStyle(fontStyle);
  }
};

/**
 * Apply only the font without touching colours.
 * @param {string} fontFamily – Font family name
 */
export const applyFont = (fontFamily) => {
  if (!fontFamily) return;
  const root = document.documentElement;
  root.style.setProperty('--font-family', `'${fontFamily}', system-ui, sans-serif`);
  document.body.style.fontFamily = `'${fontFamily}', system-ui, sans-serif`;
};

/**
 * Apply font styles (bold, italic, uppercase) via CSS custom properties on :root.
 * These are applied to headings (h1-h6) and .card-title elements via CSS.
 * @param {string} fontStyleStr – e.g. "bold italic uppercase" or "normal"
 */
export const applyFontStyle = (fontStyleStr) => {
  const root = document.documentElement;
  const styles = parseFontStyle(fontStyleStr);

  root.style.setProperty('--heading-font-weight', styles.includes('bold') ? '800' : '600');
  root.style.setProperty('--heading-font-style', styles.includes('italic') ? 'italic' : 'normal');
  root.style.setProperty('--heading-text-transform', styles.includes('uppercase') ? 'uppercase' : 'none');
};

/** Remove all custom theme variables (revert to CSS defaults) */
export const removeTheme = () => {
  const root = document.documentElement;
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  shades.forEach((s) => {
    root.style.removeProperty(`--primary-${s}`);
    root.style.removeProperty(`--accent-${s}`);
  });
  root.style.removeProperty('--font-family');
  root.style.removeProperty('--heading-font-weight');
  root.style.removeProperty('--heading-font-style');
  root.style.removeProperty('--heading-text-transform');
  document.body.style.fontFamily = '';
};

/**
 * Load & apply theme from saved branding data (localStorage or user object).
 */
export const loadSavedTheme = () => {
  try {
    const saved = localStorage.getItem('school_branding');
    if (saved) {
      const { primary_color, secondary_color, font_family, font_style } = JSON.parse(saved);
      applyTheme(primary_color, secondary_color, font_family, font_style);
    }
  } catch { /* ignore */ }
};

/**
 * Save branding to localStorage and apply.
 */
export const saveAndApplyTheme = (primaryColor, secondaryColor, fontFamily, fontStyle) => {
  localStorage.setItem('school_branding', JSON.stringify({
    primary_color: primaryColor || null,
    secondary_color: secondaryColor || null,
    font_family: fontFamily || null,
    font_style: fontStyle || null,
  }));
  applyTheme(primaryColor, secondaryColor, fontFamily, fontStyle);
};

/* ══════════════════════════════════════════
 *  Theme presets
 * ══════════════════════════════════════════ */

export const THEME_PRESETS = [
  { name: 'Royal Blue',   primary: '#1e3a5f', accent: '#f0ad4e', emoji: '🔵' },
  { name: 'Forest Green', primary: '#1a5632', accent: '#e8a838', emoji: '🌲' },
  { name: 'Crimson Red',  primary: '#8b1a2b', accent: '#f5c542', emoji: '🔴' },
  { name: 'Deep Purple',  primary: '#4a1a6b', accent: '#ff9f43', emoji: '🟣' },
  { name: 'Ocean Teal',   primary: '#0d6e6e', accent: '#ffa94d', emoji: '🌊' },
  { name: 'Warm Earth',   primary: '#6b3a1a', accent: '#78c257', emoji: '🍂' },
  { name: 'Slate Pro',    primary: '#334155', accent: '#38bdf8', emoji: '⚫' },
  { name: 'Sky Blue',     primary: '#0369a1', accent: '#fb923c', emoji: '☁️' },
  { name: 'Rose Gold',    primary: '#9f1239', accent: '#fbbf24', emoji: '🌹' },
  { name: 'Midnight',     primary: '#1e1b4b', accent: '#a78bfa', emoji: '🌙' },
];

export const DEFAULT_PRIMARY = '#1e3a5f';
export const DEFAULT_ACCENT  = '#f0ad4e';
