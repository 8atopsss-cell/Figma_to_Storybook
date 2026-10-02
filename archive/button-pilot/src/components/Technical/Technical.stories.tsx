import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = { title: 'Setup/Technical', render: () => <p>Storybook: React + TypeScript + CSS Modules</p> } satisfies Meta;
export default meta;
export const Ready: StoryObj<typeof meta> = {};
