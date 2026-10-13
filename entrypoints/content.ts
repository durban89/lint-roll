import { allowlist, enabled, removeElements } from '@/utils/settings';

const AD_SELECTORS = [
  "[id^='ad_']",
  "[id^='ad-']",
  "[id*='-ad-']",
  "[id$='-ad']",
  "[id='ads']",
  "[class^='ad_']",
  "[class^='ad-']",
  "[class*=' ad-']",
  "[class$='-ad']",
  "[class*='advert']",
  "[class*='adsbygoogle']",
  "[class*='sponsored']",
  "[class*='banner-ad']",
  "[class*='adsense']",
  "[id*='google_ads']",
  "[id*='googleads']",
  "[aria-label='Advertisement' i]",
  "[aria-label='advertisement' i]",
  "iframe[src*='doubleclick.net']",
  "iframe[src*='googlesyndication']",
  "iframe[src*='googleadservices']",
  "iframe[id^='google_ads_iframe']",
  "iframe[src*='adservice']",
  "iframe[src*='/ads/']",
  'ins.adsbygoogle',
  'amp-ad',
  'div[data-ad-slot]',
  'div[data-ad-client]',
  'div[data-google-query-id]',
].join(',');

const AD_URL_PATTERNS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'ads.yahoo.com',
  'adnxs.com',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'casalemedia.com',
  'amazon-adsystem.com',
];

const MIN_BANNER_HEIGHT = 60;
const MIN_BANNER_WIDTH = 200;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,

  async main(ctx) {
    const state = {
      enabled: await enabled.getValue(),
      remove: await removeElements.getValue(),
      allowlist: await allowlist.getValue(),
      count: 0,
    };

    enabled.watch((value) => {
      state.enabled = value ?? true;
      if (state.enabled) scan(document);
    });
    removeElements.watch((value) => {
      state.remove = value ?? true;
    });
    allowlist.watch((value) => {
      state.allowlist = value ?? [];
    });

    const isAllowed = () =>
      state.allowlist.some((domain) => location.hostname.endsWith(domain));

    function hideElement(el: Element) {
      if (state.remove) {
        el.remove();
      } else {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
        (el as HTMLElement).style.setProperty(
          'visibility',
          'hidden',
          'important',
        );
      }
    }

    function isAdByUrl(el: Element) {
      const url = el.getAttribute('src') || el.getAttribute('data-src') || '';
      if (!url) return false;
      return AD_URL_PATTERNS.some((pattern) => url.includes(pattern));
    }

    function isLargeFixedBanner(el: Element) {
      if (el.tagName === 'IFRAME' || el.tagName === 'INS') return false;
      const style = window.getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'sticky') return false;
      const rect = el.getBoundingClientRect();
      if (rect.height < MIN_BANNER_HEIGHT || rect.width < MIN_BANNER_WIDTH) {
        return false;
      }
      return (el.textContent || '').trim().length < 200;
    }

    function report(count: number) {
      if (count <= 0) return;
      state.count += count;
      browser.runtime
        .sendMessage({ type: 'AD_BLOCKED', count })
        .catch(() => {});
    }

    function scan(root: ParentNode) {
      if (!state.enabled || isAllowed()) return;
      let removed = 0;

      root.querySelectorAll(AD_SELECTORS).forEach((el) => {
        hideElement(el);
        removed++;
      });

      root.querySelectorAll('iframe, ins, object, embed').forEach((el) => {
        if (isAdByUrl(el)) {
          hideElement(el);
          removed++;
        }
      });

      if (root === document) {
        document
          .querySelectorAll('body > div, body > aside, body > section')
          .forEach((el) => {
            if (isLargeFixedBanner(el)) {
              hideElement(el);
              removed++;
            }
          });
      }

      report(removed);
    }

    function startObserver() {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              scan(node as Element);
            }
          }
        }
      });
      observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
      });
      ctx.onInvalidated(() => observer.disconnect());
    }

    if (state.enabled) {
      scan(document);
      startObserver();
    }

    browser.runtime.onMessage.addListener((message: unknown) => {
      if ((message as { type?: string })?.type === 'SCAN_NOW') {
        scan(document);
      }
    });
  },
});
