# RidePod MVP

RidePod is a mobile-first web app MVP for planned shared ride pods. It is not instant ride-hailing: users form scheduled or recurring groups, lock seat commitments, then one host manually books Uber, Lyft, taxi, or private car.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` landing page with RidePod positioning and CTAs.
- `/home` ride pod feed with tabs, search/filter controls, and pod cards.
- `/create` pod type picker.
- `/create/scheduled` scheduled pod creation flow with mock success state.
- `/create/recurring` recurring pod creation flow with mock member slots.
- `/pods` current user's pods.
- `/pods/[id]` pod detail with members, host team, rules, and timeline.
- `/pods/[id]/join` four-step mock join/payment authorization flow.
- `/host` host dashboard with member payment states and checklist.
- `/settlement` receipt upload and settlement calculator mock.
- `/profile` trust, verification, payment placeholder, and preferences.
- `/settings` basic app settings.
- `/theme` RidePod design-system preview for dark/light tokens, background assets, buttons, cards, badges, and stepper.
- `/designs` high-fidelity design variation index.
- `/designs/fintech`, `/designs/community`, `/designs/travel`, `/designs/premium`, `/designs/campus` visual concepts. Each includes feed, pod detail, create, join confirmation, host dashboard, and profile/trust screens.

## Screenshots

With the dev server running, capture mobile screenshots of the design variations:

```bash
npm run screenshots
```

The script writes PNGs to `screenshots/`. If Playwright has not installed a browser on this machine yet, run `npx playwright install chromium` first.

## Data

Mock users, ride pods, payment states, attendance states, waitlists, and helpers live in `src/lib/mock-data.ts`. There is no Stripe, Supabase, or native app dependency in this phase.

## Theme System

RidePod uses semantic CSS variables for dark executive mode and light itinerary mode. The theme toggle persists the selected mode in `localStorage` under `ridepod-theme`. Background assets live in `public/ridepod/`.
