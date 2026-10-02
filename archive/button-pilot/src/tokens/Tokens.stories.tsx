import type { Meta, StoryObj } from '@storybook/react-vite';
import tokens from './buttons.json';

const meta = {
  title: 'Foundation/Button tokens',
  render: (_args, context) => <section style={{ maxWidth: 1000 }}>
    <h1>Токены кнопок</h1>
    <p>Цвета привязаны к узлам SD Enterprice. Алиасы в коде созданы вручную; связи переменных Figma не получены.</p>
    <p style={{ fontFamily: 'var(--button-font-family)', fontSize: 'var(--button-font-size)', fontWeight: 700 }}>PT Root UI Bold · 14 px · BUTTON / КНОПКА</p>
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <caption style={{ textAlign: 'left', paddingBottom: 16 }}>Enabled · меняйте тему через панель Storybook</caption>
      <thead><tr><th align="left">Токен</th><th align="left">Цвет</th><th align="left">Узел</th></tr></thead>
      <tbody>{tokens.sourceMap.filter(row => row.theme === (context.globals.theme === 'dark' ? 'dark' : 'light') && row.token.includes('-enabled-')).map(row => <tr key={row.token}>
        <td style={{ padding: '8px 0' }}><code>--{row.token}</code></td>
        <td><span style={{ display: 'inline-block', width: 48, height: 24, background: `var(--${row.token})`, border: '1px solid currentColor', verticalAlign: 'middle' }} /></td>
        <td><code>{row.nodeId}</code></td>
      </tr>)}</tbody>
    </table>
  </section>,
} satisfies Meta;
export default meta;
export const Overview: StoryObj<typeof meta> = {};
