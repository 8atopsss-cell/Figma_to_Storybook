import type { ComponentPropsWithRef, ReactNode } from 'react';
import { defaults, sizes, variants } from '../../tokens/api';
import styles from './Button.module.css';
export type ButtonVariant = typeof variants[number];
export type ButtonProps = ComponentPropsWithRef<'button'> & { variant?: ButtonVariant; size?: typeof sizes[number]; startIcon?: ReactNode; endIcon?: ReactNode; fullWidth?: boolean };
export function Button({ variant = defaults.variant, size = defaults.size, startIcon, endIcon, fullWidth = false, type = 'button', className, children, ...native }: ButtonProps) {
  return (
    <button {...native} type={type} className={[styles.button, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ')} data-button data-variant={variant} data-size={size}>
      {startIcon != null && <span className={styles.icon} aria-hidden="true">{startIcon}</span>}
      <span className={styles.label}>{children}</span>
      {endIcon != null && <span className={styles.icon} aria-hidden="true">{endIcon}</span>}
    </button>
  );
}
