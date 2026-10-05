import type { HTMLAttributes } from 'react';
import tokens from '../../tokens/resource-tags.json';
import '../../styles/resource-tag-tokens.css';
import styles from './ResourceTag.module.css';

export type ResourceTagVariant = 'new' | 'new disable' | 'active' | 'active disable' | 'new pattern' | 'added pattern' | 'delited';
type BaseProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & { text?: string; status?: boolean; statusState?: 'online' | 'offline' };
export type ResourceTagProps = BaseProps & { theme?: 'light' | 'dark'; variant?: ResourceTagVariant };

export function ResourceTag({ theme = 'light', variant, text, status, statusState = 'online', className, ...props }: ResourceTagProps) {
  const definitions = tokens.definitions[theme];
  const sourceVariant = variant ?? definitions['Property 1'].defaultValue;
  const row = tokens.records.find(r => r.theme === theme && r.variant === sourceVariant);
  if (!row) throw Error(`ResourceTag has no Figma variant: ${theme}/${sourceVariant}`);
  const sourceText = text ?? definitions['Text#1600:4'].defaultValue;
  const showStatus = status ?? (theme === 'dark' ? tokens.definitions.dark['status#14963:0'].defaultValue : tokens.definitions.light['status#14963:9'].defaultValue);
  return <span {...props} className={[styles.tag, className].filter(Boolean).join(' ')} data-resource-tag data-tag-theme={theme} data-tag-variant={sourceVariant} data-status-state={statusState} data-source-node={row.nodeId}>
    {row.labelNodeId && <span className={styles.label}>{sourceText}</span>}
    {showStatus && row.statusPropertyId && <span className={styles.badge} aria-hidden="true"><span className={styles.dot} /></span>}
  </span>;
}
