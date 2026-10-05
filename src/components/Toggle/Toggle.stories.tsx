import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { Toggle, type ToggleProps, type ToggleVariant } from './Toggle';
import tokens from '../../tokens/toggles.json';

type ToggleStoryProps = ToggleProps & { lightVariant?: ToggleVariant; darkVariant?: ToggleVariant };
const meta = {
  title: 'Figma export/Toggle', component: Toggle, tags: ['autodocs'],
  args: { lightVariant: 'disable light', darkVariant: 'disable dark', danger: false, 'aria-label': 'Переключить параметр' },
  argTypes: {
    variant: { control: false, table: { disable: true } },
    lightVariant: { name: 'variant', control: 'select', options: tokens.variantsByTheme.light, if: { global: 'theme', eq: 'light' }, description: 'Светлая тема: исходные состояния с согласованными именами и два дополнения.' },
    darkVariant: { name: 'variant', control: 'select', options: tokens.variantsByTheme.dark, if: { global: 'theme', eq: 'dark' }, description: 'Исходные варианты тёмной темы.' },
    danger: { control: 'boolean', description: 'Красное оформление при включении; сохраняется после off/on в обеих темах.' },
    'aria-label': { control: 'text' }, ref: { control: false },
  },
  render: function Interactive(args, context) {
    const [, updateArgs] = useArgs();
    const theme = context.parameters.theme ?? (context.globals.theme === 'dark' ? 'dark' : 'light');
    const { lightVariant, darkVariant, ...componentArgs } = args;
    const selected = theme === 'dark' ? darkVariant ?? 'disable dark' : lightVariant ?? 'disable light';
    const variant = args.danger && selected === `Enable ${theme}` ? `Enable danger ${theme}` as ToggleVariant : selected;
    const source = tokens.records.find(row => row.variant === variant)!;
    return <Toggle {...componentArgs} variant={variant} onChange={() => {
      const danger = args.danger || source.variant === `Enable danger ${theme}`;
      const nextVariant = danger && source.nextVariant === `Enable ${theme}` ? `Enable danger ${theme}` : source.nextVariant;
      updateArgs({ [theme === 'dark' ? 'darkVariant' : 'lightVariant']: nextVariant, danger });
    }} />;
  },
} satisfies Meta<ToggleStoryProps>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};

function CatalogueToggle({ initialVariant }: { initialVariant: ToggleVariant }) {
  const [variant, setVariant] = useState(initialVariant);
  const theme = initialVariant.endsWith('light') ? 'light' : 'dark';
  const danger = initialVariant === `Enable danger ${theme}`;
  return <Toggle variant={variant} danger={danger} aria-label={initialVariant} onChange={() => {
    setVariant(current => {
      const source = tokens.records.find(row => row.variant === current)!;
      if (source.disabled) return current;
      return (danger && source.nextVariant === `Enable ${theme}` ? `Enable danger ${theme}` : source.nextVariant) as ToggleVariant;
    });
  }} />;
}

function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <><h1 className="demo-title">Toggle</h1><p className="demo-description">32×24 px · цвета из токенов · unactive = недоступен</p><div className="demo-grid">{tokens.records.filter(row => row.theme === theme).map(row => <section className="demo-card" key={row.variant} data-toggle-source={row.nodeId ?? ''} data-toggle-row={row.variant}>
    <h2 className="demo-caption">{row.variant}</h2>
    <CatalogueToggle initialVariant={row.variant as ToggleVariant} />
    <small>{row.origin === 'figma' ? row.nodeId : 'Дополнено по дизайн-системе'}</small>
  </section>)}</div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
