import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, type BadgeProps, type BadgeVariant } from './Badge';
import tokens from '../../tokens/badges.json';

type BadgeStoryProps = BadgeProps & { lightVariant?: Exclude<BadgeVariant, 'xs' | 'count'>; darkVariant?: Exclude<BadgeVariant, 'Count'> };
const meta = {
  title: 'Figma export/Badge', component: Badge, tags: ['autodocs'],
  args: { lightVariant: tokens.definitions.light['Property 1'].defaultValue as Exclude<BadgeVariant, 'xs' | 'count'>, darkVariant: tokens.definitions.dark['Property 1'].defaultValue as Exclude<BadgeVariant, 'Count'>, 'aria-label': 'Индикатор состояния' },
  argTypes: { theme: { control: false, table: { disable: true } }, variant: { control: false, table: { disable: true } },
    lightVariant: { name: 'variant', control: 'select', options: tokens.definitions.light['Property 1'].variantOptions, if: { global: 'theme', eq: 'light' } },
    darkVariant: { name: 'variant', control: 'select', options: tokens.definitions.dark['Property 1'].variantOptions, if: { global: 'theme', eq: 'dark' } },
    text: { control: 'text', description: 'Текст счётчика. Дополнение API из characters текстового слоя; отдельного TEXT-свойства в Figma нет.' },
    'aria-label': { control: 'text' } },
  render: (args, context) => {
    const theme = context.parameters.theme ?? (context.globals.theme === 'dark' ? 'dark' : 'light');
    const { lightVariant, darkVariant, ...componentArgs } = args;
    const variant = theme === 'dark' ? darkVariant : lightVariant;
    const count = variant === 'count' || variant === 'Count';
    return <Badge {...{ ...componentArgs, theme, variant } as BadgeProps} role={count ? undefined : 'img'} aria-label={count ? undefined : args['aria-label']} />;
  },
} satisfies Meta<BadgeStoryProps>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <><h1 className="demo-title">Badge</h1><p className="demo-description">Исходные размеры, цвета и расположение границ Figma</p><div className="demo-grid">{tokens.records.filter(r => r.theme === theme).map(row => <section className="demo-card" key={row.nodeId}>
    <h2 className="demo-caption">{row.variant}</h2>
    <Badge {...{ theme, variant: row.variant } as BadgeProps} {...(!row.textNodeId ? { role: 'img', 'aria-label': row.variant } : {})} />
    <small>{row.nodeId}</small>
  </section>)}</div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
