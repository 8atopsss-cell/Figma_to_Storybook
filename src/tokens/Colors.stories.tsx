import type { Meta, StoryObj } from '@storybook/react-vite';
import tokens from './styles.json';
import styles from './StyleCatalogue.module.css';

type Args = { theme: 'all' | 'shared' | 'light' | 'dark'; search: string };
const meta = {
  title: 'Tokens/Colors',
  args: { theme: 'all', search: '' },
  argTypes: {
    theme: { control: 'select', options: ['all', 'shared', 'light', 'dark'] },
    search: { control: 'text', description: 'Поиск по исходному имени стиля Figma.' },
  },
  render: ({ theme, search }) => {
    const colors = tokens.colors.filter(color => (theme === 'all' || color.theme === theme) && color.name.toLowerCase().includes(search.toLowerCase()));
    const groups = new Map<string, typeof colors>();
    for (const color of colors) {
      const group = color.name.split('/').slice(0, -1).join(' / ') || 'Палитра';
      const records = groups.get(group) ?? [];
      records.push(color);
      groups.set(group, records);
    }
    return <div className={styles.catalogue}>
      <h1>Цветовые токены</h1>
      <p>{colors.length} из {tokens.colors.length} стилей · SD Enterprice · исходная прозрачность сохранена</p>
      {[...groups].map(([group, records]) => <section key={group}>
        <h2>{group}</h2>
        <div className={styles.colors}>{records.map(color => <article key={color.id} className={styles.card} data-color-style={color.id}>
          <div className={styles.checker}><div className={styles.swatch} style={{ backgroundColor: `var(${color.cssVariable})` }} data-swatch /></div>
          <h3>{color.name.split('/').at(-1)}</h3>
          <p>{color.hex}{color.alpha !== 1 && ` · opacity ${Math.round(color.alpha * 100)}%`}</p>
          <code>{color.cssVariable}</code>
          <details><summary>Источник</summary><p>{color.name}</p><code>{color.id}</code></details>
        </article>)}</div>
      </section>)}
      {colors.length === 0 && <p>Стили не найдены.</p>}
    </div>;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Catalogue: Story = {};
