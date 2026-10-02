import type { Meta, StoryObj } from '@storybook/react-vite';
import tokens from './styles.json';
import styles from './StyleCatalogue.module.css';

type Args = { text: string };
const displayNumber = (value: number) => Number(value.toFixed(4));
const meta = {
  title: 'Tokens/Typography',
  args: { text: 'Съешь ещё этих мягких французских булок. The quick brown fox jumps over the lazy dog. 0123456789' },
  argTypes: { text: { control: 'text', description: 'Текст для проверки каждого стиля.' } },
  render: ({ text }) => <div className={styles.catalogue}>
    <h1>Текстовые токены</h1>
    <p>{tokens.typography.length} стилей · PT Root UI · Regular / Medium / Bold</p>
    {tokens.typography.map(token => <article key={token.id} className={styles.typography} data-text-style={token.id}>
      <h2>{token.name}</h2>
      <p className={styles.metadata}>{token.raw.fontName.style} · {token.raw.fontSize}px · line height {displayNumber(token.raw.properties.lineHeight.value)}{token.raw.properties.lineHeight.unit === 'PERCENT' ? '%' : 'px'} · letter spacing {displayNumber(token.raw.properties.letterSpacing.value)}{token.raw.properties.letterSpacing.unit === 'PERCENT' ? '%' : 'px'}</p>
      <div className={`${styles.sample} ${token.className}`} data-text-sample><p>{text}</p><p>{text}</p></div>
      <code>{token.className}</code>
      <details><summary>Источник и значения</summary><code>{token.id}</code><pre>{JSON.stringify(token.raw, null, 2)}</pre></details>
    </article>)}
  </div>,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Catalogue: Story = {};
