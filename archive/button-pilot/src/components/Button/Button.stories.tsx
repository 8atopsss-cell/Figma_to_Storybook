import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button, type ButtonProps } from './Button';

const variants = ['primary', 'secondary', 'tertiary', 'ghost', 'ghost-orange', 'danger'] as const;
// Demonstration icon until the original Figma resource is available.
const Plus = () => <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>;

const meta = {
  title: 'Components/Button', component: Button, tags: ['autodocs'],
  args: { children: 'Button', variant: 'primary', size: 32, disabled: false, fullWidth: false, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'inline-radio', options: [32, 40] },
    startIcon: { control: false }, endIcon: { control: false }, ref: { control: false },
  },
  parameters: { docs: { description: { component: 'SD Enterprice. 6 оформлений, 32/40 px, light/dark. Hover и active — реальные CSS-состояния; focus-visible добавлен по согласованному контракту. Иконка + в примерах временная: экспорт оригинала пока недоступен. Контраст проверяется и фиксируется отдельно.' } } },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Tertiary: Story = { args: { variant: 'tertiary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const GhostOrange: Story = { args: { variant: 'ghost-orange' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const Large: Story = { args: { size: 40 } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcons: Story = { args: { startIcon: <Plus />, endIcon: <Plus /> } };
export const FullWidth: Story = { args: { fullWidth: true, children: 'Продолжить' } };
export const LongText: Story = {
  render: () => <div style={{ width: 160 }}><Button fullWidth startIcon={<Plus />}>Очень длинное действие без потери текста</Button></div>,
};
export const Interaction: Story = {
  render: function InteractionDemo() {
    const [count, setCount] = useState(0);
    return <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button onClick={() => setCount(n => n + 1)}>Action</Button>
      <Button disabled onClick={() => setCount(n => n + 100)}>Disabled</Button>
      <Button variant="secondary">Next</Button>
      <output aria-live="polite">{count}</output>
    </div>;
  },
};
export const ClickTest: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Button' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
export const DisabledTest: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Button' }));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <section data-theme={theme} style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', padding: 24 }}>
    <h2>{theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}</h2>
    <p>Наведите курсор, нажмите кнопку или используйте Tab. Иконка + временная.</p>
    <div style={{ overflowX: 'auto', padding: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '110px repeat(6, 150px)', gap: '16px 20px', alignItems: 'center', minWidth: 1130 }}>
        <span />{variants.map(v => <strong key={v}>{v}</strong>)}
        {([32, 40] as const).flatMap(size => [false, true].map(disabled => <CatalogueRow key={`${size}-${disabled}`} size={size} disabled={disabled} />))}
      </div>
    </div>
  </section>;
}
function CatalogueRow({ size, disabled }: Pick<ButtonProps, 'size' | 'disabled'>) {
  return <><span>{size} · {disabled ? 'disabled' : 'enabled'}</span>{variants.map(variant => <div key={variant}><Button variant={variant} size={size} disabled={disabled} startIcon={<Plus />}>Button</Button></div>)}</>;
}
export const LightCatalogue: Story = { render: () => <Catalogue theme="light" /> };
export const DarkCatalogue: Story = { render: () => <Catalogue theme="dark" /> };
