import {
  AD_DOMAINS,
  SITE_SCOPED_DOMAINS,
  buildDynamicAdRules,
  dynamicAdRuleIds,
} from '@/utils/adRules';
import { SITE_RULES } from '@/utils/siteRules';

let failures = 0;

function check(name: string, condition: boolean, extra = ''): void {
  if (condition) {
    console.log(`  ok   ${name}${extra ? ` ${extra}` : ''}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${extra ? ` ${extra}` : ''}`);
  }
}

console.log('\n[1] dynamic rules are well formed');
const rules = buildDynamicAdRules([]);
check(
  'rule count matches the id list',
  rules.length === dynamicAdRuleIds.length,
  `${rules.length} vs ${dynamicAdRuleIds.length}`,
);
check('rule ids are unique', new Set(rules.map((r) => r.id)).size === rules.length);
check('rule ids are positive integers', rules.every((r) => Number.isInteger(r.id) && r.id > 0));
check('every rule blocks', rules.every((r) => r.action.type === 'block'));
check(
  'every rule has a url filter',
  rules.every((r) => typeof r.condition.urlFilter === 'string' && r.condition.urlFilter.length > 2),
);
check(
  'excluded initiator lists are never empty',
  rules.every(
    (r) =>
      !('excludedInitiatorDomains' in r.condition) ||
      (r.condition.excludedInitiatorDomains as string[]).length > 0,
  ),
);

console.log('\n[2] allowlist is normalized and deduplicated');
const withAllow = buildDynamicAdRules(['example.com', 'example.com', 'https://foo.bar/path']);
const excluded = (withAllow[0]?.condition.excludedInitiatorDomains ??
  []) as string[];
check(
  'protocol, path and duplicates are stripped',
  JSON.stringify(excluded) === JSON.stringify(['example.com', 'foo.bar']),
  JSON.stringify(excluded),
);
check(
  'scoped rules keep their initiator domains',
  withAllow
    .filter((r) => r.condition.initiatorDomains)
    .every((r) => (r.condition.initiatorDomains as string[]).length > 0),
);

console.log('\n[3] hosts used by ad-block detection are never blocked');
// Blocking these makes a site show a "please disable your ad blocker" overlay.
for (const host of ['a.pub.network', 'pub.network', 'googletagservices.com']) {
  check(
    `${host} is not in the block list`,
    !AD_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)),
  );
}

console.log('\n[4] site rules are consistent');
for (const rule of SITE_RULES) {
  const name = rule.hosts.join(',');
  check(`${name}: has hosts`, rule.hosts.length > 0);
  check(`${name}: has selectors`, rule.selectors.length > 0);
  check(
    `${name}: cosmetic-only rules declare no blocked domains`,
    !rule.cosmeticOnly || !rule.blockDomains?.length,
  );
  check(
    `${name}: block domains are plain host names`,
    (rule.blockDomains ?? []).every((d) => /^[a-z0-9.-]+$/.test(d)),
  );
}

console.log('\n[5] cosmetic-only sites are excluded from network blocking');
const cosmetic = SITE_RULES.filter((r) => r.cosmeticOnly);
if (cosmetic.length === 0) {
  console.log('  (no cosmetic-only rules configured)');
} else {
  const built = buildDynamicAdRules([]);
  const hosts = cosmetic.flatMap((r) => r.hosts);
  const globalExcluded = (built[0]?.condition.excludedInitiatorDomains ??
    []) as string[];
  check(
    'cosmetic-only hosts are excluded from the global rules',
    hosts.every((h) => globalExcluded.includes(h)),
  );
  check(
    'cosmetic-only sites get no scoped rules',
    !SITE_SCOPED_DOMAINS.some((s) =>
      cosmetic.some((c) => c.hosts.includes(s.hosts[0] ?? '')),
    ),
  );
}

console.log(failures === 0 ? '\nALL PASS\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
