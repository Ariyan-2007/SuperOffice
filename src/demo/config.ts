// Project Showcase mode: everything a visitor needs to sign in when there's no reachable
// Vastora API behind this deployment. Passwords are deliberately simple — this is a sandbox
// with data that resets on demand, never a real account.
export const DEMO_PASSWORD = "Showcase@123";

// Shown in place of a Business logo only while Showcase mode is active — every seeded Business
// leaves logoUrl empty, and there's no real backend to upload a real one to. Stored the same
// way a real Business's logo would be: one static asset per Business under public/businesses.
export const DEMO_LOGO_URL = "/businesses/Vastora/Vastora-Logo.svg";

export const DEMO_EMAILS = {
  owner: "owner@showcase.vastora.dev",
  admin: "admin@showcase.vastora.dev",
  staff: "staff@showcase.vastora.dev",
  agent: "rider@showcase.vastora.dev",
} as const;

export interface DemoAccount {
  role: string;
  email: string;
  password: string;
  note: string;
}

export const DEMO_ACCOUNTS: { backoffice: DemoAccount[]; superoffice: DemoAccount[] } = {
  backoffice: [
    { role: "Business Admin", email: DEMO_EMAILS.admin, password: DEMO_PASSWORD, note: "Full BackOffice access" },
    { role: "Delivery Agent", email: DEMO_EMAILS.agent, password: DEMO_PASSWORD, note: "Rider view" },
  ],
  superoffice: [
    { role: "Tenant Owner", email: DEMO_EMAILS.owner, password: DEMO_PASSWORD, note: "Manage every Business" },
  ],
};
