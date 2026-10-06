import type { StorybookConfig } from '@storybook/react-vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSyncRegistry, watchSyncSources } from '../scripts/generate-figma-sync-registry.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await generateSyncRegistry(project);
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async config => ({ ...config, plugins: [...(config.plugins ?? []), {
    name: 'figma-sync-registry',
    configureServer(server) {
      const stop = watchSyncSources(project, server.watcher,
        error => server.config.logger.error(`[figma-sync] ${error instanceof Error ? error.message : String(error)}`));
      server.httpServer?.once('close', stop);
    },
  }] }),
};
export default config;
