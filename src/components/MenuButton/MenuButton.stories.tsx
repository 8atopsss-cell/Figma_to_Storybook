import type { Meta, StoryObj } from '@storybook/react-vite';
import { MenuButton, type MenuButtonProps } from './MenuButton';
import tokens from '../../tokens/menu-buttons.json';

type StoryProps = MenuButtonProps & { state?: 'default' | 'hover' | 'active' | 'disable' };
const meta = {
  title: 'Figma export/MenuButton', component: MenuButton, tags: ['autodocs'],
  args: { text: tokens.records[0].defaultText, showLabel: tokens.definitions['Label#2938:0'].defaultValue,
    badge: tokens.definitions['badge#7049:16'].defaultValue, state: 'default', disabled: false },
  argTypes: {
    theme: { control: false, table: { disable: true } },
    state: { control: 'select', options: ['default', 'hover', 'active', 'disable'], description: 'Предпросмотр исходного состояния Figma. В default работают нативные hover/active; disable блокирует кнопку.' },
    text: { control: 'text' }, showLabel: { control: 'boolean', description: 'Figma Label#2938:0' },
    badge: { control: 'boolean', description: 'Существующий Badge medium в обеих темах; light дополнен по запросу пользователя.' },
    disabled: { control: 'boolean', description: 'Нативное disabled с оформлением исходного Figma state=disable.' },
    icon: { control: false }, isSelected: { control: 'boolean' },
    'aria-label': { control: 'text' }, ref: { control: false },
  },
  render: ({ state, ...args }, context) => {
    const theme = context.parameters.theme ?? (context.globals.theme === 'dark' ? 'dark' : 'light');
    return <MenuButton {...args} theme={theme} disabled={args.disabled || state === 'disable'} data-preview-state={state === 'default' ? undefined : state} />;
  },
} satisfies Meta<StoryProps>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <><h1 className="demo-title">MenuButton</h1><p className="demo-description">Пункт меню · иконка ключа · исходные состояния Figma</p>
    <div className="demo-grid">{['default', 'hover', 'active', 'disable'].map(state => {
      const row = tokens.records.find(r => r.theme === theme && r.state === state)!;
      return <section className="demo-card" key={row.nodeId}><h2 className="demo-caption">{state}</h2>
        <MenuButton theme={theme} data-source-node={row.nodeId} data-preview-state={state} disabled={state === 'disable'} badge />
        <small className="demo-count">{row.nodeId}</small>
      </section>;
    })}</div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
