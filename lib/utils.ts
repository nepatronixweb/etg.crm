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
  // Red — Dead / Junk / Lost
  { value: "fd_junk",                      label: "FD-Junk",                        color: "bg-red-100 text-red-700" },
  { value: "dead_junk_lead",               label: "Dead/Junk Lead",                 color: "bg-red-100 text-red-700" },
  { value: "closed_lost",                  label: "Closed Lost",                    color: "bg-red-200 text-red-800" },
  { value: "wrong_number",                 label: "Wrong Number",                   color: "bg-red-50 text-red-600" },
  { value: "not_genuine",                  label: "Not Genuine",                    color: "bg-red-50 text-red-600" },
  // Orange — Not interested / cold
  { value: "ap_not_interested",            label: "AP-Not Interested",              color: "bg-orange-100 text-orange-700" },
  { value: "not_interested",               label: "Not Interested",                 color: "bg-orange-100 text-orange-700" },
  { value: "on_hold",                      label: "On Hold",                        color: "bg-orange-50 text-orange-600" },
  { value: "plan_dropped",                 label: "Plan Dropped",                   color: "bg-orange-200 text-orange-800" },
  { value: "not_answering",               label: "Not Answering",                  color: "bg-orange-50 text-orange-600" },
  { value: "not_qualified",                label: "Not Qualified",                  color: "bg-orange-100 text-orange-700" },
  // Yellow — Pending / unclear
  { value: "ap_call_not_received",         label: "AP-Call Not Received",           color: "bg-yellow-100 text-yellow-700" },
  { value: "ap_call_back_later",           label: "AP-Call Back Later",             color: "bg-yellow-100 text-yellow-700" },
  { value: "ap_pending",                   label: "AP-Pending",                     color: "bg-yellow-200 text-yellow-800" },
  { value: "open_unassigned",              label: "Open/Unassigned",                color: "bg-yellow-50 text-yellow-600" },
  // Green — Positive / active
  { value: "interested",                   label: "Interested",                     color: "bg-green-100 text-green-700" },
  { value: "ap_interested",                label: "AP-Interested",                  color: "bg-green-100 text-green-700" },
  { value: "in_progress",                  label: "In-Progress",                    color: "bg-green-200 text-green-800" },
  { value: "qualified_leads",              label: "Qualified Leads",                color: "bg-green-100 text-green-700" },
  { value: "registered_completed",         label: "Registered/Completed",           color: "bg-emerald-200 text-emerald-800" },
  // Blue — Counselling / active engagement
  { value: "counselling",                  label: "Counselling",                    color: "bg-blue-100 text-blue-700" },
  { value: "counselled",                   label: "Counselled",                     color: "bg-blue-200 text-blue-800" },
  { value: "phone_counselling",            label: "Phone Counselling",              color: "bg-blue-100 text-blue-700" },
  { value: "negotiation",                  label: "Negotiation",                    color: "bg-blue-200 text-blue-800" },
  { value: "assigned",                     label: "Assigned",                       color: "bg-blue-50 text-blue-600" },
  // Purple — Future prospects
  { value: "fd_future_prospective",        label: "FD-Future Prospective",          color: "bg-purple-100 text-purple-700" },
  { value: "future_prospect_fd_interested",label: "Future Prospect-FD-Interested",  color: "bg-purple-100 text-purple-700" },
];

export function getLeadStageColor(value: string): string {
  return LEAD_STAGES.find((s) => s.value === value)?.color ?? "bg-gray-100 text-gray-600";
}

export const LEAD_STAGE_GROUPS: { label: string; dot: string; stages: string[] }[] = [
  { label: "Dead / Junk",      dot: "bg-red-400",    stages: ["fd_junk", "dead_junk_lead", "closed_lost", "wrong_number", "not_genuine"] },
  { label: "Not Interested",   dot: "bg-orange-400", stages: ["ap_not_interested", "not_interested", "on_hold", "plan_dropped", "not_answering", "not_qualified"] },
  { label: "Pending",          dot: "bg-yellow-400", stages: ["ap_call_not_received", "ap_call_back_later", "ap_pending", "open_unassigned"] },
  { label: "Active",           dot: "bg-green-400",  stages: ["interested", "ap_interested", "in_progress", "qualified_leads", "registered_completed"] },
  { label: "Counselling",      dot: "bg-blue-400",   stages: ["counselling", "counselled", "phone_counselling", "negotiation", "assigned"] },
  { label: "Future Prospect",  dot: "bg-purple-400", stages: ["fd_future_prospective", "future_prospect_fd_interested"] },
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
