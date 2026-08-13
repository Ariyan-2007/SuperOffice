# Vastora Office

One React + Vite + TypeScript codebase that serves both **BackOffice** (single-Business day-to-day
console) and **SuperOffice** (cross-business Tenant control panel) against the Vastora API — see
[`BACKOFFICE_FRONTEND_BLUEPRINT.md`](./BACKOFFICE_FRONTEND_BLUEPRINT.md) and
[`SUPEROFFICE_FRONTEND_BLUEPRINT.md`](./SUPEROFFICE_FRONTEND_BLUEPRINT.md) for the full API contract
each mode is built against.

## Which app is this build?

`VITE_APP_MODE` decides it — `backoffice` or `superoffice`. Everything else (routing, nav, role
checks, theming) branches off that single value in [`src/config/env.ts`](./src/config/env.ts).

```
VITE_API_BASE_URL=http://localhost:5276   # staging — swap for the real API base URL per environment

# BackOffice — one deployment per Business
VITE_APP_MODE=backoffice
VITE_BUSINESS_SLUG=antivaly

# SuperOffice — one deployment total, login determines the Tenant
VITE_APP_MODE=superoffice
```

If `VITE_APP_MODE` is omitted, it's inferred: a `VITE_BUSINESS_SLUG` present means BackOffice,
otherwise SuperOffice. Copy [`.env.backoffice.example`](./.env.backoffice.example) or
[`.env.superoffice.example`](./.env.superoffice.example) to `.env.local` to get started.

## White-labeling

BackOffice deployments resolve their Business at startup via the public
`GET /api/shop/{slug}` endpoint, then derive the entire brand color scale (`--brand-50`
through `--brand-950`, plus a contrast-safe text color) from `business.themeColor` — see
[`src/theme/color.ts`](./src/theme/color.ts). The login screen, sidebar, and every accent color
in the app already match the client's brand before anyone logs in, with zero code changes: ship a
new BackOffice by setting two env vars.

## Getting started

```
npm install
cp .env.backoffice.example .env.local   # or .env.superoffice.example
npm run dev
```

## Structure

```
src/
  api/            axios client (401 refresh-and-retry, RFC7807 error parsing), typed endpoints
  auth/           AuthContext — login/logout, role checks per mode, token lifecycle
  context/        BusinessContext (slug resolution + branding), ToastContext
  components/     shared UI primitives (Button, Field, DataTable, Modal, Badge, …)
  layouts/        Sidebar/Topbar/AppLayout, AuthLayout, DeliveryAgentLayout (minimal shell)
  routes/         BackOfficeRoutes, SuperOfficeRoutes, role guards
  pages/
    shared/       Login, Profile — reused by both modes
    backoffice/   Dashboard, Business, Categories, Products, Coupons, Staff, Customers,
                  Delivery agents, Orders, My deliveries/status (DeliveryAgent shell)
    superoffice/  Dashboard (Business list), Tenant profile, Business detail/edit, Create business
  theme/          color math (brand scale derivation) + light/dark mode context
  types/          Vastora API DTOs, mirrored from both blueprints
```

## Notes

- Auth tokens live in `localStorage` (foundation-phase pragmatic choice, per both blueprints —
  revisit if an httpOnly-cookie BFF ever lands in front of the API).
- Role-based nav/routing is a UX convenience only; the API is the real enforcement point and
  403s any call a role isn't entitled to.
- No aggregate stats endpoints exist yet on either dashboard — both are computed client-side
  from list responses already being fetched, per each blueprint's guidance.
