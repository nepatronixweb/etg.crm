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
