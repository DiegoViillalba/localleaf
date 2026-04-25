/**
 * Generates an 11-step color palette based on a single hex color.
 * For simplicity, we interpolate between white, the base color, and black.
 */
function generatePalette(baseHex: string): Record<number, string> {
  const hex2rgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const rgb2hex = (r: number, g: number, b: number) => {
    return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
  };

  const mix = (c1: [number, number, number], c2: [number, number, number], weight: number): [number, number, number] => {
    return [
      c1[0] + (c2[0] - c1[0]) * weight,
      c1[1] + (c2[1] - c1[1]) * weight,
      c1[2] + (c2[2] - c1[2]) * weight,
    ];
  };

  const base = hex2rgb(baseHex);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];

  // Tailwind scale approximation:
  // 50: 95% white
  // 100: 90% white
  // 200: 80% white
  // 300: 60% white
  // 400: 30% white
  // 500: base color
  // 600: 20% black
  // 700: 40% black
  // 800: 60% black
  // 900: 80% black
  // 950: 90% black

  return {
    50: rgb2hex(...mix(white, base, 0.05)),
    100: rgb2hex(...mix(white, base, 0.1)),
    200: rgb2hex(...mix(white, base, 0.2)),
    300: rgb2hex(...mix(white, base, 0.4)),
    400: rgb2hex(...mix(white, base, 0.7)),
    500: rgb2hex(...base),
    600: rgb2hex(...mix(base, black, 0.2)),
    700: rgb2hex(...mix(base, black, 0.4)),
    800: rgb2hex(...mix(base, black, 0.6)),
    900: rgb2hex(...mix(base, black, 0.8)),
    950: rgb2hex(...mix(base, black, 0.9)),
  };
}

export function applyCustomTheme(hex: string) {
  const palette = generatePalette(hex);
  const styleId = "localleaf-custom-theme";

  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // The custom theme behaves like dark mode structurally (base is dark)
  // so we assign the palette in the default order, but with the new hues.
  // We use dark colors for 900-950 and light for 50-100.
  styleEl.innerHTML = `
    body.theme-custom {
      --theme-50: ${palette[50]};
      --theme-100: ${palette[100]};
      --theme-200: ${palette[200]};
      --theme-300: ${palette[300]};
      --theme-400: ${palette[400]};
      --theme-500: ${palette[500]};
      --theme-600: ${palette[600]};
      --theme-700: ${palette[700]};
      --theme-800: ${palette[800]};
      --theme-900: ${palette[900]};
      --theme-950: ${palette[950]};
    }
  `;
}

export function removeCustomTheme() {
  const styleEl = document.getElementById("localleaf-custom-theme");
  if (styleEl) {
    styleEl.remove();
  }
}
