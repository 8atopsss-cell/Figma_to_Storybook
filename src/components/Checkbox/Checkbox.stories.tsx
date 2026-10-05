import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Checkbox, CheckboxGroup, CheckboxSkeleton } from './Checkbox';

const meta = {
  title: 'Figma export/Checkbox', component: Checkbox, tags: ['autodocs'],
  args: { children: 'Checkbox item', checked: false, disabled: false, indeterminate: false },
  argTypes: { children: { control: 'text' }, checked: { control: 'boolean' }, disabled: { control: 'boolean' }, indeterminate: { control: 'boolean' }, 'aria-label': { control: 'text', description: 'Название элемента без подписи.' }, ref: { control: false } },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs();
    return <Checkbox {...args} onChange={event => updateArgs({ checked: event.target.checked, indeterminate: false })} />;
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function Catalogue() {
  return <><h1 className="demo-title">Checkbox</h1><p className="demo-description">18 px · исходные SVG · Space и клик по подписи переключают состояние</p>
    <div className="demo-grid"><section className="demo-card"><h2 className="demo-caption">С подписью</h2>
      {['enable', 'hover', 'selected', 'indeterminate', 'disabled unselected', 'disabled selected', 'skeleton'].map(state => <div className="demo-row" key={state} data-state={state}>
        {state === 'skeleton' ? <CheckboxSkeleton /> : <Checkbox defaultChecked={state.includes('selected') && state !== 'disabled unselected'} indeterminate={state === 'indeterminate'} disabled={state.startsWith('disabled')}>Checkbox item</Checkbox>}
        <small>{state}</small>
      </div>)}
    </section><section className="demo-card"><h2 className="demo-caption">Без подписи</h2>
      {['enable', 'selected', 'indeterminate', 'disabled unselected', 'disabled selected'].map(state => <div className="demo-row" key={state} data-icon-state={state}>
        <Checkbox aria-label={state} defaultChecked={state === 'selected' || state === 'disabled selected'} indeterminate={state === 'indeterminate'} disabled={state.startsWith('disabled')} /><small>{state}</small>
      </div>)}
    </section></div><h2 className="demo-title">Группы</h2><div className="demo-grid">{[2, 3, 4, 5].map(count => <CheckboxGroup key={count} label="Label">{Array.from({ length: count }, (_, i) => <Checkbox key={i} name={'group-' + count} value={String(i + 1)}>Checkbox item</Checkbox>)}</CheckboxGroup>)}</div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue /> };
