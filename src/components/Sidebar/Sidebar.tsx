import { useState, type ComponentPropsWithRef, type CSSProperties } from 'react';
import { MenuButton } from '../MenuButton/MenuButton';
import { sidebarAssets } from '../../assets/sidebars';
import tokens from '../../tokens/sidebars.json';
import menuTokens from '../../tokens/menu-buttons.json';
import type { SidebarItemId } from '../../tokens/sidebar-api';
import '../../styles/sidebar-tokens.css';
import styles from './Sidebar.module.css';

export type SidebarLayout = 'expanded' | 'compact';
export type SidebarProps = Omit<ComponentPropsWithRef<'aside'>, 'children' | 'onSelect'> & {
  theme?: 'light' | 'dark';
  layout?: SidebarLayout;
  selectedId?: SidebarItemId | null;
  defaultSelectedId?: SidebarItemId | null;
  badgeItemIds?: readonly SidebarItemId[];
  onSelectItem?: (itemId: SidebarItemId) => void;
};

export function Sidebar({ theme = 'light', layout = 'expanded', selectedId, defaultSelectedId, badgeItemIds = [], onSelectItem, className, ...props }: SidebarProps) {
  const row = tokens.records.find(r => r.theme === theme && r.layout === layout)!;
  const [internalSelectedId, setInternalSelectedId] = useState<SidebarItemId | null>(() => defaultSelectedId !== undefined ? defaultSelectedId : row.defaultSelectedId as SidebarItemId | null);
  const currentId = selectedId !== undefined ? selectedId : internalSelectedId;
  const hoverAppearance = menuTokens.records.find(r => r.theme === theme && r.state === 'hover')!.css;
  const [highlight, setHighlight] = useState<{ y: number; height: number; visible: boolean } | null>(null);
  const moveHighlight = (button: HTMLElement) => setHighlight({ y: button.offsetTop, height: button.offsetHeight, visible: true });
  const dimHighlight = () => setHighlight(previous => previous ? { ...previous, visible: false } : previous);
  return <aside {...props} className={[styles.root, className].filter(Boolean).join(' ')} aria-label={props['aria-label'] ?? row.productName}
    data-sidebar data-sidebar-theme={theme} data-sidebar-layout={layout} data-source-node={row.nodeId}>
    <img className={styles.productName} src={sidebarAssets[row.titleAsset.key]} width={row.titleAsset.width} height={row.titleAsset.height} alt="" aria-hidden="true" />
    <img className={styles.footer} src={sidebarAssets[row.footerAsset.key]} width={row.footerAsset.width} height={row.footerAsset.height} alt="" aria-hidden="true" />
    <img className={styles.divider} src={sidebarAssets[row.dividerAsset.key]} alt="" aria-hidden="true" />
    <h2 className={styles.srOnly}>{row.productName}</h2>
    <nav className={styles.navigation} aria-label="Основная навигация"
      onPointerLeave={event => {
        const focused = event.currentTarget.querySelector<HTMLElement>('button:focus-visible');
        if (focused) moveHighlight(focused); else dimHighlight();
      }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) dimHighlight(); }}>
      {highlight && <span className={styles.highlight} aria-hidden="true" data-visible={highlight.visible}
        style={{ transform: `translateY(${highlight.y}px)`, height: highlight.height, background: hoverAppearance.background, borderRadius: hoverAppearance.radius }} />}
      {row.items.map(item => {
        const id = item.id as SidebarItemId;
        const isSelected = currentId === id;
        return <MenuButton key={id} className={styles.item} theme={theme} text={item.label} showLabel={layout === 'expanded'}
          icon={<span className={styles.icon} style={{ width: item.iconWidth, height: item.iconHeight, '--sidebar-icon-mask': `url("${sidebarAssets[item.assetKey]}")` } as CSSProperties} />}
          isSelected={isSelected} aria-current={isSelected ? 'page' : undefined} badge={badgeItemIds.includes(id)}
          title={layout === 'compact' ? item.label : undefined} data-sidebar-item={id} data-source-node={item.sourceNodeId} data-source-origin={item.origin}
          onPointerEnter={event => { if (event.pointerType !== 'touch') moveHighlight(event.currentTarget); }}
          onFocus={event => { if (event.currentTarget.matches(':focus-visible')) moveHighlight(event.currentTarget); }}
          onClick={() => { if (selectedId === undefined) setInternalSelectedId(id); onSelectItem?.(id); }} />;
      })}
    </nav>
  </aside>;
}
