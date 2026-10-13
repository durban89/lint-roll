import { blockedCount, incrementBlocked } from '@/utils/settings';

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
});
