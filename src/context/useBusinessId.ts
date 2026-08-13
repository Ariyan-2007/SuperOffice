import { useBusiness } from "./BusinessContext";

// Only ever called from within BackOffice's authenticated route tree, where the Business
// has already been resolved (BackOfficeRoutes blocks rendering until it has) — so the
// non-null assertion here reflects a real invariant, not a shortcut.
export function useBusinessId(): string {
  const { business } = useBusiness();
  return business!.id;
}
