import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button, type ButtonVariant } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { IconButton, type IconButtonVariant } from '../IconButton/IconButton';
import { ResourceTag, type ResourceTagVariant } from '../ResourceTag/ResourceTag';
import { Toggle, type ToggleVariant } from '../Toggle/Toggle';
import sourceTokens from '../../tokens/table-rows.json';
import toggleTokens from '../../tokens/toggles.json';
import '../../styles/tokens.css';
import '../../styles/figma-styles.css';
import '../../styles/table-row-tokens.css';
import styles from './TableRow.module.css';

export type TableRowVariant = 'active' | 'new' | 'delited' | 'blocked' | 'selected' | 'hover' | 'header' | 'action bar';
export type TableRowSortDirection = 'ascending' | 'descending';
export type TableRowSort = { column: string; direction: TableRowSortDirection };
type DataField = 'userName' | 'armName' | 'ipAddress' | 'date' | 'time' | 'resourceText' | 'secondResourceText' | 'moreText';
type Theme = 'light' | 'dark';
export type TableRowProps = Omit<ComponentPropsWithRef<'tr'>, 'children'> & {
  theme?: Theme;
  variant?: TableRowVariant;
  userName?: string;
  armName?: string;
  ipAddress?: string;
  date?: string;
  time?: string;
  resourceText?: string;
  secondResourceText?: string;
  moreText?: string;
  selected?: boolean;
  enabled?: boolean;
  warning?: boolean;
  more?: boolean;
  vd1?: boolean;
  vd2?: boolean;
  sort?: TableRowSort | null;
  onSelectChange?: (selected: boolean) => void;
  onEnabledChange?: (enabled: boolean) => void;
  onAction?: (action: string) => void;
  onSort?: (column: string, direction: TableRowSortDirection) => void;
};

type Layer = {
  id: string;
  name: string;
  kind: 'frame' | 'text' | 'asset' | 'line' | 'checkbox' | 'toggle' | 'resource' | 'iconButton' | 'button';
  visible: boolean;
  visibilityProperty: string | null;
  text?: string | null;
  dataField?: DataField | null;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  theme?: Theme;
  variant?: string;
  contrast?: 'high' | 'low';
  status?: boolean;
  size?: 32 | 40;
  action?: string;
  children: Layer[];
};
type Cell = { key: string; label: string; width: number; children: Layer[] };
type RowRecord = { theme: Theme; variant: TableRowVariant; nodeId: string; width: number; height: number; cells: Cell[] };
const records = sourceTokens.records as unknown as RowRecord[];
type SortInteraction = { direction: TableRowSortDirection | 'none'; onClick: () => void };

function visible(node: Layer, props: TableRowProps) {
  const field = node.visibilityProperty?.split('#')[0];
  if (field === 'warning' || field === 'more' || field === 'vd1' || field === 'vd2') return props[field] ?? node.visible;
  return node.visible;
}

function containsSortIcon(nodes: Layer[], props: TableRowProps): boolean {
  return nodes.some(node => visible(node, props) && ((node.kind === 'asset' && node.name.includes('sort')) || containsSortIcon(node.children, props)));
}

function Glyph({ node, theme, sorting }: { node: Layer; theme?: Theme; sorting?: SortInteraction }) {
  const icon = sorting ? sourceTokens.headerSort.records.find(record => record.theme === theme && record.state === sorting.direction) : undefined;
  return <span className={styles.glyph} data-table-layer={node.id} data-sort-source-node={icon?.nodeId} aria-hidden="true"
    style={icon ? { maskImage: `url("data:image/svg+xml,${encodeURIComponent(icon.svg)}")`, backgroundColor: icon.color } : undefined} />;
}

function LayerView({ node, props, column, sorting }: { node: Layer; props: TableRowProps; column: string; sorting?: SortInteraction }): ReactNode {
  if (!visible(node, props)) return null;
  const common = { 'data-table-layer': node.id, 'data-source-node': node.id, className: styles.layer };
  switch (node.kind) {
    case 'text': {
      const text = node.dataField ? props[node.dataField] ?? node.text : node.text;
      return <span {...common} data-sort-label={sorting ? '' : undefined} title={text ?? undefined}>{text}</span>;
    }
    case 'checkbox':
      return <span {...common}><Checkbox checked={props.selected ?? node.checked} indeterminate={node.indeterminate && props.selected === undefined}
        disabled={node.disabled} aria-label={props.variant === 'header' || props.variant === 'action bar' ? 'Выбрать все записи' : `Выбрать ${props.userName ?? 'запись'}`}
        onChange={event => props.onSelectChange?.(event.target.checked)}>{node.text}</Checkbox></span>;
    case 'toggle': {
      const source = toggleTokens.records.find(row => row.variant === node.variant)!;
      const theme = props.theme ?? 'light';
      // User decision: table toggles start enabled in danger mode in both themes.
      const checked = props.enabled ?? true;
      const variant = source.disabled ? source.variant : checked ? `Enable danger ${theme}` : `disable ${theme}`;
      return <span {...common}><Toggle variant={variant as ToggleVariant} danger aria-label={`Включить ${props.userName ?? 'запись'}`}
        onChange={event => props.onEnabledChange?.(event.target.checked)} /></span>;
    }
    case 'resource':
      return <span {...common}><ResourceTag theme={node.theme} variant={node.variant as ResourceTagVariant}
        text={node.dataField ? props[node.dataField] ?? node.text ?? undefined : node.text ?? undefined} status={node.status} /></span>;
    case 'iconButton':
      return <span {...common}><IconButton variant={node.variant as IconButtonVariant} size={18} contrast={node.contrast} disabled={node.disabled}
        aria-label={node.action === 'edit' ? 'Редактировать запись' : 'Запустить действие'} onClick={() => props.onAction?.(node.action ?? 'action')}
        icon={node.children.map(child => <Glyph key={child.id} node={child} />)} /></span>;
    case 'button':
      return <span {...common}><Button variant={node.variant as ButtonVariant} size={node.size} disabled={node.disabled}
        aria-label={node.text ? undefined : node.action} onClick={() => props.onAction?.(node.action ?? 'action')}
        startIcon={node.children.length ? node.children.map(child => <Glyph key={child.id} node={child} />) : undefined}>{node.text}</Button></span>;
    case 'asset':
      return node.name.includes('sort') && sorting ? <button {...common} type="button" className={`${styles.layer} ${styles.sort}`}
        aria-label={`Сортировать: ${column}`} aria-pressed={sorting.direction !== 'none'} onClick={sorting.onClick}>
        <Glyph node={node} theme={props.theme} sorting={sorting} /></button> : <Glyph node={node} />;
    case 'line':
      return <span {...common} aria-hidden="true" />;
    default:
      return <span {...common}>{node.children.map(child => <LayerView key={child.id} node={child} props={props} column={column} sorting={sorting} />)}</span>;
  }
}

/** Place inside table/tbody (or thead for variant="header"). Source width: 1052px. */
export function TableRow({ theme = 'light', variant = sourceTokens.defaultVariant as TableRowVariant, className, userName, armName,
  ipAddress, date, time, resourceText, secondResourceText, moreText, selected, enabled, warning, more, vd1, vd2,
  sort, onSelectChange, onEnabledChange, onAction, onSort, ...native }: TableRowProps) {
  const [internalSort, setInternalSort] = useState<TableRowSort | null>(null);
  const activeSort = sort === undefined ? internalSort : sort;
  function changeSort(column: string) {
    const direction = activeSort?.column === column && activeSort.direction === 'ascending' ? 'descending' : 'ascending';
    if (sort === undefined) setInternalSort({ column, direction });
    onSort?.(column, direction);
  }
  const effectiveVariant = selected && (variant === 'active' || variant === 'hover') ? 'selected' : variant;
  const row = records.find(record => record.theme === theme && record.variant === effectiveVariant);
  if (!row) throw Error(`TableRow has no exported Figma variant: ${theme}/${effectiveVariant}`);
  const props = { theme, variant, userName, armName, ipAddress, date, time, resourceText, secondResourceText, moreText,
    selected, enabled, warning, more, vd1, vd2, onSelectChange, onEnabledChange, onAction, onSort };
  const CellTag = variant === 'header' ? 'th' : 'td';
  return <tr {...native} className={[styles.row, className].filter(Boolean).join(' ')} data-table-row data-theme={theme}
    data-row-theme={theme} data-row-variant={effectiveVariant} data-source-node={row.nodeId} aria-selected={selected ?? variant === 'selected'}>
    {row.cells.map(cell => {
      const sortable = variant === 'header' && containsSortIcon(cell.children, props);
      const direction: SortInteraction['direction'] = sortable && activeSort?.column === cell.label ? activeSort.direction : 'none';
      const sorting: SortInteraction | undefined = sortable ? { direction, onClick: () => changeSort(cell.label) } : undefined;
      return <CellTag key={cell.key} className={styles.cell} scope={variant === 'header' ? 'col' : undefined}
        aria-sort={sortable && direction !== 'none' ? direction : undefined}
        data-sort-column={sortable ? cell.key : undefined} data-sort-active={sortable ? direction !== 'none' : undefined}
        data-sort-direction={sortable ? direction : undefined}
        colSpan={variant === 'action bar' ? sourceTokens.columns.length : undefined} style={{ width: cell.width, height: row.height }}>
        <div className={styles.cellContent} style={{ width: cell.width, height: row.height }}>
          {cell.children.map(node => <LayerView key={node.id} node={node} props={props} column={cell.label} sorting={sorting} />)}
        </div>
      </CellTag>;
    })}
  </tr>;
}

/** Minimal native table shell for a standalone TableRow or aligned row collection. */
export function TableRowTable({ children, label = 'Записи', className, ...props }: Omit<ComponentPropsWithRef<'table'>, 'children'> & { children: ReactNode; label?: string }) {
  return <div className={styles.scroll}><table {...props} aria-label={label} className={[styles.table, className].filter(Boolean).join(' ')}>
    <colgroup>{sourceTokens.columns.map(column => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
    {children}
  </table></div>;
}
