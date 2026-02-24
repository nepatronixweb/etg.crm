export type UserRole =
  | "super_admin"
  | "counsellor"
  | "telecaller"
  | "application_team"
  | "admission_team"
  | "visa_team"
  | "front_desk";

export type LeadStatus = "heated" | "hot" | "warm" | "out_of_contact";

export type StudentStage =
  | "counsellor"
  | "application"
  | "admission"
  | "visa"
  | "completed"
  | "rejected";

export type LeadSource =
  | "walk_in"
  | "facebook"
  | "whatsapp"
  | "instagram"
  | "website"
  | "referral"
  | "other";

export type AssignmentMethod = "round_robin" | "manual";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branch: string;
  dateOfBirth?: string;
  phone?: string;
  target?: number;
  currentCount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBranch {
  _id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ILead {
  _id: string;
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  source: LeadSource;
  interestedService: string;
  interestedCountry: string;
  branch: string;
  status: LeadStatus;
  assignedTo?: string;
  assignedBy?: string;
  notes: INote[];
  remindersCount: number;
  lastReminderAt?: Date;
  convertedToStudent: boolean;
  // Multiple interested countries & universities
  interestedCountries?: { country: string; universityName?: string }[];
  // Parent information
  parentName?: string;
  parentPhone1?: string;
  parentPhone2?: string;
  // Student academic information
  academicScore?: string;
  academicInstitution?: string;
  temporaryAddress?: string;
  permanentAddress?: string;
  // IELTS / PTE information
  examType?: string;
  examScore?: string;
  examJoinDate?: string;
  examStartDate?: string;
  examEndDate?: string;
  examPaymentMethod?: string;
  examEstimatedDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INote {
  _id: string;
  content: string;
  addedBy: string;
  addedByName: string;
  addedByRole: UserRole;
  createdAt: Date;
}

export interface IStudent {
  _id: string;
  lead: string;
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  source: LeadSource;
  branch: string;
  counsellor: string;
  currentStage: StudentStage;
  countries: IStudentCountry[];
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentCountry {
  country: string;
  status: StudentStage;
  universityName?: string;
  applicationStatus?: string;
  admissionStatus?: string;
  visaStatus?: string;
  visaApprovedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface IDocument {
  _id: string;
  student: string;
  country: string;
  name: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: Date;
}

export interface IChecklist {
  _id: string;
  country: string;
  documents: IChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IChecklistItem {
  name: string;
  description?: string;
  isRequired: boolean;
}

export interface IApplication {
  _id: string;
  student: string;
  country: string;
  universityName: string;
  course: string;
  status: "pending" | "submitted" | "accepted" | "rejected" | "deferred";
  submittedBy?: string;
  submittedAt?: Date;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IActivityLog {
  _id: string;
  user: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalLeads: number;
  totalStudents: number;
  totalVisaApproved: number;
  totalApplications: number;
  recentLeads: ILead[];
  conversionRate: number;
}
