import {
  AD_URL_PATTERNS,
  GENERIC_AD_SELECTORS,
  OVERLAY_SELECTORS,
  containsDetectionProbe,
  isDetectionProbe,
  looksLikeAd,
} from '@/utils/adFilters';
import { allowlist, enabled, removeElements } from '@/utils/settings';
import { findSiteRule, hostMatches, type SiteRule } from '@/utils/siteRules';

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
    };

    /** Elements already processed, so they are not counted twice. */
    const counted = new WeakSet<Element>();
    /** Site rule that applies to this frame. */
    let siteRule: SiteRule | undefined = findSiteRule(location.hostname);
    /** Selector list for this frame, rebuilt when the site rule changes. */
    let selectors = '';
    let sitePatterns = AD_URL_PATTERNS;

    function refreshSiteRule(): void {
      siteRule = findSiteRule(location.hostname);
      selectors = [GENERIC_AD_SELECTORS, ...(siteRule?.selectors ?? [])].join(
        ',',
      );
      sitePatterns = [...AD_URL_PATTERNS, ...(siteRule?.urlPatterns ?? [])];
    }

    refreshSiteRule();

    enabled.watch((value) => {
      state.enabled = value ?? true;
      if (state.enabled) scan(document);
    });
    removeElements.watch((value) => {
      state.remove = value ?? true;
      // Re-run so elements that were only hidden get removed as well.
      if (state.enabled) scan(document);
    });
    allowlist.watch((value) => {
      state.allowlist = value ?? [];
    });

    const isAllowed = () =>
      state.allowlist.some((domain) => hostMatches(location.hostname, domain));

    function hideElement(el: Element) {
      if (state.remove) {
        el.remove();
      } else {
        const node = el as HTMLElement;
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
      }
    }

    function isAdByUrl(el: Element) {
      const url = el.getAttribute('src') || el.getAttribute('data-src') || '';
      if (!url) return false;
      return sitePatterns.some((pattern) => url.includes(pattern));
    }

    function isLargeFixedBanner(el: Element) {
      if (el.tagName === 'IFRAME' || el.tagName === 'INS') return false;
      // Hiding a container that holds a detection probe would trip it.
      if (containsDetectionProbe(el)) return false;
      const style = window.getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'sticky') return false;
      const rect = el.getBoundingClientRect();
      if (rect.height < MIN_BANNER_HEIGHT || rect.width < MIN_BANNER_WIDTH) {
        return false;
      }
      if ((el.textContent || '').trim().length >= 200) return false;
      // Only treat it as an ad when it actually carries ad content, so
      // cookie banners and other sticky chrome survive.
      return looksLikeAd(el);
    }

    function report(count: number) {
      if (count <= 0) return;
      browser.runtime
        .sendMessage({
          type: 'AD_BLOCKED',
          count,
          host: location.hostname,
        })
        .catch(() => {});
    }

    function cleanXAds(root: ParentNode): number {
      if (!isXHost()) return 0;
      let removed = 0;

      const hide = (el: Element) => {
        // X's timeline is a virtualized React list; detaching nodes can blank
        // the feed, so X ads are always hidden rather than removed.
        const node = el as HTMLElement;
        node.style.setProperty('display', 'none', 'important');
        if (counted.has(el)) return;
        counted.add(el);
        removed++;
      };

      // Promoted tweets/trends/video units are wrapped in `placementTracking`;
      // collapse the whole timeline cell instead of the inner wrapper.
      queryAll(root, '[data-testid="placementTracking"]').forEach((el) => {
        const cell =
          el.closest(
            '[data-testid="cellInnerDiv"], article[data-testid="tweet"]',
          ) ?? el;
        hide(cell);
      });

      // Search/other placements mark ads with a "Promoted" label.
      queryAll(root, 'article[data-testid="tweet"]').forEach((el) => {
        if (el.querySelector('[data-testid="placementTracking"]')) return;
        if (hasPromotedLabel(el)) hide(el);
      });

      // Promoted trends and promoted "who to follow" accounts.
      queryAll(root, '[data-testid="trend"], [data-testid="UserCell"]').forEach(
        (el) => {
          if (hasPromotedLabel(el)) hide(el);
        },
      );

      return removed;
    }

    function isExcluded(el: Element): boolean {
      const exclude = siteRule?.exclude;
      if (!exclude || exclude.length === 0) return false;
      return exclude.some((selector) => el.matches(selector));
    }

    function scan(root: ParentNode) {
      if (!state.enabled || isAllowed()) return;
      let removed = 0;

      /**
       * Hide an element and count it once. Hiding is idempotent, so a site
       * that re-inserts a previously removed ad is handled again - but the
       * statistic is not inflated.
       */
      function handle(el: Element) {
        hideElement(el);
        if (counted.has(el)) return;
        counted.add(el);
        removed++;
      }

      for (const el of queryAll(root, selectors)) {
        // Detection probes must stay visible, otherwise the site believes an
        // ad blocker is active and covers the page with a modal.
        if (isDetectionProbe(el)) continue;
        if (isExcluded(el)) continue;
        handle(el);
      }

      removed += cleanXAds(root);

      for (const el of queryAll(root, 'iframe, ins, object, embed')) {
        if (isDetectionProbe(el)) continue;
        if (!isAdByUrl(el)) continue;
        handle(el);
      }

      // "Please disable your ad blocker" modals.
      for (const el of queryAll(root, OVERLAY_SELECTORS)) {
        handle(el);
      }

      if (root === document || root.parentElement === document.body) {
        document
          .querySelectorAll('body > div, body > aside, body > section')
          .forEach((el) => {
            if (!isLargeFixedBanner(el)) return;
            handle(el);
          });
      }

      report(removed);
    }

    function startObserver() {
      const observer = new MutationObserver((mutations) => {
        // A container and its children are often added in the same batch, so
        // scanning the outermost node covers all of them.
        const roots: Element[] = [];
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            const el = node as Element;
            if (roots.some((root) => root.contains(el))) continue;
            roots.push(el);
            scan(el);
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
    }
    // The observer always runs; `scan` bails out while blocking is off.
    startObserver();

    browser.runtime.onMessage.addListener((message: unknown) => {
      const type = (message as { type?: string })?.type;
      if (type === 'SCAN_NOW') {
        refreshSiteRule();
        scan(document);
      }
    });
  },
});
