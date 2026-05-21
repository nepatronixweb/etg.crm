/** Visa team (and super admin) may update admission stage/pipeline after visa approval. */
export function canBypassVisaAdmissionLock(role: string | undefined | null): boolean {
  return role === "super_admin" || role === "visa_team";
}

/** Default stage when visa is marked approved (maps to Visa pipeline). */
export const VISA_APPROVED_DEFAULT_STAGE = "visa_grant";
export const VISA_PIPELINE_LABEL = "Visa";
