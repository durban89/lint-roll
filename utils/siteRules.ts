/**
 * Shape of a per-site ad blocking rule.
 *
 * A rule is matched against the hostname of the frame being cleaned; the
 * first rule whose `hosts` cover the hostname wins.
 */
export interface SiteRule {
  /** Host suffixes this rule applies to. `example.com` also covers `www.example.com`. */
  hosts: string[];
  /** CSS selectors whose matched elements are ads. */
  selectors: string[];
  /** Selectors that must never be hidden, even when they match `selectors`. */
  exclude?: string[];
  /** Extra URL fragments that identify ads on this site. */
  urlPatterns?: string[];
  /** Extra domains to block at the network layer for this site only. */
  blockDomains?: string[];
  /** Skip network blocking entirely for this site. */
  cosmeticOnly?: boolean;
}

/**
 * Per-site cosmetic rules.
 *
 * Generic heuristics cannot describe every ad layout. Publishers usually
 * reserve stable element ids for their ad slots, so a handful of precise
 * selectors removes far more ads than a heuristic ever could - without the
 * false positives of a broad class matcher.
 */
export const SITE_RULES: SiteRule[] = [
  {
    hosts: ['wenxuecity.com'],
    selectors: [
      // Adnimation / Google Publisher Tag ad slots (stable slot ids).
      '#wenxuecity_Top_HP',
      '#wenxuecity_Middle_1_HP',
      '#wenxuecity_Middle_2_HP',
      '#wenxuecity_Middle_3_HP',
      '#wenxuecity_SideBar_Left_1_HP',
      '#wenxuecity_SideBar_Left_2_HP',
      '#wenxuecity_SideBar_Right_1_HP',
      '#wenxuecity_SideBar_Right_2_HP',
      '[id^="wenxuecity-com_news_article"]',
      '[id^="wenxuecity-com_news_category"]',
      '[id^="wenxuecity-com_blog_article"]',
      '[id^="wenxuecity-com_blog_category"]',

      // Adnimation slot wrappers, sticky units and the Taboola widget.
      'div[data-adpath]',
      '.adnSticky',
      '#taboola-below-article-thumbnails-50',

      // In-content ad placeholders.
      '.HPInContent',
      '.Article_InContent',

      // Site ad chrome: "advertisement" captions, reserved space and the
      // house ads that link out through DoubleClick.
      '.hometop',
      '.midbannerw',
      '.adt',
      'label.adlab',
      'label.adlab_border',
      'a[href*="pubads.g.doubleclick.net"]',
      'a[rel~="sponsored"]',
      'a:has(> img[src*="adserver.wenxuecity.com"])',
      'img[src*="adserver.wenxuecity.com"]',
    ],
    urlPatterns: ['adserver.wenxuecity.com'],
    // The publisher's own ad server only ever serves house ads.
    blockDomains: ['adserver.wenxuecity.com'],
  },
];

/** Normalize user input (URL or host) into a bare lowercase host name. */
export function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

/** True when `hostname` is covered by any host in `hosts`. */
export function isHostListed(hostname: string, hosts: string[]): boolean {
  return hosts.some((host) => hostMatches(hostname, host));
}

/** True when `hostname` is covered by `host` (host itself or a subdomain). */
export function hostMatches(hostname: string, host: string): boolean {
  const name = hostname.toLowerCase();
  const base = host.toLowerCase();
  return name === base || name.endsWith(`.${base}`);
}

/** Find the most specific rule that applies to `hostname`. */
export function findSiteRule(hostname: string): SiteRule | undefined {
  return SITE_RULES.find((rule) =>
    rule.hosts.some((host) => hostMatches(hostname, host)),
  );
}
