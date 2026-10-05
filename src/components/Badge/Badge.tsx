import type { HTMLAttributes } from 'react';
import tokens from '../../tokens/badges.json';
import '../../styles/badge-tokens.css';
import styles from './Badge.module.css';

export type BadgeVariant = 'small' | 'medium' | 'large' | 'xs' | 'count' | 'Count' | 'status online' | 'status ofline';
type CommonProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & { text?: string };
export type BadgeProps = CommonProps & (
  { theme?: 'light'; variant?: Exclude<BadgeVariant, 'xs' | 'count'> } |
  { theme: 'dark'; variant?: Exclude<BadgeVariant, 'Count'> }
);

export function Badge({ theme = 'light', variant, text, className, ...props }: BadgeProps) {
  const sourceVariant = variant ?? tokens.definitions[theme]['Property 1'].defaultValue;
  const row = tokens.records.find(r => r.theme === theme && r.variant === sourceVariant);
  if (!row) throw Error(`Badge has no Figma variant: ${theme}/${sourceVariant}`);
  return <span {...props} className={[styles.badge, className].filter(Boolean).join(' ')} data-badge data-badge-theme={theme} data-badge-variant={sourceVariant} data-source-node={row.nodeId} data-badge-count={row.textNodeId ? '' : undefined}>
    {row.textNodeId && <span className={styles.text} data-source-text={text === undefined || text === row.defaultText ? '' : undefined}>{text ?? row.defaultText}</span>}
    {row.shapes.filter(s => s.visible).map(shape => <svg key={shape.nodeId} className={styles.shape} aria-hidden="true" focusable="false" width={shape.width} height={shape.height} viewBox={`0 0 ${shape.width} ${shape.height}`} style={{ left: shape.x, top: shape.y, opacity: shape.opacity }}>
      <ellipse cx={shape.width / 2} cy={shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
    </svg>)}
  </span>;
}
