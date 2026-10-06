import React from 'react';
import { addons, types } from 'storybook/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import { FigmaSyncLabel, FigmaSyncPanel } from './figma-sync/manager';

addons.setConfig({ sidebar: { renderLabel: (item) => <FigmaSyncLabel item={item} /> } });
addons.register('local/figma-sync', () => {
  addons.add('local/figma-sync/panel', {
    type: types.PANEL,
    title: 'Figma: изменения',
    render: ({ active }) => <AddonPanel active={!!active}><FigmaSyncPanel /></AddonPanel>,
  });
});
