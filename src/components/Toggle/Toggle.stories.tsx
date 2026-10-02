import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Toggle, type ToggleVariant } from './Toggle';
import tokens from '../../tokens/toggles.json';

const meta = {
  title: 'Figma export/Toggle', component: Toggle, tags: ['autodocs'],
  args: { variant: tokens.defaultVariant as ToggleVariant, danger: false, 'aria-label': 'Переключить параметр' },
  argTypes: { variant: { control: 'select', options: tokens.variants, description: 'Все восемь исходных вариантов Property 1, без выдуманных сочетаний.' }, danger: { control: 'boolean', description: 'Сохраняет красное оформление включённого dark Toggle при переключении on/off.' }, 'aria-label': { control: 'text' }, ref: { control: false } },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs();
    const source = tokens.records.find(row => row.variant === args.variant)!;
    return <div className="demo-surface" data-theme={source.theme}><Toggle {...args} onChange={() => {
      const danger = args.danger || source.variant === 'Enable danger dark';
      const variant = danger && source.nextVariant === 'Enable dark' ? 'Enable danger dark' : source.nextVariant;
      updateArgs({ variant, danger });
    }} /></div>;
  },
} satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Enabled: Story = { args: { variant: 'Enable dark' } };
export const Danger: Story = { args: { variant: 'Enable danger dark', danger: true } };
export const DisabledOn: Story = { args: { variant: 'unactive on dark' } };
export const DisabledOff: Story = { args: { variant: 'unactive off dark' } };

function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <><h1 className="demo-title">Toggle</h1><p className="demo-description">32×24 px · исходные цвета и координаты · unactive = недоступен</p><div className="demo-grid">{tokens.records.filter(row => row.theme === theme).map(row => <section className="demo-card" key={row.nodeId} data-toggle-source={row.nodeId}>
    <h2 className="demo-caption">{row.variant}</h2>
    <Toggle variant={row.variant as ToggleVariant} aria-label={row.variant} onChange={() => {}} />
    <small>{row.nodeId}</small>
  </section>)}</div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
export const SourceMapping: Story = { render: () => <><h1 className="demo-title">Figma → Toggle</h1><table><thead><tr><th>Property 1</th><th>Node ID</th><th>checked</th><th>disabled</th></tr></thead><tbody>{tokens.records.map(row => <tr key={row.nodeId}><td>{row.variant}</td><td>{row.nodeId}</td><td>{String(row.checked)}</td><td>{String(row.disabled)}</td></tr>)}</tbody></table></> };
