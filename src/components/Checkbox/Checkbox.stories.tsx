import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Checkbox, CheckboxGroup, CheckboxSkeleton } from './Checkbox';
import tokens from '../../tokens/checkboxes.json';

const meta = {
  title: 'Figma export/Checkbox', component: Checkbox, tags: ['autodocs'],
  args: { children: 'Checkbox item', checked: false, disabled: false, indeterminate: false },
  argTypes: { children: { control: 'text' }, checked: { control: 'boolean' }, disabled: { control: 'boolean' }, indeterminate: { control: 'boolean' }, ref: { control: false } },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs();
    return <Checkbox {...args} onChange={event => updateArgs({ checked: event.target.checked, indeterminate: false })} />;
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Selected: Story = { args: { checked: true } };
export const Indeterminate: Story = { args: { indeterminate: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledSelected: Story = { args: { disabled: true, checked: true } };
export const IconOnly: Story = { name: 'Только иконка', args: { children: '', 'aria-label': 'Выбрать элемент' }, argTypes: { 'aria-label': { control: 'text' } } };
export const Skeleton: Story = { render: () => <CheckboxSkeleton /> };

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
    </section></div></>;
}
export const Light: Story = { parameters: { theme: 'light' }, render: () => <Catalogue /> };
export const Dark: Story = { parameters: { theme: 'dark' }, render: () => <Catalogue /> };
export const Groups: Story = { render: () => <div className="demo-grid">{[2, 3, 4, 5].map(count => <CheckboxGroup key={count} label="Label">{Array.from({ length: count }, (_, i) => <Checkbox key={i} name={'group-' + count} value={String(i + 1)}>Checkbox item</Checkbox>)}</CheckboxGroup>)}</div> };
export const SourceMapping: Story = { render: () => <><h1 className="demo-title">Figma → Checkbox</h1><table><thead><tr><th>Тема</th><th>Вид</th><th>Состояние Figma</th><th>Node ID</th></tr></thead><tbody>{tokens.records.map(row => <tr key={row.nodeId}><td>{row.theme}</td><td>{row.scope}</td><td>{row.sourceState}</td><td>{row.nodeId}</td></tr>)}</tbody></table></> };
