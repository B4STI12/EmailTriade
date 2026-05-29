// ColorMix.jsx
// ------------------------------------------------------------------------------------
// Self-contained multi-color accent picker, extracted from the MailTriage "Appearance"
// feature. Lets the user pick an ORDERED set of up to `max` colors that blend into a
// single accent gradient. Framework: React 18 (no other dependencies).
//
// WHAT YOU GET
//   <ColorMix />                — the swatch-grid control + live gradient preview
//   mixGradient(mix)            — turn a color array into a CSS background (solid or gradient)
//   hexA(hex, alpha)            — hex -> rgba() string (for soft/tinted backgrounds)
//   toggleMixColor(mix, c, opt) — pure reducer for add/remove/FIFO-cap selection logic
//   deriveAccentTokens(mix,opt) — map a mix array to the accent design tokens you apply app-wide
//
// QUICK START
//   const [mix, setMix] = React.useState(['#6366F1', '#8B5CF6']);
//   <ColorMix value={mix} onChange={setMix} onReset={() => setMix(DEFAULT_MIX)} />
//
//   // then apply it anywhere an accent is needed:
//   const accent = deriveAccentTokens(mix);
//   <button style={{ background: accent.gradient, color: '#fff' }}>Primary</button>
//   <span style={{ background: accent.soft, color: accent.softText }}>Selected</span>
// ------------------------------------------------------------------------------------

// hex (#rgb or #rrggbb) -> "rgba(r, g, b, a)". Pass-through if not a hex string.
export function hexA(hex, a) {
  if (typeof hex !== 'string' || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Color array -> CSS background. 0 colors = fallback, 1 = solid, 2+ = linear-gradient.
export function mixGradient(mix, { angle = 135, fallback = '#6366F1' } = {}) {
  if (!Array.isArray(mix) || mix.length === 0) return fallback;
  if (mix.length === 1) return mix[0];
  return `linear-gradient(${angle}deg, ${mix.join(', ')})`;
}

// Pure selection reducer. Returns the NEXT mix array.
//   - clicking an unselected color appends it (up to `max`; beyond that, oldest drops — FIFO)
//   - clicking a selected color removes it, but never below `min`
export function toggleMixColor(mix, color, { max = 4, min = 1 } = {}) {
  const has = mix.includes(color);
  if (has) return mix.length > min ? mix.filter((x) => x !== color) : mix;
  if (mix.length >= max) return [...mix.slice(mix.length - max + 1), color];
  return [...mix, color];
}

// Map a mix array to the accent tokens you wire through your design system.
//   gradient  -> fills (logo, primary buttons, active states)
//   solid     -> the single representative color (text/icons that can't take a gradient)
//   soft      -> low-alpha tint of the lead color (chip/row backgrounds)
//   softText  -> readable text color to pair with `soft`
export function deriveAccentTokens(mix, { mode = 'dark' } = {}) {
  const lead = (Array.isArray(mix) && mix[0]) || '#6366F1';
  return {
    solid: lead,
    gradient: mixGradient(mix),
    soft: hexA(lead, mode === 'light' ? 0.13 : 0.18),
    softText: lead,
  };
}

// A sensible default palette to choose from. Replace with your brand swatches.
export const DEFAULT_SWATCHES = [
  '#6366F1', '#8B5CF6', '#A855F7', '#2563EB', '#38BDF8',
  '#0D9488', '#10B981', '#4ADE80', '#F59E0B', '#F43F5E',
  '#EC4899', '#DB2777', '#A64B2E', '#E11D8F',
];

// ---- The control -------------------------------------------------------------------
// Props:
//   value      : string[]  ordered selected colors (controlled)            [required]
//   onChange   : (next: string[]) => void                                  [required]
//   options    : string[]  swatch palette to choose from   (default DEFAULT_SWATCHES)
//   max        : number    max selectable colors            (default 4)
//   min        : number    min selectable colors            (default 1)
//   columns    : number    swatch grid columns              (default 7)
//   onReset    : () => void if provided, shows a "Reset" link
//   showPreview: boolean   show the gradient + sample chips (default true)
//   label      : string    section heading                 (default "Accent mix")
//   hint       : string    helper line under the preview
//   radius     : number    corner radius in px              (default 8)
//   ui         : { bg, text, muted, border } theme hooks so it matches the host app.
export function ColorMix({
  value,
  onChange,
  options = DEFAULT_SWATCHES,
  max = 4,
  min = 1,
  columns = 7,
  onReset,
  showPreview = true,
  label = 'Accent mix',
  hint = `Tap to add up to ${max} colors — they blend into one accent.`,
  radius = 8,
  ui = {},
}) {
  const mix = Array.isArray(value) ? value : [];
  const theme = {
    bg: ui.bg || '#161618',
    text: ui.text || '#E8E8EC',
    muted: ui.muted || '#8B8B93',
    border: ui.border || 'rgba(255,255,255,0.10)',
  };
  const toggle = (c) => onChange(toggleMixColor(mix, c, { max, min }));
  const pill = (r) => (r > 8 ? 999 : r);

  return (
    <div style={{ fontFamily: 'inherit', color: theme.text }}>
      {/* heading row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.muted }}>{label}</h3>
        {onReset && (
          <button onClick={onReset} style={{ background: 'transparent', border: 'none', color: mix[0] || theme.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Reset</button>
        )}
      </div>

      {/* live blend preview */}
      {showPreview && (
        <div style={{ borderRadius: radius + 1, overflow: 'hidden', border: `1px solid ${theme.border}`, marginBottom: 13 }}>
          <div style={{ height: 46, background: mixGradient(mix) }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px', background: theme.bg }}>
            <span style={{ padding: '6px 12px', borderRadius: pill(radius), background: mixGradient(mix), color: '#fff', fontSize: 12, fontWeight: 600 }}>Primary</span>
            <span style={{ padding: '5px 11px', borderRadius: pill(radius), background: hexA(mix[0], 0.16), color: mix[0], fontSize: 12, fontWeight: 600 }}>Selected</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 11, color: theme.muted }}>{mix.length} color{mix.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {hint && <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10 }}>{hint}</div>}

      {/* swatch grid — selected swatches show their order number */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 9 }}>
        {options.map((c) => {
          const i = mix.indexOf(c);
          const active = i !== -1;
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              title={c}
              aria-pressed={active}
              style={{
                position: 'relative', aspectRatio: '1', borderRadius: radius, background: c, cursor: 'pointer',
                border: active ? `2px solid ${theme.text}` : '2px solid transparent',
                boxShadow: active ? `0 0 0 2px ${hexA(theme.text, 0.2)}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {active && (
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ColorMix;
