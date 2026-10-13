# LintRoll

Sweep away page ads like a lint roller removes lint from fabric.

A browser extension built with [WXT](https://wxt.dev) + React + TypeScript + Tailwind CSS v4 that detects and removes ad elements on pages and blocks common ad network requests via `declarativeNetRequest` dynamic rules.

## Features

- DOM ad detection (class names / IDs / iframe src / fixed overlay banners)
- Site-specific rules for X (x.com/twitter.com): promoted tweets, trends and
  promoted "who to follow" accounts
- `MutationObserver` for dynamically injected ads (SPA friendly)
- Global on/off switch, hide vs. remove mode
- Site allowlist (applied to both DOM cleanup and network blocking)
- Block statistics and toolbar badge
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

## Project Structure

```plaintext
entrypoints/       # entrypoints (background / content / popup / options)
components/        # React components
hooks/             # React hooks
utils/             # storage, settings and ad-block rules
public/icon/       # icons
```

Network blocking rules are registered at runtime via
`declarativeNetRequest.updateDynamicRules` (see `utils/adRules.ts` and
`entrypoints/background.ts`). Dynamic rules are stored in the browser profile
rather than the extension directory, so they work with unpacked dev loads.

## Notes

This project is for educational/demo purposes. The ad detection rules
(DOM selectors in `content.ts`, network domains in `utils/adRules.ts`) cover
common cases and can be extended as needed.

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
