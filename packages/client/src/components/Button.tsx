import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** A chunky, carved-wood button (see .btn-wood in index.css). */
export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const v = variant === 'primary' ? 'btn-wood btn-wood--primary' : 'btn-wood';
  return <button className={`${v} ${className}`} {...rest} />;
}
