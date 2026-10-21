/**
 * Generic (site independent) cosmetic ad filters.
 *
 * Everything in here runs on every page, so a false positive is expensive:
 * it either breaks the layout of an unrelated site or trips an ad-block
 * detection probe, which makes the site render a "please disable your ad
 * blocker" overlay. Detection probes are therefore never touched.
 */

/**
 * Selectors matching ad containers on most sites.
 *
 * Note the absence of a generic `adsbygoogle` rule: the class is also used
 * by 1x1 detection probes, so only the real AdSense unit (`ins`) is matched.
 */
export const GENERIC_AD_SELECTORS = [
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
  "[class*='adsense']",
  "[class*='sponsored']",
  "[class*='banner-ad']",
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
  // Adnimation (Prebid / Google Publisher Tag) ad slots.
  'div[data-adpath]',
].join(',');

/**
 * Hosts used by ad frames/images.
 *
 * `a.pub.network` is deliberately missing: that host doubles as the beacon
 * of the FreeStar ad-block detection, and blocking it makes the site show
 * its "disable your blocker" overlay.
 */
export const AD_URL_PATTERNS = [
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
  'adncdn.net',
  'adnimation.com',
  'vdo.ai',
  'vidazoo.com',
];

/**
 * "Please disable your ad blocker" overlays.
 *
 * The FreeStar / pub.network detector renders a full screen modal when it
 * concludes a blocker is active. Both the generated class name and the
 * generated element id are matched.
 */
export const OVERLAY_SELECTORS = ['div.rifz79', 'div[id="_17kgr7y"]'].join(',');

/** Descendants that give away an ad container. */
const AD_CONTENT_SELECTOR = [
  'iframe',
  'ins',
  'object',
  'embed',
  '[data-adpath]',
  '[data-ad-slot]',
  '[data-ad-client]',
  '[data-ad-client-id]',
  '[id^="google_ads_iframe"]',
  '[class*="adsbygoogle"]',
  '[class*="ad-container"]',
  '[class*="ad_wrapper"]',
].join(',');

/** True when `el` itself looks like an ad container. */
export function looksLikeAd(el: Element): boolean {
  return (
    el.matches(AD_CONTENT_SELECTOR) ||
    el.querySelector(AD_CONTENT_SELECTOR) !== null
  );
}

/**
 * Ad-block detection probes.
 *
 * Blockers that ship an "are you blocking ads?" check inject a throwaway
 * element and verify that it is still rendered. Hiding or removing such a
 * probe is exactly what makes a site believe an ad blocker is active, so
 * probes are always left alone.
 *
 * Known probes:
 * - FreeStar / pub.network:
 *   `<div class="ad banner-ad ..." data-freestar-ad="0.42">0.17</div>`
 * - moa (srvb1.com):
 *   `<div class="adsbygoogle google-ads" data-moa_id="..." ...>`
 */
export function isDetectionProbe(el: Element): boolean {
  if (el.hasAttribute('data-freestar-ad')) return true;
  if (el.hasAttribute('data-moa_id') || el.hasAttribute('data-adscript')) {
    return true;
  }

  // Generic 1x1 probe parked off-screen at the end of <body>.
  if (el.children.length === 0 && el.parentElement === document.body) {
    const style = el.getAttribute('style') ?? '';
    if (
      /position\s*:\s*absolute/i.test(style) &&
      /left\s*:\s*-\d{3,}/i.test(style)
    ) {
      return true;
    }
  }

  return false;
}

/** True when `el` contains a detection probe somewhere below it. */
export function containsDetectionProbe(el: Element): boolean {
  return (
    el.querySelector(
      '[data-freestar-ad], [data-moa_id], [data-adscript]',
    ) !== null
  );
}
