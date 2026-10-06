import type { Preview } from '@storybook/react-vite';
import '../src/styles/tokens.css';
import '../src/styles/global.css';
import '../src/styles/fonts.css';
import '../src/styles/figma-styles.css';
const preview: Preview = {
  initialGlobals: { theme: 'light' },
  globalTypes: { theme: { description: 'Figma theme', toolbar: { icon: 'circlehollow', items: ['light', 'dark'] } } },
  decorators: [(Story, context) => <div className="demo-surface" data-theme={context.parameters.theme ?? context.globals.theme} style={{ paddingLeft: context.parameters.surfacePaddingLeft, paddingTop: context.parameters.surfacePaddingTop, paddingBottom: context.parameters.surfacePaddingBottom }}><Story /></div>],
  parameters: { layout: 'fullscreen', controls: { expanded: true }, a11y: { test: 'todo' } },
};
export default preview;
