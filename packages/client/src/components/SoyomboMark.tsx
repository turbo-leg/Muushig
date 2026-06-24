interface Props {
  className?: string;
  color?: string;
}

/**
 * A stylized soyombo-inspired emblem (flame · sun · crescent) rendered as gold
 * line art. Deliberately simplified — not the exact national symbol — used as
 * the card back motif and the trump mark. See ART_DIRECTION.md §10.
 */
export function SoyomboMark({ className, color = '#D4AF37' }: Props) {
  return (
    <svg viewBox="0 0 48 64" className={className} fill="none" aria-hidden>
      {/* flame */}
      <path d="M24 4c2 4 5 6 5 9a5 5 0 0 1-10 0c0-3 3-5 5-9Z" fill={color} opacity="0.9" />
      <path
        d="M19 9c-2 2-3 4-1 6M29 9c2 2 3 4 1 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* sun disc */}
      <circle cx="24" cy="26" r="4" fill={color} />
      {/* crescent moon */}
      <path d="M19 38a6 6 0 1 0 8 5 5 5 0 0 1-8-5Z" fill={color} opacity="0.85" />
      {/* two bars (earth / steadfastness) */}
      <rect x="12" y="50" width="24" height="2.4" rx="1.2" fill={color} opacity="0.8" />
      <rect x="12" y="56" width="24" height="2.4" rx="1.2" fill={color} opacity="0.8" />
    </svg>
  );
}
