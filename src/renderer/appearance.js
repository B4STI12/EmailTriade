import { mixGradient, hexA } from './ColorMix.jsx';

export const DEFAULTS = {
  accentMix: ['#6366F1', '#8B5CF6'],
  density: 'comfortable',
  fontSize: 'medium',
  bgStyle: 'solid',
};

const FONT_ZOOM = { small: 0.92, medium: 1, large: 1.08 };

export function applyAppearance(state) {
  const s = { ...DEFAULTS, ...state };
  const root = document.documentElement;
  const mix = Array.isArray(s.accentMix) && s.accentMix.length ? s.accentMix : DEFAULTS.accentMix;
  const lead = mix[0];

  root.style.setProperty('--accent', lead);
  root.style.setProperty('--accent-gradient', mixGradient(mix));
  root.style.setProperty('--accent-soft', hexA(lead, 0.10));
  root.style.setProperty('--accent-soft-strong', hexA(lead, 0.16));
  root.style.setProperty('--accent-border', hexA(lead, 0.28));
  root.style.setProperty('--accent-text', hexA(lead, 0.85));

  root.dataset.density = s.density;
  root.dataset.bg = s.bgStyle;
  root.style.zoom = '';
  root.style.setProperty('--ui-zoom', String(FONT_ZOOM[s.fontSize] ?? 1));
}

export async function loadAppearance() {
  const api = window.api?.settings;
  if (!api) return DEFAULTS;
  try {
    const [accentMix, density, fontSize, bgStyle] = await Promise.all([
      api.getAccentMix(),
      api.getDensity(),
      api.getFontSize(),
      api.getBgStyle(),
    ]);
    return {
      accentMix: accentMix || DEFAULTS.accentMix,
      density: density || DEFAULTS.density,
      fontSize: fontSize || DEFAULTS.fontSize,
      bgStyle: bgStyle || DEFAULTS.bgStyle,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveAppearance(patch) {
  const api = window.api?.settings;
  if (!api) return;
  const ops = [];
  if (patch.accentMix !== undefined) ops.push(api.setAccentMix(patch.accentMix));
  if (patch.density !== undefined) ops.push(api.setDensity(patch.density));
  if (patch.fontSize !== undefined) ops.push(api.setFontSize(patch.fontSize));
  if (patch.bgStyle !== undefined) ops.push(api.setBgStyle(patch.bgStyle));
  await Promise.all(ops);
}
