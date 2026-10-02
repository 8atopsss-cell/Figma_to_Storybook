import type { ComponentPropsWithRef, ReactNode } from 'react';
import '../../styles/icon-button-tokens.css';
import styles from './IconButton.module.css';

export type IconButtonVariant = 'primary' | 'tertiary' | 'ghost';
export type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> & {
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: 18 | 24;
  contrast?: 'high' | 'low';
  icon?: ReactNode;
};
export function IconButton({ variant = 'primary', size = 18, contrast = 'high', icon, type = 'button', className, ...native }: IconButtonProps) {
  return <button {...native} type={type} className={[styles.button, className].filter(Boolean).join(' ')} data-icon-button data-variant={variant} data-size={size} data-contrast={variant === 'ghost' ? contrast : 'high'}>
    <span className={styles.background} aria-hidden="true" data-mini-background />
    {icon == null ? <span className={styles.glyph} aria-hidden="true" data-mini-glyph /> : <span className={styles.customIcon} aria-hidden="true">{icon}</span>}
  </button>;
}
