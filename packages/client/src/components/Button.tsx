import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Mongolian (Cyrillic) subtitle shown under the English label. */
  sub?: ReactNode;
}

/** A chunky, carved-wood plank button with nail heads (see .btn-wood in index.css). */
export function Button({ variant = 'primary', sub, className = '', children, ...rest }: Props) {
  const v = variant === 'primary' ? 'btn-wood btn-wood--primary' : 'btn-wood';
  return (
    <button className={`${v} ${className}`} {...rest}>
      <span className="btn-wood__en">{children}</span>
      {sub != null && <span className="btn-wood__sub">{sub}</span>}
    </button>
  );
}
