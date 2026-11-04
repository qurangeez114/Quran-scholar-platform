/**
 * Feature modules. Only `equb` and `profiles` are implemented in this milestone.
 * Future modules are registered here as disabled so routing/navigation can be
 * extended without touching the Equb core.
 */
export type ModuleKey = "equb" | "profiles" | "social" | "charity" | "rewards" | "marketplace";

export const MODULES: Record<ModuleKey, { enabled: boolean; label: string }> = {
  equb: { enabled: true, label: "Equb circles" },
  profiles: { enabled: true, label: "Profiles" },
  social: { enabled: false, label: "Community" },
  charity: { enabled: false, label: "Giving" },
  rewards: { enabled: false, label: "Rewards" },
  marketplace: { enabled: false, label: "Marketplace" },
};