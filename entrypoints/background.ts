import { buildDynamicAdRules, dynamicAdRuleIds } from '@/utils/adRules';
import {
  allowlist,
  blockedCount,
  enabled,
  incrementBlocked,
} from '@/utils/settings';

/**
 * Register or remove the ad-blocking rules as dynamic declarativeNetRequest
 * rules, honoring the global switch and site allowlist. These live in the
 * browser profile, so unpacked loads never write to the extension directory's
 * reserved `_metadata` folder.
 */
async function syncDynamicRules(): Promise<void> {
  try {
    const [active, domains] = await Promise.all([
      enabled.getValue(),
      allowlist.getValue(),
    ]);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: dynamicAdRuleIds,
      addRules: (active ?? true) ? buildDynamicAdRules(domains ?? []) : [],
    });
  } catch (error) {
    console.error('[LintRoll] Failed to sync dynamic rules', error);
  }
}

export default defineBackground(() => {
  blockedCount.watch((count) => {
    const text = count > 0 ? String(count) : '';
    browser.action.setBadgeText({ text }).catch(() => {});
    browser.action
      .setBadgeBackgroundColor({ color: '#16a34a' })
      .catch(() => {});
  });

  blockedCount
    .getValue()
    .then((count) => {
      browser.action
        .setBadgeText({ text: count > 0 ? String(count) : '' })
        .catch(() => {});
    })
    .catch(() => {});

  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type?: string; count?: number };
    if (msg?.type === 'AD_BLOCKED' && typeof msg.count === 'number') {
      void incrementBlocked(msg.count);
    }
  });

  enabled.watch(() => {
    void syncDynamicRules();
  });

  allowlist.watch(() => {
    void syncDynamicRules();
  });

  browser.runtime.onInstalled.addListener(() => {
    void syncDynamicRules();
  });

  browser.runtime.onStartup.addListener(() => {
    void syncDynamicRules();
  });

  void syncDynamicRules();
});
