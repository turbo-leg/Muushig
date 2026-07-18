interface Props {
  className?: string;
  color?: string;
  flip?: boolean;
}

export function MongolianCloud({ className, color = 'rgba(218, 170, 61, 0.4)', flip }: Props) {
  return (
    <svg
      viewBox="0 0 160 100"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* Center cloud puff */}
      <path d="M40 70 C 40 50, 60 40, 80 40 C 100 40, 120 50, 120 70" />
      {/* Left side billows */}
      <path d="M20 75 C 15 60, 30 50, 45 55" />
      <path d="M10 80 C 5 70, 15 65, 25 70" />
      {/* Right side billows */}
      <path d="M140 75 C 145 60, 130 50, 115 55" />
      <path d="M150 80 C 155 70, 145 65, 135 70" />
      {/* Bottom curls and swirls */}
      <path d="M15 80 C 25 80, 35 75, 45 80 C 55 85, 65 85, 75 80 C 85 75, 95 75, 105 80 C 115 85, 125 85, 135 80 C 145 80, 150 85, 155 80" />
      <path
        d="M50 50 C 45 40, 55 30, 70 32 C 80 20, 100 20, 108 30 C 118 30, 125 38, 120 48"
        opacity="0.85"
      />
      {/* Inner decorative swirls */}
      <path d="M60 60 Q 75 52 80 62 Q 85 72 95 62" opacity="0.6" />
      <path d="M35 68 Q 45 60 50 68" opacity="0.5" />
      <path d="M110 68 Q 115 60 125 68" opacity="0.5" />
    </svg>
  );
}
