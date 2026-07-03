import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'coin';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Mongolian (Cyrillic) subtitle shown under the English label. */
  sub?: ReactNode;
  /** Force the coin variant to render as a passive grey metal medallion instead of glowing gold. */
  secondary?: boolean;
}

/** A chunky, carved-wood plank button or a round bronze medallion button. */
export function Button({
  variant = 'primary',
  sub,
  secondary,
  className = '',
  children,
  ...rest
}: Props) {
  if (variant === 'coin') {
    const coinColorClass = rest.disabled || secondary ? 'btn-coin--grey' : 'btn-coin--gold';
    return (
      <button className={`btn-coin ${coinColorClass} ${className}`} {...rest}>
        <span className="text-base font-bold leading-none">{children}</span>
        {sub != null && <span className="text-[10px] opacity-80 mt-0.5 leading-none">{sub}</span>}
      </button>
    );
  }
  const v = variant === 'primary' ? 'btn-wood btn-wood--primary' : 'btn-wood';
  return (
    <button className={`${v} ${className}`} {...rest}>
      <span className="btn-wood__en">{children}</span>
      {sub != null && <span className="btn-wood__sub">{sub}</span>}
    </button>
  );
}
