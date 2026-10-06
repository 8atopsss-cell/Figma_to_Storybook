import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { AddIcon } from '../../assets/AddIcon';
import { defaults, sizes, variants } from '../../tokens/api';

const meta = {
  id: 'figma-export-button',
  title: 'Figma export/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'button', variant: defaults.variant, size: defaults.size, disabled: false, fullWidth: false, startIcon: 'add', endIcon: 'none' },
  argTypes: {
    variant: { control: 'select', options: variants, description: 'Figma type; ghost orange is mapped to ghost-orange.' },
    size: { control: 'select', options: sizes, description: 'Figma size; single-line label at 32 or 40 px height.' },
    children: { control: 'text' }, disabled: { control: 'boolean' }, fullWidth: { control: 'boolean' },
    startIcon: { control: 'select', options: ['none', 'add'], mapping: { none: undefined, add: <AddIcon /> } },
    endIcon: { control: 'select', options: ['none', 'add'], mapping: { none: undefined, add: <AddIcon /> } },
    'aria-label': { control: 'text', description: 'Название действия, если текст кнопки пустой.' },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

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
