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

/** Hosts where X (Twitter) specific ad rules apply. */
const X_HOSTS = ['x.com', 'twitter.com'];

/**
 * Localized "Promoted" labels X renders on ad tweets, promoted trends and
 * promoted "who to follow" accounts. Matched against leaf elements only to
 * avoid false positives on larger text blocks.
 */
const X_PROMOTED_LABELS = new Set([
  'promoted',
  'ad',
  '推广',
  '推广内容',
  'プロモーション',
  'anzeige',
  'promocionado',
  'sponsorisé',
  'promosso',
  'gesponsert',
  'promu',
]);

function isXHost(): boolean {
  const host = location.hostname;
  return X_HOSTS.some((base) => host === base || host.endsWith(`.${base}`));
}

/** querySelectorAll, but also matching `root` itself when it is an Element. */
function queryAll(root: ParentNode, selector: string): Element[] {
  const found = Array.from(root.querySelectorAll(selector));
  if (root instanceof Element && root.matches(selector)) {
    found.unshift(root);
  }
  return found;
}

/** True when a leaf element somewhere inside `el` is exactly a promoted label. */
function hasPromotedLabel(el: Element): boolean {
  for (const node of el.querySelectorAll('span, div')) {
    if (node.children.length > 0) continue;
    const text = (node.textContent || '').trim().toLowerCase();
    if (X_PROMOTED_LABELS.has(text)) return true;
  }
  return false;
}

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

    function hideXElement(el: Element) {
      // X's timeline is a virtualized React list; detaching nodes can blank
      // the feed, so X ads are always hidden rather than removed.
      const node = el as HTMLElement;
      node.style.setProperty('display', 'none', 'important');
    }

    function cleanXAds(root: ParentNode): number {
      if (!isXHost()) return 0;
      let removed = 0;

      // Promoted tweets/trends/video units are wrapped in `placementTracking`;
      // collapse the whole timeline cell instead of the inner wrapper.
      queryAll(root, '[data-testid="placementTracking"]').forEach((el) => {
        const cell =
          el.closest(
            '[data-testid="cellInnerDiv"], article[data-testid="tweet"]',
          ) ?? el;
        hideXElement(cell);
        removed++;
      });

      // Search/other placements mark ads with a "Promoted" label.
      queryAll(root, 'article[data-testid="tweet"]').forEach((el) => {
        if (el.querySelector('[data-testid="placementTracking"]')) return;
        if (hasPromotedLabel(el)) {
          hideXElement(el);
          removed++;
        }
      });

      // Promoted trends and promoted "who to follow" accounts.
      queryAll(root, '[data-testid="trend"], [data-testid="UserCell"]').forEach(
        (el) => {
          if (hasPromotedLabel(el)) {
            hideXElement(el);
            removed++;
          }
        },
      );

      return removed;
    }

    function scan(root: ParentNode) {
      if (!state.enabled || isAllowed()) return;
      let removed = 0;

      root.querySelectorAll(AD_SELECTORS).forEach((el) => {
        hideElement(el);
        removed++;
      });

      removed += cleanXAds(root);

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
