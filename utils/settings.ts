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

/** Number of blocked elements per hostname */
export const blockedBySite = storage.defineItem<Record<string, number>>(
  'local:blockedBySite',
  { fallback: {} },
);

/** Site allowlist: domains where nothing is removed */
export const allowlist = storage.defineItem<string[]>('local:allowlist', {
  fallback: [],
});

/** Maximum number of hostnames kept in the per-site statistics. */
const MAX_TRACKED_SITES = 200;

/**
 * Serializes counter updates. Content scripts report in bursts, and a plain
 * read-modify-write would drop counts when two reports overlap.
 */
let updateQueue: Promise<void> = Promise.resolve();

export function incrementBlocked(count: number, host?: string): Promise<void> {
  updateQueue = updateQueue.then(async () => {
    if (count <= 0) return;
    const current = await blockedCount.getValue();
    await blockedCount.setValue(current + count);

    if (!host) return;
    const perSite = (await blockedBySite.getValue()) ?? {};
    const next = { ...perSite, [host]: (perSite[host] ?? 0) + count };

    // Keep the map bounded; drop the least active sites first.
    const entries = Object.entries(next);
    if (entries.length > MAX_TRACKED_SITES) {
      entries.sort((a, b) => b[1] - a[1]);
      await blockedBySite.setValue(
        Object.fromEntries(entries.slice(0, MAX_TRACKED_SITES)),
      );
      return;
    }
    await blockedBySite.setValue(next);
  });
  return updateQueue;
}

export async function resetStats(): Promise<void> {
  updateQueue = updateQueue.then(async () => {
    await blockedCount.setValue(0);
    await blockedBySite.setValue({});
  });
  return updateQueue;
}
