import { useState } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  cobalt:       '#2563EB',
  cobaltLight:  '#3B82F6',
  cobaltMid:    '#60A5FA',
  cobaltSoft:   '#DBEAFE',

  pine:         '#059669',
  pineSoft:     '#D1FAE5',

  gold:         '#D97706',
  goldSoft:     '#FEF3C7',

  heart:        '#DC2626',
  heartSoft:    '#FEE2E2',

  white:        '#FFFFFF',
  surface:      '#F8FAFF',
  border:       '#E2E8F0',
  borderStrong: '#CBD5E1',

  ink:          '#0F172A',
  inkSoft:      '#475569',
  inkMuted:     '#94A3B8',
};

// Saturated sport colors — jersey-level vibrancy
const SPORTS = [
  { sport: 'Soccer',     icon: '⚽', bg: '#16A34A', text: '#FFFFFF', soft: '#DCFCE7', softText: '#14532D' },
  { sport: 'Basketball', icon: '🏀', bg: '#EA580C', text: '#FFFFFF', soft: '#FFEDD5', softText: '#7C2D12' },
  { sport: 'Hockey',     icon: '🏒', bg: '#0284C7', text: '#FFFFFF', soft: '#E0F2FE', softText: '#0C4A6E' },
  { sport: 'Tennis',     icon: '🎾', bg: '#CA8A04', text: '#FFFFFF', soft: '#FEF9C3', softText: '#713F12' },
  { sport: 'Volleyball', icon: '🏐', bg: '#7C3AED', text: '#FFFFFF', soft: '#EDE9FE', softText: '#4C1D95' },
  { sport: 'Rugby',      icon: '🏉', bg: '#BE123C', text: '#FFFFFF', soft: '#FFE4E6', softText: '#881337' },
  { sport: 'Other',      icon: '🏅', bg: '#475569', text: '#FFFFFF', soft: '#F1F5F9', softText: '#1E293B' },
];

const TABS = ['Colors', 'Typography', 'Buttons', 'Badges', 'Cards', 'Screens'];

// Font stacks — DM Sans for UI, Fraunces-style via Georgia for headings
const FONTS = {
  heading: '"Georgia", "Times New Roman", serif',
  ui: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
};

export default function App() {
  const [tab, setTab] = useState('Colors');

  return (
    <div style={{ fontFamily: FONTS.ui, background: C.surface, minHeight: '100vh', color: C.ink }}>

      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(135deg, ${C.cobalt} 0%, #1D4ED8 100%)`, padding: '28px 36px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13,
            background: 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>🫡</div>
          <div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: FONTS.heading, letterSpacing: -0.4 }}>Muster</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase' }}>Design System v3</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? C.cobalt : 'rgba(255,255,255,0.72)',
              border: 'none', borderRadius: '9px 9px 0 0',
              padding: '9px 20px', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: FONTS.ui,
              transition: 'all 0.12s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '32px 36px', maxWidth: 980, margin: '0 auto' }}>
        {tab === 'Colors'     && <ColorsTab />}
        {tab === 'Typography' && <TypographyTab />}
        {tab === 'Buttons'    && <ButtonsTab />}
        {tab === 'Badges'     && <BadgesTab />}
        {tab === 'Cards'      && <CardsTab />}
        {tab === 'Screens'    && <ScreensTab />}
      </div>
    </div>
  );
}

// ─── SHARED ──────────────────────────────────────────────────────────────────
function Lbl({ children, top }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: C.inkMuted, marginBottom: 14, marginTop: top || 6 }}>{children}</div>;
}
function Card({ children, style }) {
  return <div style={{ background: '#fff', borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,0.07)', ...style }}>{children}</div>;
}

// ─── COLORS TAB ──────────────────────────────────────────────────────────────
function ColorsTab() {
  const core = [
    { name: 'cobalt',      hex: '#2563EB', label: 'Primary CTA · active nav',    light: true },
    { name: 'cobaltLight', hex: '#3B82F6', label: 'Pressed / hover',             light: true },
    { name: 'cobaltMid',   hex: '#60A5FA', label: 'Ghost borders · icon accent', dark: true },
    { name: 'cobaltSoft',  hex: '#DBEAFE', label: 'Tint bg · chips · slots',     dark: true },
    { name: 'pine',        hex: '#059669', label: 'Open · success · confirmed',  light: true },
    { name: 'pineSoft',    hex: '#D1FAE5', label: 'Success tint bg',             dark: true },
    { name: 'gold',        hex: '#D97706', label: 'Salute · recognition only',   light: true },
    { name: 'goldSoft',    hex: '#FEF3C7', label: 'Salute tint bg',              dark: true },
    { name: 'heart',       hex: '#DC2626', label: 'Step Out · error · delete',   light: true },
    { name: 'heartSoft',   hex: '#FEE2E2', label: 'Error tint bg',               dark: true },
    { name: 'ink',         hex: '#0F172A', label: 'Primary text',                light: true },
    { name: 'inkSoft',     hex: '#475569', label: 'Secondary text',              light: true },
    { name: 'inkMuted',    hex: '#94A3B8', label: 'Placeholders · captions',     dark: true },
    { name: 'border',      hex: '#E2E8F0', label: 'Dividers · card outlines',    dark: true },
    { name: 'surface',     hex: '#F8FAFF', label: 'Screen background',           dark: true },
  ];

  return (
    <div>
      <Lbl>Core Palette</Lbl>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
        {core.map(s => (
          <div key={s.name} style={{ borderRadius: 14, overflow: 'hidden', width: 168, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <div style={{ background: s.hex, height: 72, display: 'flex', alignItems: 'flex-end', padding: '8px 12px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: s.light ? '#fff' : C.ink, opacity: 0.9 }}>{s.hex}</span>
            </div>
            <div style={{ background: '#fff', padding: '10px 12px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, fontFamily: FONTS.ui }}>{s.name}</div>
              <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 3, lineHeight: 1.4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Lbl>Sport Colors — Saturated Jersey Palette</Lbl>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {SPORTS.map(s => (
          <div key={s.sport} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', minWidth: 130 }}>
            {/* Solid badge color — the main badge */}
            <div style={{ background: s.bg, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <span style={{ color: s.text, fontWeight: 800, fontSize: 13, letterSpacing: 0.3, fontFamily: FONTS.ui }}>{s.sport}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: `${s.text}CC` }}>{s.bg}</span>
            </div>
            {/* Soft variant */}
            <div style={{ background: s.soft, padding: '8px 12px', borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: s.softText, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONTS.ui }}>Soft variant</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '14px 18px', marginTop: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 4, fontFamily: FONTS.ui }}>Sport badge rule</div>
        <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6, fontFamily: FONTS.ui }}>
          Full-color badges (solid bg) appear on card headers and search results. Soft variants appear inline within text or on white card backgrounds. Never use cobalt or pine for sport badges.
        </div>
      </div>
    </div>
  );
}

// ─── TYPOGRAPHY TAB ──────────────────────────────────────────────────────────
function TypographyTab() {
  const scale = [
    { token: 'fonts.displayLg',  meta: 'Fraunces 700 · 44px · −0.5px',  text: 'Muster the Troops.',                 fam: FONTS.heading, w: 700, sz: 44, ls: -0.5 },
    { token: 'fonts.display',    meta: 'Fraunces 700 · 36px · −0.3px',  text: 'Find Your Game.',                    fam: FONTS.heading, w: 700, sz: 36, ls: -0.3 },
    { token: 'fonts.heading',    meta: 'Fraunces 900 · 26px · −0.2px',  text: 'Upcoming Events',                    fam: FONTS.heading, w: 900, sz: 26, ls: -0.2 },
    { token: 'fonts.headingSm',  meta: 'Fraunces 900 · 20px',           text: 'Saturday League',                    fam: FONTS.heading, w: 900, sz: 20, ls: 0 },
    { token: 'fonts.ui',         meta: 'DM Sans 700 · 16px',            text: 'Join Up',                            fam: FONTS.ui,      w: 700, sz: 16, ls: 0 },
    { token: 'fonts.uiMed',      meta: 'DM Sans 500 · 15px',            text: 'Eastside Park, Field 3',             fam: FONTS.ui,      w: 500, sz: 15, ls: 0 },
    { token: 'fonts.label',      meta: 'DM Sans 600 · 11px · 1.2px',   text: 'ROSTER · OPEN · SALUTE',            fam: FONTS.ui,      w: 600, sz: 11, ls: 1.2, caps: true, muted: true },
    { token: 'fonts.body',       meta: 'DM Sans 400 · 15px',            text: 'Join the squad for a fast-paced pickup game at Eastside Park.', fam: FONTS.ui, w: 400, sz: 15, ls: 0 },
    { token: 'fonts.bodySm',     meta: 'DM Sans 400 · 13px',            text: 'Sat, Jun 7 · 6:00 PM · Eastside Park', fam: FONTS.ui,   w: 400, sz: 13, ls: 0, muted: true },
    { token: 'fonts.caption',    meta: 'DM Sans 400 · 12px',            text: '24 spots remaining · Joined 8 min ago', fam: FONTS.ui, w: 400, sz: 12, ls: 0, muted: true },
  ];

  return (
    <div>
      <div style={{ background: '#EFF6FF', border: `1px solid ${C.cobaltMid}`, borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.cobalt, marginBottom: 4 }}>Font pairing</div>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
          <strong style={{ color: C.ink }}>Fraunces</strong> — display & headings only. Personality, warmth, sport-editorial feel.<br/>
          <strong style={{ color: C.ink }}>DM Sans</strong> — all UI, labels, body copy. Geometric, ultra-legible, crisp at 11px+. Designed for screens.
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        {scale.map((t, i) => (
          <div key={t.token} style={{
            display: 'flex', alignItems: 'center', gap: 24,
            padding: '15px 22px',
            borderBottom: i < scale.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{ width: 170, flexShrink: 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.cobalt, fontWeight: 700 }}>{t.token}</div>
              <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 3, fontFamily: FONTS.ui }}>{t.meta}</div>
            </div>
            <div style={{
              flex: 1,
              fontFamily: t.fam,
              fontWeight: t.w,
              fontSize: Math.min(t.sz, 34),
              color: t.muted ? C.inkMuted : C.ink,
              letterSpacing: t.ls,
              textTransform: t.caps ? 'uppercase' : 'none',
              lineHeight: 1.3,
            }}>{t.text}</div>
          </div>
        ))}
      </Card>

      <Lbl top={28}>DM Sans Readability at Small Sizes</Lbl>
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: C.inkMuted, marginBottom: 10, fontFamily: FONTS.ui }}>DM Sans — crisp</div>
            {[32, 24, 18, 15, 13, 11].map(sz => (
              <div key={sz} style={{ fontFamily: FONTS.ui, fontSize: sz, fontWeight: 400, color: C.ink, lineHeight: 1.5, marginBottom: 4 }}>
                Muster Sports App — {sz}px
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: C.inkMuted, marginBottom: 10, fontFamily: FONTS.ui }}>Weight range</div>
            {[
              [700, 'Bold — buttons, headings'],
              [600, 'SemiBold — labels, badges'],
              [500, 'Medium — emphasized body'],
              [400, 'Regular — body, meta'],
            ].map(([w, label]) => (
              <div key={w} style={{ fontFamily: FONTS.ui, fontSize: 14, fontWeight: w, color: C.ink, lineHeight: 1.7, marginBottom: 2 }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── BUTTONS TAB ─────────────────────────────────────────────────────────────
function ButtonsTab() {
  return (
    <div>
      <Lbl>Primary CTA — 52px · cobalt · always bottom-pinned</Lbl>
      <Card style={{ padding: 28, marginBottom: 20 }}>
        <button style={{ background: `linear-gradient(135deg, ${C.cobalt} 0%, #1D4ED8 100%)`, color: '#fff', border: 'none', borderRadius: 14, height: 52, width: '100%', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.ui, boxShadow: `0 4px 16px rgba(37,99,235,0.40)`, letterSpacing: 0.1 }}>
          Join Up
        </button>
        <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 10, textAlign: 'center', fontFamily: FONTS.ui }}>colors.cobalt gradient · 52px · DM Sans 700 · cobalt box-shadow</div>
      </Card>

      <Lbl>Full Family</Lbl>
      <Card style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'Join Up',         bg: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, color: '#fff', border: 'none',                              shadow: `0 4px 16px rgba(37,99,235,0.38)`, desc: 'Primary' },
            { label: 'View Roster',     bg: 'transparent',          color: C.cobalt,  border: `2px solid ${C.cobalt}`,  shadow: 'none', desc: 'Secondary / Ghost' },
            { label: 'Step Out',        bg: C.heartSoft,            color: C.heart,   border: `2px solid ${C.heart}`,   shadow: 'none', desc: 'Destructive' },
            { label: '🫡 Salute',       bg: C.goldSoft,             color: C.gold,    border: `2px solid ${C.gold}`,    shadow: `0 4px 12px rgba(217,119,6,0.2)`, desc: 'Salute' },
            { label: 'Share Event',     bg: C.pineSoft,             color: C.pine,    border: `2px solid ${C.pine}`,    shadow: 'none', desc: 'Positive secondary' },
            { label: 'Edit Profile',    bg: C.surface,              color: C.inkSoft, border: `2px solid ${C.border}`,  shadow: 'none', desc: 'Neutral / tertiary' },
          ].map(b => (
            <div key={b.label}>
              <button style={{ background: b.bg, color: b.color, border: b.border, borderRadius: 14, height: 52, width: '100%', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.ui, boxShadow: b.shadow }}>{b.label}</button>
              <div style={{ fontSize: 10, color: C.inkMuted, textAlign: 'center', marginTop: 5, fontFamily: FONTS.ui, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: C.border, margin: '24px 0' }} />
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: C.inkMuted, marginBottom: 12, fontFamily: FONTS.ui }}>Small — chips · card actions</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Join Up',   bg: C.cobalt,    color: '#fff',    border: 'none' },
            { label: '🫡 Salute', bg: C.goldSoft,  color: C.gold,    border: `1.5px solid ${C.gold}` },
            { label: 'Step Out',  bg: C.heartSoft, color: C.heart,   border: `1.5px solid ${C.heart}` },
            { label: 'Filter',    bg: C.cobaltSoft,color: C.cobalt,  border: 'none' },
            { label: 'Open',      bg: C.pine,      color: '#fff',    border: 'none' },
          ].map(b => (
            <button key={b.label} style={{ background: b.bg, color: b.color, border: b.border, borderRadius: 8, height: 32, padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.ui }}>{b.label}</button>
          ))}
        </div>
      </Card>

      <div style={{ background: C.cobaltSoft, border: `1px solid ${C.cobaltMid}`, borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.cobalt, marginBottom: 4, fontFamily: FONTS.ui }}>Bottom-bar placement rule</div>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6, fontFamily: FONTS.ui }}>One primary CTA per screen. Lives in a white bottom bar with 1px top border and 24px bottom padding. Cobalt drop shadow always on. Never floating mid-screen.</div>
      </div>
    </div>
  );
}

// ─── BADGES TAB ──────────────────────────────────────────────────────────────
function BadgesTab() {
  return (
    <div>
      <Lbl>Status Badges</Lbl>
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { label: 'Open',      bg: '#059669', text: '#fff' },
            { label: 'Few Spots', bg: '#D97706', text: '#fff' },
            { label: 'Full',      bg: '#DC2626', text: '#fff' },
            { label: 'Closed',    bg: '#475569', text: '#fff' },
            { label: 'League',    bg: '#2563EB', text: '#fff' },
            { label: '🫡 Saluted', bg: '#D97706', text: '#fff' },
          ].map(b => (
            <span key={b.label} style={{ background: b.bg, color: b.text, borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FONTS.ui }}>{b.label}</span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.inkMuted, fontFamily: FONTS.ui }}>Full color badges — solid backgrounds are more readable than pale tints at a glance</div>
      </Card>

      <Lbl>Sport Badges — Full Color + Soft Variant</Lbl>
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: C.inkMuted, marginBottom: 10, fontFamily: FONTS.ui }}>Full color — card headers, search results</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SPORTS.map(s => (
              <span key={s.sport} style={{ background: s.bg, color: s.text, borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700, letterSpacing: 0.3, fontFamily: FONTS.ui }}>{s.icon} {s.sport}</span>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: C.border, margin: '16px 0' }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: C.inkMuted, marginBottom: 10, fontFamily: FONTS.ui }}>Soft variant — inline on white backgrounds</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SPORTS.map(s => (
              <span key={s.sport} style={{ background: s.soft, color: s.softText, borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700, letterSpacing: 0.3, fontFamily: FONTS.ui }}>{s.icon} {s.sport}</span>
            ))}
          </div>
        </div>
      </Card>

      <Lbl>Inputs</Lbl>
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { label: 'Location', placeholder: '📍 Eastside Park...', state: 'default', bc: C.borderStrong, bg: '#fff', shadow: 'none' },
            { label: 'Sport', placeholder: 'Soccer', state: 'focused', bc: C.cobalt, bg: '#EFF6FF', shadow: `0 0 0 4px ${C.cobaltSoft}`, lc: C.cobalt },
            { label: 'Email', placeholder: 'not-valid@', state: 'error', bc: C.heart, bg: '#FFF5F5', shadow: `0 0 0 4px ${C.heartSoft}`, lc: C.heart, err: 'Enter a valid email address' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: f.lc || C.inkSoft, marginBottom: 6, fontFamily: FONTS.ui }}>{f.label}</div>
              <div style={{ border: `2px solid ${f.bc}`, borderRadius: 12, height: 50, padding: '0 16px', display: 'flex', alignItems: 'center', background: f.bg, boxShadow: f.shadow }}>
                <span style={{ fontSize: 14, color: f.state === 'default' ? C.inkMuted : C.ink, fontFamily: FONTS.ui }}>{f.placeholder}</span>
              </div>
              {f.err && <div style={{ fontSize: 12, color: C.heart, fontWeight: 600, marginTop: 5, fontFamily: FONTS.ui }}>{f.err}</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── CARDS TAB ───────────────────────────────────────────────────────────────
function CardsTab() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>

      {/* Event Card */}
      <div style={{ flex: '1 1 300px', maxWidth: 340 }}>
        <Lbl>Event Card</Lbl>
        <div style={{ background: '#fff', borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,23,42,0.09)' }}>
          <div style={{ background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700, fontFamily: FONTS.ui }}>⚽ Soccer</span>
            <span style={{ background: '#059669', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONTS.ui }}>Open</span>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 21, fontWeight: 900, color: C.ink, fontFamily: FONTS.heading, letterSpacing: -0.3, marginBottom: 10 }}>Saturday Pickup</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: C.inkSoft, fontFamily: FONTS.ui }}>📅 Sat, Jun 7 · 6:00 – 8:00 PM</span>
              <span style={{ fontSize: 13, color: C.inkSoft, fontFamily: FONTS.ui }}>📍 Eastside Park, Field 3</span>
            </div>
            <div style={{ height: 1, background: C.border, marginBottom: 14 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {['#2563EB','#059669','#7C3AED','#EA580C'].map((c, i) => (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: 999, background: c, border: '2.5px solid #fff', marginLeft: i > 0 ? -9 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: FONTS.ui }}>P</div>
                ))}
                <div style={{ width: 30, height: 30, borderRadius: 999, background: C.surface, border: `2.5px solid ${C.border}`, marginLeft: -9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.inkMuted, fontWeight: 700, fontFamily: FONTS.ui }}>+8</div>
              </div>
              <button style={{ background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.ui, boxShadow: `0 3px 10px rgba(37,99,235,0.38)` }}>Join Up</button>
            </div>
          </div>
        </div>
      </div>

      {/* Player + Empty State */}
      <div style={{ flex: '1 1 300px', maxWidth: 340 }}>
        <Lbl>Player Card</Lbl>
        <div style={{ background: '#fff', borderRadius: 18, border: `1px solid ${C.border}`, padding: 18, boxShadow: '0 4px 16px rgba(15,23,42,0.09)', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 54, height: 54, borderRadius: 999, background: `linear-gradient(135deg, ${C.cobalt}, #7C3AED)`, border: `3px solid ${C.cobalt}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: FONTS.ui }}>JK</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: C.ink, fontFamily: FONTS.heading }}>Jordan K.</div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2, fontFamily: FONTS.ui }}>Midfielder · 24 games</div>
            <div style={{ marginTop: 7 }}>
              <span style={{ background: '#2563EB', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONTS.ui }}>League</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>🫡</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: FONTS.ui }}>12</div>
          </div>
        </div>

        <Lbl>Empty State</Lbl>
        <div style={{ background: '#fff', borderRadius: 18, border: `1px solid ${C.border}`, padding: '36px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15,23,42,0.09)' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📅</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.ink, fontFamily: FONTS.heading, marginBottom: 8 }}>No Events Yet</div>
          <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6, marginBottom: 20, fontFamily: FONTS.ui }}>No upcoming events nearby. Create one and muster the troops.</div>
          <button style={{ background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.ui, boxShadow: `0 4px 14px rgba(37,99,235,0.38)` }}>Create Event</button>
        </div>
      </div>
    </div>
  );
}

// ─── SCREENS TAB ─────────────────────────────────────────────────────────────
function ScreensTab() {
  const [screen, setScreen] = useState('home');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {['home', 'event', 'profile', 'auth'].map(s => (
          <button key={s} onClick={() => setScreen(s)} style={{
            background: screen === s ? C.cobalt : '#fff',
            color: screen === s ? '#fff' : C.inkSoft,
            border: `1.5px solid ${screen === s ? C.cobalt : C.border}`,
            borderRadius: 9, padding: '7px 20px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONTS.ui,
            boxShadow: screen === s ? `0 4px 12px rgba(37,99,235,0.30)` : 'none',
            transition: 'all 0.12s',
          }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Phone frame */}
        <div style={{ width: 340, border: '8px solid #0F172A', borderRadius: 46, overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.22)', background: C.surface }}>
          {screen === 'home'    && <HomeScreen />}
          {screen === 'event'   && <EventScreen />}
          {screen === 'profile' && <ProfileScreen />}
          {screen === 'auth'    && <AuthScreen />}
        </div>

        {/* Annotations */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 12, fontFamily: FONTS.ui }}>Layout constants</div>
            {[
              ['Screen bg',    '#F8FAFF'],
              ['Card radius',  '18px'],
              ['CTA height',   '52px'],
              ['CTA shadow',   'cobalt · 40% opacity'],
              ['Tab bar',      '64px · white'],
              ['Border',       '#E2E8F0 · 1px'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontFamily: FONTS.ui }}>
                <span style={{ color: C.inkSoft, fontWeight: 600 }}>{k}</span>
                <span style={{ color: C.ink, fontFamily: 'monospace', fontSize: 11 }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 10, fontFamily: FONTS.ui }}>Color semantics</div>
            {[
              { color: C.cobalt,  label: 'cobalt = primary action' },
              { color: C.pine,    label: 'pine = open / success' },
              { color: C.gold,    label: 'gold = salute only' },
              { color: C.heart,   label: 'heart = Step Out / error' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.inkSoft, fontFamily: FONTS.ui }}>{r.label}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN MOCKUPS ──────────────────────────────────────────────────────────
function HomeScreen() {
  return (
    <div style={{ background: C.surface, minHeight: 620, display: 'flex', flexDirection: 'column', fontFamily: FONTS.ui }}>
      <div style={{ background: '#fff', padding: '22px 16px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: C.inkMuted }}>Good Evening</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, fontFamily: FONTS.heading, letterSpacing: -0.3 }}>Jordan 👋</div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 999, background: `linear-gradient(135deg, ${C.cobalt}, #7C3AED)`, border: `2.5px solid ${C.cobalt}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>JK</div>
        </div>
      </div>
      <div style={{ padding: '14px 12px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: C.inkMuted, marginBottom: 10 }}>Upcoming · 3</div>
        {[
          { title: 'Saturday Pickup', sport: '⚽ Soccer', time: '6:00 PM', status: 'Open', sbg: '#059669', stc: '#fff' },
          { title: 'Tuesday League',  sport: '🏒 Hockey', time: '8:00 PM', status: 'Few Spots', sbg: '#D97706', stc: '#fff' },
        ].map(e => (
          <div key={e.title} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <div style={{ background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 700 }}>{e.sport}</span>
              <span style={{ background: e.sbg, color: e.stc, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{e.status}</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: C.ink, fontFamily: FONTS.heading }}>{e.title}</div>
              <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 3 }}>Sat · {e.time} · Eastside Park</div>
              <button style={{ background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 10, boxShadow: `0 2px 8px rgba(37,99,235,0.35)` }}>Join Up</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '8px 0 6px', display: 'flex', justifyContent: 'space-around' }}>
        {[['🏠','Home',true],['🔍','Discover',false],['📅','Schedule',false],['👤','Profile',false]].map(([ic,lb,ac]) => (
          <div key={lb} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{ic}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: ac ? C.cobalt : C.inkMuted, marginTop: 1 }}>{lb}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventScreen() {
  return (
    <div style={{ background: C.surface, minHeight: 620, display: 'flex', flexDirection: 'column', fontFamily: FONTS.ui }}>
      <div style={{ background: `linear-gradient(160deg, ${C.cobalt} 0%, #1D4ED8 100%)`, padding: '20px 16px 22px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>← Events</div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 900, fontFamily: FONTS.heading, letterSpacing: -0.3 }}>Saturday Pickup</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>⚽ Soccer · Eastside Park</div>
        <span style={{ background: '#059669', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'inline-block', marginTop: 12 }}>Open · 8 spots</span>
      </div>
      <div style={{ padding: '14px 14px', flex: 1 }}>
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: 14, marginBottom: 12, boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
          <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 2.1 }}>📅 Sat, Jun 7 · 6:00 – 8:00 PM<br/>📍 Eastside Park, Field 3<br/>👤 Marcus R.</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: C.inkMuted, marginBottom: 10 }}>Roster · 12 Players</div>
        <div style={{ display: 'flex', marginBottom: 14 }}>
          {['#2563EB','#059669','#7C3AED','#EA580C','#0284C7'].map((c,i) => (
            <div key={i} style={{ width: 34, height: 34, borderRadius: 999, background: c, border: '2.5px solid #fff', marginLeft: i>0?-10:0, display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700 }}>P</div>
          ))}
          <div style={{ width: 34, height: 34, borderRadius: 999, background: C.surface, border: `2.5px solid ${C.border}`, marginLeft: -10, display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:C.inkMuted,fontWeight:700 }}>+7</div>
        </div>
      </div>
      <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '14px 16px 22px' }}>
        <button style={{ background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, color: '#fff', border: 'none', borderRadius: 14, height: 52, width: '100%', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 16px rgba(37,99,235,0.40)` }}>Join Up</button>
      </div>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div style={{ background: C.surface, minHeight: 620, display: 'flex', flexDirection: 'column', fontFamily: FONTS.ui }}>
      <div style={{ background: '#fff', padding: '20px 16px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, fontFamily: FONTS.heading }}>Profile</div>
        <button style={{ background: 'transparent', color: C.cobalt, border: `1.5px solid ${C.cobalt}`, borderRadius: 8, padding: '5px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
      </div>
      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: `linear-gradient(135deg, ${C.cobalt}, #7C3AED)`, border: `3px solid ${C.cobalt}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22 }}>JK</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: C.ink, fontFamily: FONTS.heading }}>Jordan K.</div>
            <div style={{ fontSize: 13, color: C.inkSoft }}>Midfielder · since 2023</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[['24','Games',C.cobalt],['47','Salutes 🫡',C.gold],['3','Leagues',C.cobalt]].map(([v,l,col]) => (
            <div key={l} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, padding: '12px 0', textAlign: 'center', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: col, fontFamily: FONTS.heading }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: C.inkMuted, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        {['Saturday Pickup','Tuesday League','Sunday 5v5'].map(g => (
          <div key={g} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{g}</div>
            <span style={{ fontSize: 16 }}>🫡</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthScreen() {
  return (
    <div style={{ background: C.surface, minHeight: 620, display: 'flex', flexDirection: 'column', fontFamily: FONTS.ui }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 24px 16px' }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, marginBottom: 20, boxShadow: `0 8px 28px rgba(37,99,235,0.40)` }}>🫡</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: C.ink, fontFamily: FONTS.heading, letterSpacing: -0.5, textAlign: 'center' }}>Muster</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.inkSoft, fontStyle: 'italic', fontFamily: FONTS.heading, marginBottom: 32 }}>the Troops.</div>
        {['Email','Password'].map(f => (
          <div key={f} style={{ width: '100%', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: C.inkSoft, marginBottom: 6 }}>{f}</div>
            <div style={{ border: `1.5px solid ${C.borderStrong}`, borderRadius: 12, height: 48, padding: '0 14px', display: 'flex', alignItems: 'center', background: '#fff' }}>
              <span style={{ fontSize: 14, color: C.inkMuted }}>{f === 'Email' ? 'you@example.com' : '••••••••'}</span>
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'right', width: '100%', marginTop: -6 }}>
          <span style={{ fontSize: 13, color: C.cobalt, fontWeight: 700 }}>Forgot password?</span>
        </div>
      </div>
      <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '16px 24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button style={{ background: `linear-gradient(135deg, ${C.cobalt}, #1D4ED8)`, color: '#fff', border: 'none', borderRadius: 14, height: 52, width: '100%', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 16px rgba(37,99,235,0.42)` }}>Sign In</button>
        <div style={{ textAlign: 'center', fontSize: 13, color: C.inkSoft }}>No account? <span style={{ color: C.cobalt, fontWeight: 700 }}>Sign Up</span></div>
      </div>
    </div>
  );
}
