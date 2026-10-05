import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResourceTag, type ResourceTagProps, type ResourceTagVariant } from './ResourceTag';
import tokens from '../../tokens/resource-tags.json';

const meta = {
  title: 'Figma export/ResourceTag', component: ResourceTag, tags: ['autodocs'],
  args: { variant: tokens.definitions.light['Property 1'].defaultValue as ResourceTagVariant, text: tokens.definitions.light['Text#1600:4'].defaultValue, status: tokens.definitions.light['status#14963:9'].defaultValue, statusState: 'online' },
  argTypes: {
    statusState: { control: 'select', options: ['online', 'offline'], description: 'Состояние видимого badge. Offline добавлен по запросу пользователя из исходного Badge status ofline.' },
    theme: { control: false },
    variant: { control: 'select', options: tokens.variants.light, description: 'Property 1 из Figma. Имена сохранены, включая delited.' },
    text: { control: 'text', description: 'Text#1600:4. Фиксированная геометрия исходника; длинный текст может выйти за границы.' },
    status: { control: 'boolean', description: 'Показывает badge только у вариантов со связью visible → status. У pattern такой связи нет.' },
  },
  render: (args, context) => <ResourceTag {...args} theme={context.parameters.theme ?? (context.globals.theme === 'dark' ? 'dark' : 'light')} />,
} satisfies Meta<typeof ResourceTag>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <><h1 className="demo-title">ResourceTag</h1><p className="demo-description">14 текстовых вариантов Figma · 40×18 px</p><div className="demo-grid">{tokens.records.filter(r => r.theme === theme).map(row => <section className="demo-card" key={row.nodeId}>
    <h2 className="demo-caption">{row.variant}</h2>
    <ResourceTag {...{ theme, variant: row.variant } as ResourceTagProps} />
    {row.statusPropertyId && <div className="demo-row">
      <ResourceTag {...{ theme, variant: row.variant } as ResourceTagProps} status statusState="online" />
      <ResourceTag {...{ theme, variant: row.variant } as ResourceTagProps} status statusState="offline" />
    </div>}
    <small>{row.nodeId}</small>
  </section>)}</div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
