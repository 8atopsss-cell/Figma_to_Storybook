import type { ComponentPropsWithRef, ReactNode } from 'react';
import tokens from '../../tokens/menu-buttons.json';
import { Badge } from '../Badge/Badge';
import '../../styles/menu-button-tokens.css';
import styles from './MenuButton.module.css';

export type MenuButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  theme?: 'light' | 'dark';
  text?: string;
  showLabel?: boolean;
  icon?: ReactNode;
  /** Persistent current navigation item; separate from the native pressed state. */
  isSelected?: boolean;
  /** Existing Badge medium; light placement derives from the dark MenuButton. */
  badge?: boolean;
};

export function MenuButton({ theme = 'dark', text, showLabel = true, icon, isSelected = false, badge = false, type = 'button', className, 'aria-label': accessibleLabel, ...props }: MenuButtonProps) {
  const row = tokens.records.find(r => r.theme === theme && r.state === 'default')!;
  const label = text ?? row.defaultText;
  return <button {...props} type={type} className={[styles.root, className].filter(Boolean).join(' ')}
    aria-label={accessibleLabel ?? (!showLabel ? label : undefined)} data-menu-button data-menu-theme={theme} data-menu-selected={isSelected ? 'true' : undefined}>
    <span className={styles.content}>
      <span className={styles.icon} data-custom-icon={icon !== undefined ? '' : undefined} aria-hidden="true">{icon}</span>
      {showLabel && <span className={styles.label} data-source-text={label === row.defaultText ? '' : undefined}>{label}</span>}
    </span>
    {badge && <span className={styles.badge} aria-hidden="true"><Badge theme={theme} variant="medium" /></span>}
  </button>;
}
