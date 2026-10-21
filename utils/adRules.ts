import type { Browser } from 'wxt/browser';
import { SITE_RULES } from '@/utils/siteRules';

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

/**
 * Ad network domains blocked at the network layer.
 *
 * Two hosts are intentionally missing:
 * - `a.pub.network` doubles as the beacon of the FreeStar ad-block
 *   detector; blocking it makes the site show a "disable your blocker"
 *   overlay instead of its ads.
 * - `googletagservices.com` is loaded by that same detector to verify that
 *   scripts still work.
 */
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
  // Adnimation (Prebid / Google Publisher Tag) - powers most Chinese
  // publisher ad slots.
  'adncdn.net',
  'adnimation.com',
  'adnpbs.com',
  // moa ad network. Its tag is mostly an ad-block detector, so blocking it
  // removes the detection instead of triggering it.
  'srvb1.com',
  // Additional bidders and sellers used by the Prebid stack above.
  '33across.com',
  'smartadserver.com',
  'liveintent.com',
  'sharethrough.com',
  'sonobi.com',
  'triplelift.com',
  'vidazoo.com',
  'media.net',
  'bidswitch.net',
  'indexexchange.com',
  'sovrn.com',
  'anyclip.com',
  'yellowblue.io',
  'bbvms.com',
  '4dex.io',
  'amxdt.net',
  'a-mx.com',
  'a-mo.net',
  'zerodegreeads.com',
  'cadmus.script.ac',
  'kueezrtb.com',
  'vdo.ai',
];

/** Domains blocked only when the request originates from a specific site. */
export interface SiteScopedDomain {
  domain: string;
  hosts: string[];
}

function siteScopedDomains(): SiteScopedDomain[] {
  const scoped: SiteScopedDomain[] = [];
  for (const rule of SITE_RULES) {
    if (rule.cosmeticOnly) continue;
    for (const domain of rule.blockDomains ?? []) {
      scoped.push({ domain, hosts: rule.hosts });
    }
  }
  return scoped;
}

/** Hosts that must not be blocked at the network layer at all. */
function cosmeticOnlyHosts(): string[] {
  const hosts: string[] = [];
  for (const rule of SITE_RULES) {
    if (!rule.cosmeticOnly) continue;
    hosts.push(...rule.hosts);
  }
  return hosts;
}

/** Domains blocked everywhere. */
export const SITE_SCOPED_DOMAINS = siteScopedDomains();

/** Rule ids used by the dynamic ad-blocking rules (1-based). */
export const dynamicAdRuleIds: number[] = [
  ...AD_DOMAINS.map((_, index) => index + 1),
  ...SITE_SCOPED_DOMAINS.map((_, index) => AD_DOMAINS.length + index + 1),
];

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
  const excludedInitiatorDomains = sanitizeDomains([
    ...allowlist,
    // Sites that opted out of network blocking keep their ads loadable and
    // are only cleaned up cosmetically.
    ...cosmeticOnlyHosts(),
  ]);
  const excluded = excludedInitiatorDomains.length > 0
    ? { excludedInitiatorDomains }
    : {};

  const globalRules: Browser.declarativeNetRequest.Rule[] = AD_DOMAINS.map(
    (domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: RESOURCE_TYPES,
        ...excluded,
      },
    }),
  );

  const scopedRules: Browser.declarativeNetRequest.Rule[] =
    SITE_SCOPED_DOMAINS.map((entry, index) => ({
      id: AD_DOMAINS.length + index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${entry.domain}`,
        resourceTypes: RESOURCE_TYPES,
        initiatorDomains: entry.hosts,
        ...excluded,
      },
    }));

  return [...globalRules, ...scopedRules];
}
