import { useEffect, useState } from 'react';
import { Toggle } from '@/components/Toggle';
import { useStorageItem } from '@/hooks/useStorageItem';
import {
  allowlist,
  blockedCount,
  enabled,
  removeElements,
  resetStats,
} from '@/utils/settings';

function getHostname(url?: string): string {
  try {
    return url ? new URL(url).hostname : '';
  } catch {
    return '';
  }
}

function App() {
  const [isEnabled, setIsEnabled] = useStorageItem(enabled);
  const [removes, setRemoves] = useStorageItem(removeElements);
  const [count] = useStorageItem(blockedCount);
  const [list, setList] = useStorageItem(allowlist);

  const [tabId, setTabId] = useState<number | undefined>();
  const [host, setHost] = useState('');

  useEffect(() => {
    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        setTabId(tab?.id);
        setHost(getHostname(tab?.url));
      });
  }, []);

  const isAllowed = host
    ? (list ?? []).some((domain) => host.endsWith(domain))
    : false;

  async function toggleAllow(checked: boolean) {
    if (!host) return;
    const current = list ?? [];
    const without = current.filter((domain) => domain !== host);
    await setList(checked ? [...without, host] : without);
  }

  async function rescan() {
    if (tabId == null) return;
    try {
      await browser.tabs.sendMessage(tabId, { type: 'SCAN_NOW' });
    } catch {
      // content script not injected into this page
    }
    window.close();
  }

  return (
    <div className="flex w-80 flex-col gap-4 bg-slate-950 p-4 text-slate-100 antialiased">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icon/48.png" alt="" className="h-7 w-7" />
          <div className="leading-tight">
            <h1 className="text-sm font-semibold">LintRoll</h1>
            <p className="text-[11px] text-slate-400">Sweep ads away</p>
          </div>
        </div>
        <Toggle
          aria-label="Enabled"
          checked={isEnabled ?? false}
          onChange={(value) => void setIsEnabled(value)}
        />
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <p className="text-[11px] text-slate-400">Blocked elements</p>
        <p className="text-3xl font-bold tabular-nums">{count ?? 0}</p>
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
          <span>Remove elements instead of hiding</span>
          <Toggle
            aria-label="Remove elements"
            checked={removes ?? false}
            onChange={(value) => void setRemoves(value)}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
          <span>
            Allowlist this site
            <span className="block text-[10px] text-slate-500">
              {host || 'n/a'}
            </span>
          </span>
          <Toggle
            aria-label="Allowlist this site"
            checked={isAllowed}
            disabled={!host}
            onChange={(value) => void toggleAllow(value)}
          />
        </label>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void rescan()}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-slate-950 transition hover:bg-emerald-400"
        >
          Rescan
        </button>
        <button
          type="button"
          onClick={() => void resetStats()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Reset stats
        </button>
      </section>

      <footer className="text-center">
        <button
          type="button"
          onClick={() => void browser.runtime.openOptionsPage()}
          className="text-[11px] text-slate-400 underline-offset-2 hover:text-emerald-400 hover:underline"
        >
          More settings
        </button>
      </footer>
    </div>
  );
}

export default App;
