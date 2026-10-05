import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { TableRow, TableRowTable, type TableRowProps, type TableRowVariant } from './TableRow';
import tokens from '../../tokens/table-rows.json';

const meta = {
  title: 'Figma export/TableRow', component: TableRow, tags: ['autodocs'],
  args: { variant: 'active', enabled: true, userName: 'user name 10 sym', armName: 'ARM name 14 sm', ipAddress: '247.247.233.229', date: '02.11.2022', time: '12:45' },
  argTypes: {
    theme: { control: false, table: { disable: true } },
    variant: { control: 'select', options: tokens.variants, description: 'Исходные варианты, кроме исключённых пользователем expanded/expanded  hover.' },
    userName: { control: 'text' }, armName: { control: 'text' }, ipAddress: { control: 'text' }, date: { control: 'text' }, time: { control: 'text' },
    resourceText: { control: 'text' }, secondResourceText: { control: 'text', if: { global: 'theme', eq: 'light' } }, moreText: { control: 'text' },
    selected: { control: 'boolean', description: 'Выбор строки; active/hover отображает исходный selected.' },
    enabled: { control: 'boolean', description: 'Независимый Toggle: по умолчанию Enable danger обеих тем; off/on возвращает danger. Исходный unactive остаётся недоступным.' },
    warning: { control: 'boolean', description: 'warning#2967:0 — только слои с исходной связью видимости.' },
    more: { control: 'boolean', description: 'more#2967:1 — дополнительный ресурс.' },
    vd1: { control: 'boolean', description: 'vd1#2967:3 — первый ресурс.' },
    vd2: { control: 'boolean', if: { global: 'theme', eq: 'light' }, description: 'vd2#2967:2 — второй ресурс светлой темы.' },
    onSelectChange: { control: false }, onEnabledChange: { control: false }, onAction: { control: false }, onSort: { control: false },
  },
  render: function PlaygroundRow(args, context) {
    const [, updateArgs] = useArgs();
    const theme = context.parameters.theme ?? (context.globals.theme === 'dark' ? 'dark' : 'light');
    const row = <TableRow {...args} theme={theme} onSelectChange={selected => updateArgs({ selected })} onEnabledChange={enabled => updateArgs({ enabled })} />;
    return <TableRowTable>{args.variant === 'header' ? <thead>{row}</thead> : <tbody>{row}</tbody>}</TableRowTable>;
  },
} satisfies Meta<typeof TableRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};

function CatalogueRow({ theme, variant }: { theme: 'light' | 'dark'; variant: TableRowVariant }) {
  const [selected, setSelected] = useState<boolean | undefined>(undefined);
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);
  const props: TableRowProps = { theme, variant, selected, enabled, onSelectChange: setSelected, onEnabledChange: setEnabled };
  const row = <TableRow {...props} />;
  return <TableRowTable>{variant === 'header' ? <thead>{row}</thead> : <tbody>{row}</tbody>}</TableRowTable>;
}
function Catalogue({ theme }: { theme: 'light' | 'dark' }) {
  return <><h1 className="demo-title">TableRow</h1><p className="demo-description">1052×40 px · 8 вариантов · существующие компоненты</p>
    {tokens.variants.map(variant => <section className="demo-card" key={variant}>
      <h2 className="demo-caption">{variant}</h2><CatalogueRow theme={theme} variant={variant as TableRowVariant} />
    </section>)}</>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue theme="light" /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue theme="dark" /> };
