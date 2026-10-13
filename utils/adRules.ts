import type { Browser } from 'wxt/browser';

type ResourceType = `${Browser.declarativeNetRequest.ResourceType}`;

const RESOURCE_TYPES: ResourceType[] = [
  'script',
  'image',
  'sub_frame',
  'xmlhttprequest',
  'ping',
  'media',
  'object',
  'font',
  'stylesheet',
  'other',
];

/** Ad network domains blocked at the network layer. */
export const AD_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'amazon-adsystem.com',
  'adnxs.com',
  'adnxs-simple.com',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'casalemedia.com',
  'ads.yahoo.com',
  'moatads.com',
  'adcolony.com',
  'scorecardresearch.com',
  'adform.net',
  'ads-twitter.com',
];

/** Rule IDs used by the dynamic ad-blocking rules (1-based). */
export const dynamicAdRuleIds: number[] = AD_DOMAINS.map(
  (_, index) => index + 1,
);

/** Keep only plausible, ASCII domain names from a raw allowlist. */
function sanitizeDomains(domains: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of domains) {
    const domain = raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!domain || !/^[a-z0-9.-]+$/.test(domain)) continue;
    seen.add(domain);
  }
  return [...seen];
}

/**
 * Build the dynamic declarativeNetRequest rules, skipping requests initiated
 * from allowlisted domains. Dynamic rules are persisted in the browser profile
 * (not inside the extension directory), so they avoid the `_metadata` write
 * that unpacked static rulesets require.
 */
export function buildDynamicAdRules(
  allowlist: string[] = [],
): Browser.declarativeNetRequest.Rule[] {
  const excludedInitiatorDomains = sanitizeDomains(allowlist);

  return AD_DOMAINS.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: RESOURCE_TYPES,
      ...(excludedInitiatorDomains.length > 0
        ? { excludedInitiatorDomains }
        : {}),
    },
  }));
}
