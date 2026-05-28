type GymThemeSource = {
  primary_color?: string | null;
  secondary_color?: string | null;
};

export type GymTheme = {
  background: string;
  foreground: string;
  brand: string;
  brandForeground: string;
  brandSoft: string;
  border: string;
  muted: string;
};

const fallbackTheme: GymTheme = {
  background: "#ffffff",
  foreground: "#171717",
  brand: "#111111",
  brandForeground: "#ffffff",
  brandSoft: "#f4f4f5",
  border: "#e5e7eb",
  muted: "#6b7280",
};

function normalizeHexColor(value: string | null | undefined) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return null;

  if (trimmed.length === 4) {
    const [hash, red, green, blue] = trimmed;
    return `${hash}${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const raw = normalized.slice(1);
  const parts =
    raw.length === 3
      ? raw.split("").map((part) => part + part)
      : raw.match(/.{2}/g);
  if (!parts || parts.length !== 3) return null;

  const [red, green, blue] = parts.map((part) => Number.parseInt(part, 16));
  if ([red, green, blue].some(Number.isNaN)) return null;

  return { red, green, blue };
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixColors(from: string, to: string, ratio: number) {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  if (!fromRgb || !toRgb) return fallbackTheme.border;

  const mixRatio = Math.max(0, Math.min(1, ratio));
  const red = Math.round(fromRgb.red * (1 - mixRatio) + toRgb.red * mixRatio);
  const green = Math.round(
    fromRgb.green * (1 - mixRatio) + toRgb.green * mixRatio,
  );
  const blue = Math.round(
    fromRgb.blue * (1 - mixRatio) + toRgb.blue * mixRatio,
  );

  return rgbToHex(red, green, blue);
}

function isLightColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;

  const luminance =
    (0.2126 * rgb.red + 0.7152 * rgb.green + 0.0722 * rgb.blue) / 255;
  return luminance > 0.62;
}

export function getGymTheme(gym?: GymThemeSource | null): GymTheme {
  const brand = normalizeHexColor(gym?.primary_color) ?? fallbackTheme.brand;
  const brandSoft =
    normalizeHexColor(gym?.secondary_color) ?? fallbackTheme.brandSoft;

  return {
    ...fallbackTheme,
    brand,
    brandForeground: isLightColor(brand) ? "#111111" : "#ffffff",
    brandSoft,
    border: mixColors(brand, brandSoft, 0.16),
    muted: mixColors(brand, "#ffffff", 0.6),
  };
}
