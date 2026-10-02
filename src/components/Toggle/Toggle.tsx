import type { ComponentPropsWithRef } from 'react';
import tokens from '../../tokens/toggles.json';
import styles from './Toggle.module.css';
import '../../styles/toggle-tokens.css';

export type ToggleVariant = 'disable dark' | 'Enable dark' | 'Enable danger dark' | 'unactive on dark' | 'unactive off dark' | 'enable light' | 'unactive light' | 'disable light';
export type ToggleProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children' | 'checked' | 'defaultChecked' | 'disabled' | 'role'> & { variant?: ToggleVariant; danger?: boolean };

export function Toggle({ variant = tokens.defaultVariant as ToggleVariant, danger = false, className, ...props }: ToggleProps) {
  const effectiveVariant = danger && variant === 'Enable dark' ? 'Enable danger dark' : variant;
  const source = tokens.records.find(row => row.variant === effectiveVariant)!;
  return <span className={[styles.toggle, className].filter(Boolean).join(' ')} data-toggle-variant={effectiveVariant}>
    <input {...props} type="checkbox" role="switch" checked={source.checked} disabled={source.disabled} className={styles.input} />
    <span aria-hidden="true" className={styles.track} data-toggle-track />
    <span aria-hidden="true" className={styles.thumb} data-toggle-thumb />
  </span>;
}
