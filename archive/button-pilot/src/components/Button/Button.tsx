import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'ghost-orange' | 'danger';
  size?: 32 | 40;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({ children, variant = 'primary', size = 32, startIcon, endIcon, fullWidth = false, type = 'button', className, ...props }: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 40 && styles.size40, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ');
  return (
    <button {...props} type={type} className={classes}>
      {startIcon != null && <span className={styles.icon} aria-hidden="true">{startIcon}</span>}
      <span className={styles.label}>{children}</span>
      {endIcon != null && <span className={styles.icon} aria-hidden="true">{endIcon}</span>}
    </button>
  );
}
