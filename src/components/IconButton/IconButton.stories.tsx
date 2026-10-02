import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton, type IconButtonProps } from './IconButton';
import { AddIcon } from '../../assets/AddIcon';
import tokens from '../../tokens/icon-buttons.json';

const meta = {
  title: 'Figma export/IconButton', component: IconButton, tags: ['autodocs'],
  args: { variant: 'primary', size: 18, contrast: 'high', disabled: false, 'aria-label': 'Выполнить действие' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'tertiary', 'ghost'] },
    size: { control: 'inline-radio', options: [18, 24] },
    contrast: { control: 'inline-radio', options: ['high', 'low'], if: { arg: 'variant', eq: 'ghost' } },
    disabled: { control: 'boolean' }, 'aria-label': { control: 'text' },
    icon: { control: false }, ref: { control: false },
  },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const CustomIcon: Story = { args: { variant: 'ghost', icon: <AddIcon />, 'aria-label': 'Добавить' } };
type Theme = 'light' | 'dark';
function Catalogue({ theme }: { theme: Theme }) {
  return <><h1 className="demo-title">Иконочные кнопки</h1><p className="demo-description">18 / 24 px · primary / tertiary / ghost · hover 300 мс · active 70 мс</p><div className="demo-grid">{tokens.records.filter(row => row.theme === theme).map(row => <section className="demo-card" key={`${row.variant}-${row.size}-${row.contrast}-${row.state}`} data-mini-row data-mini-origin={row.origin} data-mini-source={row.nodeId ?? ''}>
    <h2 className="demo-caption">{row.variant} · {row.size} · {row.contrast} · {row.state}</h2>
    <div style={{ display: 'flex', minHeight: 24, marginBottom: 8 }}><IconButton variant={row.variant as IconButtonProps['variant']} size={row.size as 18 | 24} contrast={row.contrast as 'high' | 'low'} disabled={row.state === 'disable'} aria-label={`${row.variant} ${row.state} ${row.size} ${row.contrast}`} data-preview-state={row.state} /></div>
    <small>{row.origin === 'figma' ? `Figma: ${row.nodeId}` : 'Дополнено по дизайн-системе'}</small>
  </section>)}</div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
export const SourceMapping: Story = { render: () => <><h1 className="demo-title">Figma → IconButton</h1><table><thead><tr><th>Тема</th><th>Вариант</th><th>Размер</th><th>Состояние</th><th>Источник</th></tr></thead><tbody>{tokens.records.map(row => <tr key={`${row.theme}-${row.variant}-${row.size}-${row.contrast}-${row.state}`}><td>{row.theme}</td><td>{row.variant} / {row.contrast}</td><td>{row.size}</td><td>{row.state}</td><td>{row.nodeId ?? 'Дополнено'} · база {row.source.nodeId}</td></tr>)}</tbody></table></> };
