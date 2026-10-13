import { storage } from 'wxt/utils/storage';

/** Global switch: enable ad detection and removal */
export const enabled = storage.defineItem<boolean>('local:enabled', {
  fallback: true,
});

/** Remove elements from the DOM (otherwise only hide them) */
export const removeElements = storage.defineItem<boolean>(
  'local:removeElements',
  { fallback: true },
);

/** Total number of blocked elements */
export const blockedCount = storage.defineItem<number>('local:blockedCount', {
  fallback: 0,
});

/** Site allowlist: domains where nothing is removed */
export const allowlist = storage.defineItem<string[]>('local:allowlist', {
  fallback: [],
});

export async function incrementBlocked(count: number): Promise<void> {
  if (count <= 0) return;
  const current = await blockedCount.getValue();
  await blockedCount.setValue(current + count);
}

export async function resetStats(): Promise<void> {
  await blockedCount.setValue(0);
}
