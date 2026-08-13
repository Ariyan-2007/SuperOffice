// Small color-math utilities used to derive a full brand scale (and a readable contrast
// color) from the single hex value a Business supplies as `themeColor`. No dependency —
// this is the entire white-labeling mechanism, so it needs to be correct, not fancy.

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToCss({ h, s, l }: Hsl): string {
  return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

// Relative luminance (WCAG) — decides whether white or near-black text sits on the brand color.
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

const DEFAULT_BRAND_HEX = "#4338CA"; // professional indigo — used until a Business theme resolves

const SCALE_STEPS: Record<number, number> = {
  50: 96,
  100: 92,
  200: 84,
  300: 74,
  400: 62,
  500: 50,
  600: 42,
  700: 34,
  800: 26,
  900: 18,
  950: 12,
};

export function applyBrandColor(hex: string | null | undefined): void {
  const rgb = hexToRgb(hex || DEFAULT_BRAND_HEX) ?? hexToRgb(DEFAULT_BRAND_HEX)!;
  const base = rgbToHsl(...rgb);
  const root = document.documentElement.style;

  for (const [step, lightness] of Object.entries(SCALE_STEPS)) {
    root.setProperty(`--brand-${step}`, hslToCss({ h: base.h, s: base.s, l: lightness }));
  }
  root.setProperty("--brand", hslToCss(base));
  root.setProperty("--brand-h", base.h.toFixed(1));
  root.setProperty("--brand-s", `${base.s.toFixed(1)}%`);

  const luminance = relativeLuminance(...rgb);
  root.setProperty("--brand-contrast", luminance > 0.55 ? "hsl(222 47% 11%)" : "hsl(0 0% 100%)");
}

export function resetBrandColor(): void {
  applyBrandColor(DEFAULT_BRAND_HEX);
}
