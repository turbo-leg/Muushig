import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  'inline-flex items-center justify-center min-h-11 px-6 rounded-md font-body font-semibold ' +
  'cursor-pointer transition-colors duration-200 focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-khokh focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-night disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<Variant, string> = {
  primary:
    'bg-gold text-night hover:bg-gold-soft hover:shadow-glow-gold ' +
    'disabled:bg-void-raised disabled:text-starlight-faint disabled:shadow-none',
  secondary:
    'bg-transparent text-khokh-soft border border-khokh hover:bg-khokh/10 ' +
    'disabled:border-starlight-faint disabled:text-starlight-faint',
};

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}
