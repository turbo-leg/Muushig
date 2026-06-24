/*
 * Muushig — "Tengri Nights" Tailwind theme fragment.
 * Spread into tailwind.config theme.extend when @muushig/client is set up.
 * Keeps class names aligned with tokens.css (e.g. bg-void, text-gold, ...).
 */
module.exports = {
  colors: {
    night: '#0A0E27',
    void: '#11183A',
    'void-raised': '#19224D',
    khokh: { DEFAULT: '#3AA0D6', soft: '#6FC0E6' },
    gold: { DEFAULT: '#D4AF37', soft: '#EBCB6A' },
    aurora: '#7C5CFF',
    starlight: { DEFAULT: '#E8ECF8', muted: '#A9B2CE', faint: '#5C6790' },
    success: '#46C28E',
    danger: '#E5544B',
  },
  fontFamily: {
    display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
    body: ['Manrope', 'system-ui', 'sans-serif'],
  },
  fontSize: {
    display: ['3.05rem', { lineHeight: '1.15' }],
    h1: ['2.44rem', { lineHeight: '1.15' }],
    h2: ['1.95rem', { lineHeight: '1.15' }],
    h3: ['1.56rem', { lineHeight: '1.2' }],
    body: ['1rem', { lineHeight: '1.6' }],
    small: ['0.8rem', { lineHeight: '1.5' }],
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    card: '14px',
    lg: '20px',
  },
  boxShadow: {
    panel: '0 24px 60px rgba(0,0,0,0.55)',
    'glow-gold': '0 0 24px rgba(212,175,55,0.35)',
    'glow-khokh': '0 0 24px rgba(58,160,214,0.35)',
    'card-inner': 'inset 0 0 24px rgba(212,175,55,0.08)',
  },
  zIndex: {
    bg: '0',
    table: '10',
    cards: '20',
    active: '25',
    toast: '40',
    modal: '50',
    reveal: '60',
  },
  transitionTimingFunction: {
    enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
  },
};
