import type { Preview } from '@storybook/react-vite';
import '../src/styles/global.css';

const preview: Preview = {
  globalTypes: {
    theme: { description: 'Тема Figma', toolbar: { icon: 'paintbrush', items: ['light', 'dark'], dynamicTitle: true } },
  },
  initialGlobals: { theme: 'light' },
  decorators: [(Story, context) => (
    <div data-theme={context.globals.theme} style={{ padding: 32, minHeight: '100vh', boxSizing: 'border-box', background: 'var(--surface-page)', color: 'var(--text-primary)' }}>
      <Story />
    </div>
  )],
  parameters: { layout: 'fullscreen', controls: { expanded: true }, a11y: { test: 'todo' } },
};
export default preview;
