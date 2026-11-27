# LintRoll

Sweep away page ads like a lint roller removes lint from fabric.

A browser extension built with [WXT](https://wxt.dev) + React + TypeScript + Tailwind CSS v4 that detects and removes ad elements on pages and blocks common ad network requests via `declarativeNetRequest` dynamic rules.

## Features

- DOM ad detection (class names / IDs / iframe src / fixed overlay banners)
- Per-site rules (`utils/siteRules.ts`) for publishers with stable ad slot ids;
  currently covers X (x.com/twitter.com) and wenxuecity.com
- Ad-block **detection** protection: probe elements are never hidden, so sites
  stop showing "please disable your ad blocker" overlays
- `MutationObserver` for dynamically injected ads (SPA friendly)
- Global on/off switch, hide vs. remove mode
- Managed sites: optional opt-in list, so the extension only runs on the sites
  you add (subdomains included) and leaves every other site untouched
- Site allowlist (applied to both DOM cleanup and network blocking)
- Per-site block statistics, toolbar badge
- Stack: MV3, WXT 0.21, React 19, Vite 8, Tailwind v4

## Requirements

- Node.js 20+
- pnpm

## Development

```sh
pnpm install
pnpm dev
```

The browser opens automatically with the extension loaded and supports HMR.

## Build

```sh
pnpm build        # build for Chrome
pnpm build:firefox

pnpm zip          # package for release
```

Output goes to `.output/`; the unpacked extension lives in `.output/chrome-mv3/`
(load it via `chrome://extensions` → enable Developer mode → Load unpacked).

## Tests

```sh
pnpm test         # bundles and runs the rule invariants
pnpm compile      # tsc --noEmit
```

`tests/rules.test.ts` guards the invariants that are easy to break by accident:
rule ids stay unique, the allowlist stays normalized, and the hosts used by
ad-block detection are never added to the block list.

## Project Structure

```plaintext
entrypoints/       # entrypoints (background / content / popup / options)
components/        # React components
hooks/             # React hooks
utils/             # storage, settings, filters and ad-block rules
tests/             # rule invariant tests
public/icon/       # icons
```

Network blocking rules are registered at runtime via
`declarativeNetRequest.updateDynamicRules` (see `utils/adRules.ts` and
`entrypoints/background.ts`). Dynamic rules are stored in the browser profile
rather than the extension directory, so they work with unpacked dev loads.

## How ads are removed

Filtering happens in two independent layers:

| Layer | File | What it does |
| --- | --- | --- |
| Cosmetic | `entrypoints/content.ts` | Hides/removes ad elements in the DOM, removes "disable your blocker" overlays |
| Network | `utils/adRules.ts` | Blocks requests to ad networks and bidders via dynamic DNR rules |

### Managed sites

By default the extension only runs on the sites listed under **Managed Sites**
in the options page (or via the popup's "Manage this site" toggle). Adding
`baidu.com` covers `www.baidu.com`, `m.baidu.com` and every other subdomain.
Sites that are not on the list are skipped by both layers: the content script
stops scanning and the dynamic network rules are limited to managed initiators.
Turn "Only run on managed sites" off in the options to go back to blocking
across the whole web.

`utils/adFilters.ts` holds the site-independent selectors, `utils/siteRules.ts`
holds the per-site ones. A site rule wins over the generic heuristics, and
`exclude` selectors protect elements that look like ads but are not.

### Ad-block detection protection

Many publishers run an "are you blocking ads?" check. The check injects a
throwaway element and verifies that it is still rendered; if the element is
hidden or removed, the site concludes a blocker is active and covers the page
with a full-screen modal.

Two such checks are known and are explicitly left alone by
`isDetectionProbe()` in `utils/adFilters.ts`:

- **FreeStar / pub.network** –
  `<div class="ad banner-ad ..." data-freestar-ad="0.42">0.17</div>`. The
  detector additionally probes `https://a.pub.network/core/imgs/1.png` and
  `https://a.pub.network/core/prebid-universal-creative.js` and verifies that
  the response was not redirected.
- **moa (srvb1.com)** – `<div class="adsbygoogle google-ads" data-moa_id="...">`
  parked off-screen at 1x1. A zero-sized probe is reported as "blocker active".

Consequences for the rule set:

- `a.pub.network` and `googletagservices.com` are **never** blocked, even
  though they belong to the ad stack.
- The generic `adsbygoogle` class matcher was dropped; only the real AdSense
  unit (`ins.adsbygoogle`) is matched.
- `srvb1.com` *is* blocked: the moa tag is mostly a detector, so removing it
  removes the detection instead of triggering it.
- Ads are hidden with inline styles instead of injected CSS rules, because a
  `!important` stylesheet rule would hit the probe elements as well.

## Notes

This project is for educational/demo purposes. The ad detection rules
(DOM selectors in `utils/adFilters.ts` and `utils/siteRules.ts`, network
domains in `utils/adRules.ts`) cover common cases and can be extended as
needed.


## License

Licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE)
(AGPL-3.0-or-later).

Copyright (C) 2026 Daniel Zhang

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version. It is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.
