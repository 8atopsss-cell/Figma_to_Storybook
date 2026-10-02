import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { AddIcon } from '../../assets/AddIcon';
import { defaults, sizes, variants } from '../../tokens/api';
import tokens from '../../tokens/buttons.json';

const meta = {
  title: 'Figma export/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'button', variant: defaults.variant, size: defaults.size, disabled: false, fullWidth: false, startIcon: <AddIcon /> },
  argTypes: {
    variant: { control: 'select', options: variants, description: 'Figma type; ghost orange is mapped to ghost-orange.' },
    size: { control: 'select', options: sizes, description: 'Figma size; minimum height for wrapping content.' },
    children: { control: 'text' }, disabled: { control: 'boolean' }, fullWidth: { control: 'boolean' },
    startIcon: { control: false }, endIcon: { control: false },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: function Interactive(args) {
    const [clicks, setClicks] = useState(0);
    return <><Button {...args} onClick={() => setClicks(value => value + 1)} /><output className="demo-count" aria-live="polite">Нажатий: {clicks}</output></>;
  },
};

function Catalogue() {
  return <>
    <h1 className="demo-title">Button</h1>
    <p className="demo-description">32 / 40 px · реальные hover, active и focus · исходная иконка</p>
    <div className="demo-grid">{variants.map(variant => <section key={variant} className="demo-card">
      <h2 className="demo-caption">{variant}</h2>
      {sizes.map(size => <div key={size} className="demo-row">
        <Button variant={variant} size={size} startIcon={<AddIcon />}>button</Button>
        <Button variant={variant} size={size} startIcon={<AddIcon />} disabled>button</Button>
      </div>)}
    </section>)}</div>
  </>;
}

export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue /> };
export const LongText: Story = { render: () => <div className="demo-narrow"><Button startIcon={<AddIcon />}>Очень длинный текст кнопки для проверки переноса</Button></div> };
export const FullWidth: Story = { args: { fullWidth: true, endIcon: <AddIcon /> } };
export const TextOnly: Story = { args: { startIcon: undefined } };
export const SourceMapping: Story = {
  render: () => <><h1 className="demo-title">Figma → Button</h1><table><thead><tr><th>Тема</th><th>Вариант</th><th>Размер</th><th>Состояние</th><th>Node ID</th></tr></thead>
    <tbody>{tokens.records.map(row => <tr key={row.nodeId}><td>{row.theme}</td><td>{row.variant}</td><td>{row.size}</td><td>{row.state}</td><td>{row.nodeId}</td></tr>)}</tbody></table></>,
};
