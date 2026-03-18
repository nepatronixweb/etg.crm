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
  leadStandings: string[];
  fdStatuses: string[];
  leadStageGroups: string[];
  leadStages: { value: string; label: string; group: string }[];
  // Lists
  countries: { name: string; universities: string[] }[];
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
    leadStandings: {
      type: [String],
      default: ["heated", "hot", "warm", "out_of_contact"],
    },
    fdStatuses: {
      type: [String],
      default: [
        "FD-Junk", "AP-Call Not Received", "AP-Call Back Later", "AP-Not Interested",
        "Wrong Number", "Not Qualified", "Not Interested", "AP-Pending",
        "Interested 2027", "FD-Future Prospective", "On Hold", "Plan Dropped",
        "Counselling", "Counselled", "AP-Interested", "Negotiation",
        "Open/Unassigned", "Future Prospect", "FD-Interested", "Dead/Junk Lead",
        "Not Answering", "Assigned", "In-Progress", "Not Genuine",
        "Phone Counselling", "Qualified Lead", "Registered/Completed",
        "Interested", "Closed Lost",
      ],
    },
    leadStageGroups: {
      type: [String],
      default: ["Application", "Offer", "GTE", "COE", "Visa"],
    },
    leadStages: {
      type: [{ value: { type: String }, label: { type: String }, group: { type: String } }],
      default: [
        { value: "document_pending", label: "Document Pending", group: "Application" },
        { value: "document_submitted", label: "Document Submitted", group: "Application" },
        { value: "offer_applied", label: "Offer Applied", group: "Offer" },
        { value: "acknowledge", label: "Acknowledge", group: "Offer" },
        { value: "document_requested", label: "Document Requested", group: "Offer" },
        { value: "document_sent", label: "Document Sent", group: "Offer" },
        { value: "conditional_offer_received", label: "Conditional Offer Received", group: "Offer" },
        { value: "unconditional_offer_received", label: "Unconditional Offer Received", group: "Offer" },
        { value: "gte_applied", label: "GTE Applied", group: "GTE" },
        { value: "gte_additional_doc_requested", label: "GTE Additional Doc Requested", group: "GTE" },
        { value: "gte_additional_doc_sent", label: "GTE Additional Doc Sent", group: "GTE" },
        { value: "gte_approved", label: "GTE Approved", group: "GTE" },
        { value: "gte_rejected", label: "GTE Rejected", group: "GTE" },
        { value: "coe_applied", label: "COE Applied", group: "COE" },
        { value: "coe_additional_doc_requested", label: "COE Additional Doc Requested", group: "COE" },
        { value: "coe_additional_doc_sent", label: "COE Additional Doc Sent", group: "COE" },
        { value: "coe_received", label: "COE Received", group: "COE" },
        { value: "visa_applied", label: "Visa Applied", group: "Visa" },
        { value: "visa_grant", label: "Visa Grant", group: "Visa" },
        { value: "visa_reject", label: "Visa Reject", group: "Visa" },
        { value: "visa_invalid", label: "Visa Invalid", group: "Visa" },
        { value: "visa_withdrawn", label: "Visa Withdrawn", group: "Visa" },
      ],
    },
    // Lists
    countries: {
      type: [{ name: { type: String, required: true }, universities: { type: [String], default: [] } }],
      default: [
        { name: "Australia", universities: ["University of Melbourne","Australian National University","University of Sydney","University of Queensland","Monash University","University of New South Wales","University of Adelaide","University of Western Australia","University of Technology Sydney","RMIT University","Deakin University","La Trobe University","Macquarie University","Griffith University","Queensland University of Technology","Curtin University","Bond University","Charles Darwin University","Federation University"] },
        { name: "Canada", universities: ["University of Toronto","University of British Columbia","McGill University","University of Alberta","McMaster University","University of Ottawa","University of Waterloo","Western University","Queen's University","Dalhousie University","University of Calgary","Simon Fraser University","York University","Concordia University","University of Manitoba","University of Saskatchewan","Carleton University","Ryerson University","Brock University","University of Victoria"] },
        { name: "United Kingdom", universities: ["University of Oxford","University of Cambridge","Imperial College London","University College London","London School of Economics","University of Edinburgh","University of Manchester","King's College London","University of Bristol","University of Warwick","University of Glasgow","University of Birmingham","University of Leeds","University of Sheffield","University of Nottingham","University of Liverpool","University of Southampton","Newcastle University","Durham University","University of Bath","Cardiff University","Heriot-Watt University","University of Exeter"] },
        { name: "United States", universities: ["Massachusetts Institute of Technology","Stanford University","Harvard University","California Institute of Technology","University of Chicago","Princeton University","Columbia University","Yale University","University of Pennsylvania","Cornell University","Johns Hopkins University","Duke University","Northwestern University","University of California Berkeley","University of California Los Angeles","Carnegie Mellon University","New York University","University of Michigan","University of Texas at Austin","University of Washington","Purdue University","Boston University"] },
        { name: "New Zealand", universities: ["University of Auckland","University of Otago","Victoria University of Wellington","University of Canterbury","Massey University","Lincoln University","Auckland University of Technology","Waikato University"] },
        { name: "Germany", universities: ["Technical University of Munich","Ludwig Maximilian University of Munich","Heidelberg University","Humboldt University of Berlin","Free University of Berlin","RWTH Aachen University","University of Hamburg","Goethe University Frankfurt","University of Stuttgart","University of Göttingen","University of Cologne","University of Bonn","Karlsruhe Institute of Technology"] },
        { name: "France", universities: ["Sorbonne University","École Polytechnique","Sciences Po","HEC Paris","INSEAD","University of Paris","École Normale Supérieure","Grenoble INP","University of Bordeaux","University of Lyon","University of Strasbourg","University of Montpellier"] },
        { name: "Japan", universities: ["University of Tokyo","Kyoto University","Osaka University","Tohoku University","Nagoya University","Tokyo Institute of Technology","Waseda University","Keio University","Hokkaido University","Kyushu University","Kobe University","Hiroshima University"] },
        { name: "South Korea", universities: ["Seoul National University","Korea Advanced Institute of Science & Technology","Yonsei University","Korea University","Sungkyunkwan University","Hanyang University","Sogang University","Ewha Womans University","Pohang University of Science and Technology","Ulsan National Institute of Science and Technology"] },
        { name: "Netherlands", universities: ["University of Amsterdam","Delft University of Technology","Leiden University","Utrecht University","Erasmus University Rotterdam","University of Groningen","Eindhoven University of Technology","Maastricht University","Tilburg University","Wageningen University"] },
        { name: "Sweden", universities: ["Karolinska Institute","Royal Institute of Technology","Lund University","Uppsala University","Stockholm University","Chalmers University of Technology","University of Gothenburg","Linköping University","Umeå University"] },
        { name: "Denmark", universities: ["University of Copenhagen","Technical University of Denmark","Aarhus University","Copenhagen Business School","Aalborg University","University of Southern Denmark"] },
        { name: "Finland", universities: ["University of Helsinki","Aalto University","University of Turku","University of Tampere","University of Oulu","University of Jyväskylä"] },
        { name: "Norway", universities: ["University of Oslo","Norwegian University of Science and Technology","University of Bergen","University of Tromsø","Norwegian School of Economics"] },
        { name: "Switzerland", universities: ["ETH Zurich","EPFL","University of Zurich","University of Geneva","University of Basel","University of Bern","University of Lausanne","University of St. Gallen"] },
        { name: "Austria", universities: ["University of Vienna","Vienna University of Technology","Graz University of Technology","University of Graz","Johannes Kepler University Linz","University of Innsbruck","Vienna University of Economics and Business"] },
        { name: "Ireland", universities: ["Trinity College Dublin","University College Dublin","University College Cork","National University of Ireland Galway","Dublin City University","University of Limerick","Maynooth University"] },
        { name: "Singapore", universities: ["National University of Singapore","Nanyang Technological University","Singapore Management University","Singapore University of Technology and Design","Singapore Institute of Technology"] },
        { name: "Malaysia", universities: ["University of Malaya","Universiti Putra Malaysia","Universiti Kebangsaan Malaysia","Universiti Teknologi Malaysia","Universiti Sains Malaysia","Taylor's University","Monash University Malaysia","Sunway University","INTI International University"] },
        { name: "Dubai (UAE)", universities: ["American University in Dubai","University of Dubai","Heriot-Watt University Dubai","Middlesex University Dubai","University of Birmingham Dubai","Rochester Institute of Technology Dubai","Murdoch University Dubai","Canadian University Dubai"] },
        { name: "Cyprus", universities: ["University of Cyprus","Cyprus International University","European University Cyprus","Frederick University","University of Nicosia"] },
        { name: "Malta", universities: ["University of Malta","Malta College of Arts, Science and Technology"] },
        { name: "Hungary", universities: ["Budapest University of Technology and Economics","Eötvös Loránd University","University of Debrecen","University of Pécs","Corvinus University of Budapest","Semmelweis University"] },
        { name: "Poland", universities: ["University of Warsaw","Jagiellonian University","Warsaw University of Technology","AGH University of Science and Technology","Adam Mickiewicz University","Wrocław University of Technology"] },
        { name: "Czech Republic", universities: ["Charles University","Czech Technical University in Prague","Brno University of Technology","Masaryk University","University of Economics Prague","Palacký University Olomouc"] },
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
