export type OrganizationPlan = "trial" | "starter" | "pro" | "enterprise";

export type PlanLimitKey = "users" | "branches" | "leads";

export interface PlanDefinition {
  id: OrganizationPlan;
  label: string;
  description: string;
  maxUsers: number | null;
  maxBranches: number | null;
  maxLeads: number | null;
}

export const ORG_PLANS: Record<OrganizationPlan, PlanDefinition> = {
  trial: {
    id: "trial",
    label: "Free trial",
    description: "Full modules for evaluation with modest capacity limits.",
    maxUsers: 5,
    maxBranches: 2,
    maxLeads: 200,
  },
  starter: {
    id: "starter",
    label: "Starter",
    description: "Small agencies getting started with the CRM.",
    maxUsers: 10,
    maxBranches: 3,
    maxLeads: 2_000,
  },
  pro: {
    id: "pro",
    label: "Pro",
    description: "Growing teams with higher volume and multiple branches.",
    maxUsers: 50,
    maxBranches: 10,
    maxLeads: 25_000,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    description: "Unlimited capacity for large organizations.",
    maxUsers: null,
    maxBranches: null,
    maxLeads: null,
  },
};

export const ORG_PLAN_IDS = Object.keys(ORG_PLANS) as OrganizationPlan[];

export function normalizeOrganizationPlan(raw: unknown): OrganizationPlan {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s in ORG_PLANS) return s as OrganizationPlan;
  return "trial";
}

export function planLimitFor(plan: OrganizationPlan, key: PlanLimitKey): number | null {
  const def = ORG_PLANS[plan];
  if (key === "users") return def.maxUsers;
  if (key === "branches") return def.maxBranches;
  return def.maxLeads;
}

export function formatPlanLimit(value: number | null): string {
  if (value == null) return "Unlimited";
  return value.toLocaleString();
}
