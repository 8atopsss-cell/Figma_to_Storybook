export interface SyncRegistry {
  schemaVersion: number;
  components: { componentId: string; displayName: string; modulePath: string;
    storybook: { componentEntryId: string; storyIds: string[] };
    figma: { fileKey: string; sources: { theme: string; key?: string; componentSetId: string; nodeType: string; exportPath: string[] }[] } }[];
  unconfigured: { componentEntryId: string; displayName: string; reason: string }[];
}
export function generateSyncRegistry(project: string): Promise<SyncRegistry>;
export function buildSyncRegistry(project: string): Promise<SyncRegistry>;
export function watchSyncSources(project: string, watcher: {
  add(paths: string[]): unknown;
  on(event: string, listener: (path: string) => void): unknown;
  off(event: string, listener: (path: string) => void): unknown;
}, onError: (error: unknown) => void): () => void;
