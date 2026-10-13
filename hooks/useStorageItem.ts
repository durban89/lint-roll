import { useCallback, useEffect, useState } from 'react';

/** Minimal structure of a WXT storage item, easy to test and reuse */
export interface StorageItemLike<T> {
  getValue(): Promise<T>;
  setValue(value: T): Promise<void>;
  watch(callback: (value: T) => void): () => void;
}

/**
 * Subscribes to a WXT storage item, returning the current value and a
 * setter. Returns null on the first render and the real value once loaded.
 */
export function useStorageItem<T>(item: StorageItemLike<T>) {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    let active = true;
    void item.getValue().then((initial) => {
      if (active) setValue(initial);
    });
    const unwatch = item.watch((next) => setValue(next));
    return () => {
      active = false;
      unwatch();
    };
  }, [item]);

  const update = useCallback(
    async (next: T) => {
      setValue(next);
      await item.setValue(next);
    },
    [item],
  );

  return [value, update] as const;
}
