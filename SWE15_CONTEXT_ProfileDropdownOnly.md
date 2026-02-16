# LatticeVeil Site Context (for SWE1.5)

## Repo / Deployment
- Static GitHub Pages site (root: `/index.html`) with shared stylesheet: `assets/site.css`.
- Veilnet demo exists at `/veilnet/` and **already** contains a working avatar dropdown (implemented in `veilnet/assets/veilnet.js` + `veilnet/assets/veilnet.css`).

## Current issue to fix (ONLY)
- On the **main landing page** (`/index.html`), the top-right profile button is currently a simple `<button id="profileIcon" onclick="window.location.href='./veilnet/'">...`.
- Requirement: replace that with a proper dropdown menu (similar behavior to Veilnet) without changing anything else.

## Where to change
1) `index.html`
   - Replace the existing `#profileIcon` button with:
     - a clickable avatar button (still showing `veilnet/assets/default_pfp.png`)
     - a dropdown panel containing actions:
       - Go to Veilnet
       - My Profile (can link to `./veilnet/profile/`)
       - Settings (can link to `./veilnet/settings/`)
       - Login with Google (demo action for now; can be placeholder)
       - Log Out (demo action for now; can be placeholder)
   - Add small inline JS to:
     - toggle dropdown on avatar click
     - close on outside click
     - close on ESC

2) `assets/site.css`
   - Add minimal styles for dropdown panel and avatar button so it matches the current site theme:
     - dark panel background
     - thick border + shadow consistent with existing cards
     - hover styles

## Non-goals
- Do NOT change other sections/tabs/content.
- Do NOT change Veilnet pages or veilnet JS/CSS.
- Do NOT implement real auth; use demo placeholders.

## Acceptance checklist
- Clicking the avatar opens/closes the dropdown.
- Clicking outside closes it.
- ESC closes it.
- Links navigate correctly.
- No layout regressions to existing tabs/nav/VR button.
