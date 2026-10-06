import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar, type SidebarProps } from './Sidebar';
import { sidebarItemIds, type SidebarItemId } from '../../tokens/sidebar-api';

type StoryProps = SidebarProps & { badgeItemId?: SidebarItemId | '' };
const meta = {
  title: 'Figma export/Sidebar', component: Sidebar, tags: ['autodocs'],
  args: { layout: 'expanded', defaultSelectedId: 'users', badgeItemId: '' },
  argTypes: {
    theme: { control: false, table: { disable: true } },
    layout: { control: 'inline-radio', options: ['expanded', 'compact'] },
    defaultSelectedId: { control: 'select', options: [null, ...sidebarItemIds], description: 'Исходный выбранный пункт; затем выбор меняется по клику.' },
    selectedId: { control: false, description: 'Управляемый выбор для потребителя.' },
    badgeItemId: { control: 'select', options: ['', ...sidebarItemIds], description: 'Готовый Badge medium в указанном пункте; обе темы.' },
    badgeItemIds: { control: false, table: { disable: true } }, ref: { control: false },
  },
  render: ({ badgeItemId, ...args }, context) => {
    const theme = context.parameters.theme ?? (context.globals.theme === 'dark' ? 'dark' : 'light');
    return <div style={{ height: '100dvh' }}><Sidebar {...args} key={String(args.defaultSelectedId)} theme={theme} badgeItemIds={badgeItemId ? [badgeItemId] : []} /></div>;
  },
} satisfies Meta<StoryProps>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { parameters: { surfacePaddingLeft: 0, surfacePaddingTop: 0, surfacePaddingBottom: 0 } };
function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <><h1 className="demo-title">Sidebar</h1><p className="demo-description">Expanded / Compact · MenuButton + Badge · выбор пункта по клику</p>
    <div className="demo-row" style={{ alignItems: 'flex-start', gap: 40 }}>
      {(['expanded', 'compact'] as const).map(layout => <section key={layout}><h2 className="demo-caption">{layout}</h2><div style={{ height: 942 }}><Sidebar theme={theme} layout={layout} /></div></section>)}
    </div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
