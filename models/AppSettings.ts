import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppSettings extends Document {
  // Branding
  companyName: string;
  shortCode: string;
  tagline: string;
  logoPath: string;
  faviconPath: string;
  brandColor: string;
  // Contact
  address: string;
  phone: string;
  email: string;
  website: string;
  // Lead Configuration
  leadStatuses: string[];
  leadSources: string[];
  // Lists
  countries: string[];
  services: string[];
  // Module toggles (list of enabled module keys)
  enabledModules: string[];
  // Email / SMTP
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFromName: string;
  // Payment QR
  paymentQrPath: string;
  // Meta
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    // Branding
    companyName: { type: String, default: "Education Tree Global" },
    shortCode:   { type: String, default: "ETG" },
    tagline:     { type: String, default: "Your global education partner" },
    logoPath:    { type: String, default: "" },
    faviconPath: { type: String, default: "" },
    brandColor:  { type: String, default: "#2563eb" },
    // Contact
    address:  { type: String, default: "" },
    phone:    { type: String, default: "" },
    email:    { type: String, default: "" },
    website:  { type: String, default: "" },
    // Lead configuration
    leadStatuses: {
      type: [String],
      default: ["new", "contacted", "qualified", "application", "admission", "visa", "completed", "rejected"],
    },
    leadSources: {
      type: [String],
      default: ["Walk-in", "Referral", "Social Media", "Website", "Partner", "Phone Call", "Email", "Exhibition", "Other"],
    },
    // Lists
    countries: {
      type: [String],
      default: [
        "Australia", "Canada", "United Kingdom", "United States",
        "New Zealand", "Germany", "France", "Japan", "South Korea",
        "Netherlands", "Sweden", "Denmark", "Finland", "Norway",
        "Switzerland", "Austria", "Ireland", "Singapore", "Malaysia",
        "Dubai (UAE)", "Cyprus", "Malta", "Hungary", "Poland", "Czech Republic",
      ],
    },
    services: {
      type: [String],
      default: [
        "Study Abroad", "Language Courses", "University Application",
        "Visa Assistance", "Test Preparation (IELTS/TOEFL)", "Scholarship Guidance",
        "Career Counselling", "Document Verification",
      ],
    },
    // All modules enabled by default
    enabledModules: {
      type: [String],
      default: ["leads", "students", "documents", "applications", "admissions", "visa", "analytics", "branches", "users", "activity_logs", "settings"],
    },
    // SMTP
    smtpHost:      { type: String, default: "" },
    smtpPort:      { type: Number, default: 587 },
    smtpUser:      { type: String, default: "" },
    smtpPass:      { type: String, default: "" },
    emailFromName: { type: String, default: "" },
    // Payment QR
    paymentQrPath: { type: String, default: "" },
  },
  { timestamps: true }
);

const AppSettings: Model<IAppSettings> =
  mongoose.models.AppSettings ||
  mongoose.model<IAppSettings>("AppSettings", AppSettingsSchema);

export default AppSettings;
