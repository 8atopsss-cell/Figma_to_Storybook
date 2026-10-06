import type { HashEntry } from 'storybook/manager-api';

type Entry = Pick<HashEntry, 'id' | 'name' | 'type' | 'refId'> & { parent?: string };
export type SelectedComponent = { entryId: string; name: string };

export function resolveSelectedComponent(storyId: string | undefined, refId: string | undefined,
  resolve: (id: string) => Entry | undefined): SelectedComponent | undefined {
  if (!storyId || refId) return undefined;
  const visited = new Set<string>();
  let id: string | undefined = storyId;
  while (id && !visited.has(id)) {
    visited.add(id);
    const entry = resolve(id);
    if (!entry || entry.refId) return undefined;
    if (entry.type === 'component') return { entryId: entry.id, name: entry.name };
    id = entry.parent;
  }
  return undefined;
}
