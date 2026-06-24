interface Props {
  className?: string;
  color?: string;
  flip?: boolean;
}

/**
 * A simplified ulzii (Mongolian endless-knot) flourish in ink line-art, used to
 * flank the title. Deliberately stylized — swap for a hand-drawn asset later.
 */
export function UlziiKnot({ className, color = '#5C4033', flip }: Props) {
  return (
    <svg
      viewBox="0 0 120 36"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* interlaced loops trailing off toward the title */}
      <path d="M6 18h14" />
      <path d="M20 6h10v24H20zM30 6h10v24H30" />
      <rect x="44" y="8" width="20" height="20" rx="3" transform="rotate(45 54 18)" />
      <path d="M70 6h10v24H70zM80 6h10v24H80" />
      <path d="M100 18h14" />
    </svg>
  );
}
