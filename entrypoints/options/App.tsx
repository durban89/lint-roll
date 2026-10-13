import { useState } from 'react';
import { Toggle } from '@/components/Toggle';
import { useStorageItem } from '@/hooks/useStorageItem';
import {
  allowlist,
  blockedCount,
  enabled,
  removeElements,
  resetStats,
} from '@/utils/settings';

function App() {
  const [isEnabled, setIsEnabled] = useStorageItem(enabled);
  const [removes, setRemoves] = useStorageItem(removeElements);
  const [list, setList] = useStorageItem(allowlist);
  const [count] = useStorageItem(blockedCount);
  const [draft, setDraft] = useState('');

  function normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
  }

  async function addDomain() {
    const domain = normalize(draft);
    if (!domain) return;
    const current = list ?? [];
    if (!current.includes(domain)) {
      await setList([...current, domain]);
    }
    setDraft('');
  }

  async function removeDomain(domain: string) {
    await setList((list ?? []).filter((item) => item !== domain));
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 antialiased">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex items-center gap-3">
          <img src="/icon/128.png" alt="" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-semibold">LintRoll Settings</h1>
            <p className="text-sm text-slate-400">
              Detect and remove page ads for a cleaner browsing experience.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Ad Blocking</h2>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between text-sm">
              <span>Enable ad blocking</span>
              <Toggle
                aria-label="Enable ad blocking"
                checked={isEnabled ?? false}
                onChange={(value) => void setIsEnabled(value)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>
                Remove elements
                <span className="block text-xs text-slate-500">
                  When off, ads are only hidden with display:none
                </span>
              </span>
              <Toggle
                aria-label="Remove elements"
                checked={removes ?? false}
                onChange={(value) => void setRemoves(value)}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">
            Site Allowlist
          </h2>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void addDomain();
              }}
              placeholder="example.com"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => void addDomain()}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
            >
              Add
            </button>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {(list ?? []).length === 0 ? (
              <li className="text-xs text-slate-500">No allowlisted sites yet</li>
            ) : (
              (list ?? []).map((domain) => (
                <li
                  key={domain}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                >
                  <span>{domain}</span>
                  <button
                    type="button"
                    onClick={() => void removeDomain(domain)}
                    className="text-xs text-slate-400 transition hover:text-rose-400"
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Statistics</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Total blocked: 
              <span className="font-semibold text-slate-100">{count ?? 0}</span>
            </p>
            <button
              type="button"
              onClick={() => void resetStats()}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium transition hover:bg-slate-800"
            >
              Reset stats
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
