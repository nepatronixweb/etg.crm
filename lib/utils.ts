import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: "bg-red-100 text-red-800",
    counsellor: "bg-blue-100 text-blue-800",
    telecaller: "bg-green-100 text-green-800",
    application_team: "bg-purple-100 text-purple-800",
    admission_team: "bg-yellow-100 text-yellow-800",
    visa_team: "bg-orange-100 text-orange-800",
    front_desk: "bg-gray-100 text-gray-800",
  };
  return colors[role] || "bg-gray-100 text-gray-800";
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: "Super Admin",
    counsellor: "Counsellor",
    telecaller: "Telecaller",
    application_team: "Application Team",
    admission_team: "Admission Team",
    visa_team: "Visa Team",
    front_desk: "Front Desk",
  };
  return labels[role] || role;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    heated: "bg-red-100 text-red-800",
    hot: "bg-orange-100 text-orange-800",
    warm: "bg-yellow-100 text-yellow-800",
    out_of_contact: "bg-gray-100 text-gray-600",
    counsellor: "bg-blue-100 text-blue-800",
    application: "bg-purple-100 text-purple-800",
    admission: "bg-indigo-100 text-indigo-800",
    visa: "bg-teal-100 text-teal-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    deferred: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export const COUNTRIES = [
  "Australia", "Canada", "United Kingdom", "United States",
  "New Zealand", "Germany", "France", "Japan", "South Korea",
  "Netherlands", "Sweden", "Denmark", "Finland", "Norway",
  "Switzerland", "Austria", "Ireland", "Singapore", "Malaysia",
  "Dubai (UAE)", "Cyprus", "Malta", "Hungary", "Poland", "Czech Republic",
];

export const LEAD_STAGES: { value: string; label: string; color: string }[] = [
  // Offer
  { value: "offer_applied",               label: "Offer Applied",                   color: "bg-blue-50 text-blue-700" },
  { value: "acknowledge",                  label: "Acknowledge",                     color: "bg-blue-100 text-blue-700" },
  { value: "document_requested",           label: "Document Requested",              color: "bg-sky-100 text-sky-700" },
  { value: "document_sent",                label: "Document Sent",                   color: "bg-sky-200 text-sky-800" },
  { value: "conditional_offer_received",   label: "Conditional Offer Received",      color: "bg-cyan-100 text-cyan-700" },
  { value: "unconditional_offer_received", label: "Unconditional Offer Received",    color: "bg-cyan-200 text-cyan-800" },
  // GTE
  { value: "gte_applied",                  label: "GTE Applied",                     color: "bg-purple-50 text-purple-700" },
  { value: "gte_additional_doc_requested", label: "GTE Additional Doc Requested",    color: "bg-purple-100 text-purple-700" },
  { value: "gte_additional_doc_sent",      label: "GTE Additional Doc Sent",         color: "bg-purple-200 text-purple-800" },
  { value: "gte_approved",                 label: "GTE Approved",                    color: "bg-violet-100 text-violet-700" },
  { value: "gte_rejected",                 label: "GTE Rejected",                    color: "bg-red-100 text-red-700" },
  // COE
  { value: "coe_applied",                  label: "COE Applied",                     color: "bg-emerald-50 text-emerald-700" },
  { value: "coe_additional_doc_requested", label: "COE Additional Doc Requested",    color: "bg-emerald-100 text-emerald-700" },
  { value: "coe_additional_doc_sent",      label: "COE Additional Doc Sent",         color: "bg-emerald-200 text-emerald-800" },
  { value: "coe_received",                 label: "COE Received",                    color: "bg-green-200 text-green-800" },
  // Visa
  { value: "visa_applied",                 label: "Visa Applied",                    color: "bg-teal-50 text-teal-700" },
  { value: "visa_grant",                   label: "Visa Grant",                      color: "bg-teal-200 text-teal-800" },
  { value: "visa_reject",                  label: "Visa Reject",                     color: "bg-red-100 text-red-700" },
  { value: "visa_invalid",                 label: "Visa Invalid",                    color: "bg-orange-100 text-orange-700" },
  { value: "visa_withdrawn",               label: "Visa Withdrawn",                  color: "bg-gray-100 text-gray-600" },
];

export function getLeadStageColor(value: string): string {
  return LEAD_STAGES.find((s) => s.value === value)?.color ?? "bg-gray-100 text-gray-600";
}

export const LEAD_STAGE_GROUPS: { label: string; dot: string; stages: string[] }[] = [
  { label: "Offer",  dot: "bg-blue-400",    stages: ["offer_applied", "acknowledge", "document_requested", "document_sent", "conditional_offer_received", "unconditional_offer_received"] },
  { label: "GTE",    dot: "bg-purple-400",  stages: ["gte_applied", "gte_additional_doc_requested", "gte_additional_doc_sent", "gte_approved", "gte_rejected"] },
  { label: "COE",    dot: "bg-emerald-400", stages: ["coe_applied", "coe_additional_doc_requested", "coe_additional_doc_sent", "coe_received"] },
  { label: "Visa",   dot: "bg-teal-400",    stages: ["visa_applied", "visa_grant", "visa_reject", "visa_invalid", "visa_withdrawn"] },
];

export function getLeadStageDotColor(value: string): string {
  for (const g of LEAD_STAGE_GROUPS) {
    if (g.stages.includes(value)) return g.dot;
  }
  return "bg-gray-300";
}

export const SERVICES = [
  "Study Abroad", "Language Courses", "University Application",
  "Visa Assistance", "Test Preparation (IELTS/TOEFL)", "Scholarship Guidance",
  "Career Counselling", "Document Verification",
];

export function canAccessModule(role: UserRole, module: string): boolean {
  const permissions: Record<string, UserRole[]> = {
    users: ["super_admin"],
    branches: ["super_admin"],
    analytics: ["super_admin"],
    activity_logs: ["super_admin"],
    settings: ["super_admin"],
    leads: ["super_admin", "counsellor", "telecaller", "front_desk"],
    students: ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"],
    documents: ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"],
    applications: ["super_admin", "application_team", "counsellor"],
    admissions: ["super_admin", "admission_team"],
    visa: ["super_admin", "visa_team"],
  };
  return permissions[module]?.includes(role) ?? false;
}
