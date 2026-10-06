import React from 'react';
import { useStorybookApi, useStorybookState } from 'storybook/manager-api';
import { FigmaSyncPanel } from './manager';
import { resolveSelectedComponent } from './selection';

export function ScopedFigmaSyncPanel() {
  const { storyId, refId } = useStorybookState();
  const api = useStorybookApi();
  const selected = resolveSelectedComponent(storyId, refId, id => api.resolveStory(id, refId));
  return <FigmaSyncPanel selected={selected} />;
}
