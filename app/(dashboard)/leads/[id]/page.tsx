"use client";
import { use, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, UserPlus, MapPin, Phone, Mail, Calendar, Plus, X, GraduationCap, Globe, Trash2, ChevronDown, Users, BookOpen, Home, Award, CreditCard, ClipboardList, Printer, Download } from "lucide-react";
import { formatDate, formatDateTime, getStatusColor, getRoleLabel, COUNTRIES, LEAD_STAGES, getLeadStageDotColor } from "@/lib/utils";
import { ILead } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CountryEntry {
  country: string;
  universityName: string;
}

const UNIVERSITIES_BY_COUNTRY: Record<string, string[]> = {
  "Australia": ["University of Melbourne","Australian National University","University of Sydney","University of Queensland","Monash University","University of New South Wales","University of Adelaide","University of Western Australia","University of Technology Sydney","RMIT University","Deakin University","La Trobe University","Macquarie University","Griffith University","Queensland University of Technology","Curtin University","Bond University","Charles Darwin University","Federation University"],
  "Canada": ["University of Toronto","University of British Columbia","McGill University","University of Alberta","McMaster University","University of Ottawa","University of Waterloo","Western University","Queen's University","Dalhousie University","University of Calgary","Simon Fraser University","York University","Concordia University","University of Manitoba","University of Saskatchewan","Carleton University","Ryerson University","Brock University","University of Victoria"],
  "United Kingdom": ["University of Oxford","University of Cambridge","Imperial College London","University College London","London School of Economics","University of Edinburgh","University of Manchester","King's College London","University of Bristol","University of Warwick","University of Glasgow","University of Birmingham","University of Leeds","University of Sheffield","University of Nottingham","University of Liverpool","University of Southampton","Newcastle University","Durham University","University of Bath","Cardiff University","Heriot-Watt University","University of Exeter"],
  "United States": ["Massachusetts Institute of Technology","Stanford University","Harvard University","California Institute of Technology","University of Chicago","Princeton University","Columbia University","Yale University","University of Pennsylvania","Cornell University","Johns Hopkins University","Duke University","Northwestern University","University of California Berkeley","University of California Los Angeles","Carnegie Mellon University","New York University","University of Michigan","University of Texas at Austin","University of Washington","Purdue University","Boston University"],
  "New Zealand": ["University of Auckland","University of Otago","Victoria University of Wellington","University of Canterbury","Massey University","Lincoln University","Auckland University of Technology","Waikato University"],
  "Germany": ["Technical University of Munich","Ludwig Maximilian University of Munich","Heidelberg University","Humboldt University of Berlin","Free University of Berlin","RWTH Aachen University","University of Hamburg","Goethe University Frankfurt","University of Stuttgart","University of Göttingen","University of Cologne","University of Bonn","Karlsruhe Institute of Technology"],
  "France": ["Sorbonne University","École Polytechnique","Sciences Po","HEC Paris","INSEAD","University of Paris","École Normale Supérieure","Grenoble INP","University of Bordeaux","University of Lyon","University of Strasbourg","University of Montpellier"],
  "Japan": ["University of Tokyo","Kyoto University","Osaka University","Tohoku University","Nagoya University","Tokyo Institute of Technology","Waseda University","Keio University","Hokkaido University","Kyushu University","Kobe University","Hiroshima University"],
  "South Korea": ["Seoul National University","Korea Advanced Institute of Science & Technology","Yonsei University","Korea University","Sungkyunkwan University","Hanyang University","Sogang University","Ewha Womans University","Pohang University of Science and Technology","Ulsan National Institute of Science and Technology"],
  "Netherlands": ["University of Amsterdam","Delft University of Technology","Leiden University","Utrecht University","Erasmus University Rotterdam","University of Groningen","Eindhoven University of Technology","Maastricht University","Tilburg University","Wageningen University"],
  "Sweden": ["Karolinska Institute","Royal Institute of Technology","Lund University","Uppsala University","Stockholm University","Chalmers University of Technology","University of Gothenburg","Linköping University","Umeå University"],
  "Denmark": ["University of Copenhagen","Technical University of Denmark","Aarhus University","Copenhagen Business School","Aalborg University","University of Southern Denmark"],
  "Finland": ["University of Helsinki","Aalto University","University of Turku","University of Tampere","University of Oulu","University of Jyväskylä"],
  "Norway": ["University of Oslo","Norwegian University of Science and Technology","University of Bergen","University of Tromsø","Norwegian School of Economics"],
  "Switzerland": ["ETH Zurich","EPFL","University of Zurich","University of Geneva","University of Basel","University of Bern","University of Lausanne","University of St. Gallen"],
  "Austria": ["University of Vienna","Vienna University of Technology","Graz University of Technology","University of Graz","Johannes Kepler University Linz","University of Innsbruck","Vienna University of Economics and Business"],
  "Ireland": ["Trinity College Dublin","University College Dublin","University College Cork","National University of Ireland Galway","Dublin City University","University of Limerick","Maynooth University"],
  "Singapore": ["National University of Singapore","Nanyang Technological University","Singapore Management University","Singapore University of Technology and Design","Singapore Institute of Technology"],
  "Malaysia": ["University of Malaya","Universiti Putra Malaysia","Universiti Kebangsaan Malaysia","Universiti Teknologi Malaysia","Universiti Sains Malaysia","Taylor's University","Monash University Malaysia","Sunway University","INTI International University"],
  "Dubai (UAE)": ["American University in Dubai","University of Dubai","Heriot-Watt University Dubai","Middlesex University Dubai","University of Birmingham Dubai","Rochester Institute of Technology Dubai","Murdoch University Dubai","Canadian University Dubai"],
  "Cyprus": ["University of Cyprus","Cyprus International University","European University Cyprus","Frederick University","University of Nicosia"],
  "Malta": ["University of Malta","Malta College of Arts, Science and Technology"],
  "Hungary": ["Budapest University of Technology and Economics","Eötvös Loránd University","University of Debrecen","University of Pécs","Corvinus University of Budapest","Semmelweis University"],
  "Poland": ["University of Warsaw","Jagiellonian University","Warsaw University of Technology","AGH University of Science and Technology","Adam Mickiewicz University","Wrocław University of Technology"],
  "Czech Republic": ["Charles University","Czech Technical University in Prague","Brno University of Technology","Masaryk University","University of Economics Prague","Palacký University Olomouc"],
};

function getUniversities(country: string): string[] {
  return UNIVERSITIES_BY_COUNTRY[country] || [];
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [lead, setLead] = useState<ILead | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [converting, setConverting] = useState(false);

  // ── Convert modal state ──
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [countryEntries, setCountryEntries] = useState<CountryEntry[]>([
    { country: "", universityName: "" },
  ]);
  const [countrySearch, setCountrySearch] = useState<string[]>([""]);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [uniSearch, setUniSearch] = useState<string[]>([""]);
  const [uniOpen, setUniOpen] = useState<number | null>(null);

  // ── Lead countries (editable inline) ──
  const [leadCountries, setLeadCountries] = useState<CountryEntry[]>([]);
  const [lcSearch, setLcSearch] = useState<string[]>([]);
  const [lcOpenDropdown, setLcOpenDropdown] = useState<number | null>(null);
  const [lcUniSearch, setLcUniSearch] = useState<string[]>([]);
  const [lcUniOpen, setLcUniOpen] = useState<number | null>(null);
  const [savingCountries, setSavingCountries] = useState(false);
  const [countriesSaved, setCountriesSaved] = useState(false);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchLead = async () => {
    const res = await fetch(`/api/leads/${id}`);
    const data = await res.json();
    setLead(data);
    // Populate lead countries from saved data
    if (Array.isArray(data.interestedCountries) && data.interestedCountries.length > 0) {
      setLeadCountries(data.interestedCountries.map((e: CountryEntry) => ({ country: e.country, universityName: e.universityName || "" })));
      setLcSearch(data.interestedCountries.map(() => ""));
      setLcUniSearch(data.interestedCountries.map(() => ""));
    } else if (data.interestedCountry) {
      setLeadCountries([{ country: data.interestedCountry, universityName: "" }]);
      setLcSearch([""]);
      setLcUniSearch([""]);
    } else {
      setLeadCountries([{ country: "", universityName: "" }]);
      setLcSearch([""]);
      setLcUniSearch([""]);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLead(); }, [id]);

  // Auto-scroll to notes and focus textarea when navigating with #notes hash
  useEffect(() => {
    if (loading) return;
    if (window.location.hash === "#notes") {
      const el = document.getElementById("notes");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => noteTextareaRef.current?.focus(), 300);
    }
  }, [loading]);

  // Pre-fill convert modal from lead's saved countries
  useEffect(() => {
    if (showConvertModal) {
      const base = leadCountries.filter((e) => e.country.trim());
      if (base.length > 0) {
        setCountryEntries(base.map((e) => ({ country: e.country, universityName: e.universityName })));
        setCountrySearch(base.map(() => ""));
      } else if (lead?.interestedCountry) {
        setCountryEntries([{ country: lead.interestedCountry, universityName: "" }]);
        setCountrySearch([""]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConvertModal]);

  const addNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    const noteContent = note.trim();
    await fetch(`/api/leads/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteContent }) });
    setNote("");
    setAddingNote(false);
    fetchLead();
    // Auto-send via WhatsApp and Gmail
    if (lead?.phone) {
      const waPhone = lead.phone.replace(/[^\d]/g, "");
      const waMsg = encodeURIComponent(`Hi ${lead.name},\n\n${noteContent}\n\n– ETG Team`);
      window.open(`https://wa.me/${waPhone}?text=${waMsg}`, "_blank");
    }
    if (lead?.email) {
      const subject = encodeURIComponent(`Update from ETG – ${lead.name}`);
      const body = encodeURIComponent(`Hi ${lead.name},\n\n${noteContent}\n\nBest regards,\nETG Team`);
      window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(lead.email)}&su=${subject}&body=${body}`, "_blank");
    }
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchLead();
  };

  // ── Lead countries save ──
  const saveLeadCountries = async () => {
    const valid = leadCountries.filter((e) => e.country.trim());
    setSavingCountries(true);
    await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interestedCountries: valid }),
    });
    setSavingCountries(false);
    setCountriesSaved(true);
    setTimeout(() => setCountriesSaved(false), 2500);
  };

  // ── Lead country list helpers ──
  const addLcEntry = () => {
    setLeadCountries((p) => [...p, { country: "", universityName: "" }]);
    setLcSearch((p) => [...p, ""]);
    setLcUniSearch((p) => [...p, ""]);
  };
  const removeLcEntry = (i: number) => {
    setLeadCountries((p) => p.filter((_, idx) => idx !== i));
    setLcSearch((p) => p.filter((_, idx) => idx !== i));
    setLcUniSearch((p) => p.filter((_, idx) => idx !== i));
  };
  const setLcCountry = (i: number, country: string) => {
    setLeadCountries((p) => p.map((e, idx) => idx === i ? { ...e, country, universityName: "" } : e));
    setLcSearch((p) => p.map((v, idx) => idx === i ? "" : v));
    setLcUniSearch((p) => p.map((v, idx) => idx === i ? "" : v));
    setLcOpenDropdown(null);
  };
  const setLcUniversity = (i: number, universityName: string) => {
    setLeadCountries((p) => p.map((e, idx) => idx === i ? { ...e, universityName } : e));
    setLcUniOpen(null);
  };

  const convertToStudent = async () => {
    setConverting(true);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: id }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/students/${data.student._id}`);
    }
    setConverting(false);
  };

  // ── Country entry helpers ──
  const addCountryEntry = () => {
    setCountryEntries((prev) => [...prev, { country: "", universityName: "" }]);
    setCountrySearch((prev) => [...prev, ""]);
    setUniSearch((prev) => [...prev, ""]);
  };

  const removeCountryEntry = (i: number) => {
    setCountryEntries((prev) => prev.filter((_, idx) => idx !== i));
    setCountrySearch((prev) => prev.filter((_, idx) => idx !== i));
    setUniSearch((prev) => prev.filter((_, idx) => idx !== i));
  };

  const setEntryCountry = (i: number, country: string) => {
    setCountryEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, country, universityName: "" } : e));
    setCountrySearch((prev) => prev.map((v, idx) => idx === i ? "" : v));
    setUniSearch((prev) => prev.map((v, idx) => idx === i ? "" : v));
    setOpenDropdown(null);
  };

  const setEntryUniversity = (i: number, universityName: string) => {
    setCountryEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, universityName } : e));
    setUniOpen(null);
  };

  const setSearch = (i: number, val: string) => {
    setCountrySearch((prev) => prev.map((v, idx) => idx === i ? val : v));
    setOpenDropdown(i);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!lead) return <div className="text-center py-20 text-gray-400">Lead not found</div>;

  const assignedTo = lead.assignedTo as unknown as { name: string; email: string };
  const branch = lead.branch as unknown as { name: string; location: string };

  const canNote = ["super_admin", "counsellor", "telecaller", "front_desk", "application_team", "admission_team", "visa_team"].includes(session?.user?.role || "");
  const canConvert = ["super_admin", "counsellor"].includes(session?.user?.role || "") && !lead.convertedToStudent;
  const canPrint = ["super_admin", "telecaller"].includes(session?.user?.role || "");
  const canUpdateStatus = ["super_admin", "telecaller", "counsellor"].includes(session?.user?.role || "");
  const canEdit = ["super_admin", "counsellor", "telecaller", "front_desk"].includes(session?.user?.role || "");

  const validEntries = countryEntries.filter((e) => e.country.trim());
  const usedCountries = new Set(countryEntries.map((e) => e.country));

  // helper: render label + value field row
  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value || <span className="text-gray-300 font-normal">—</span>}</p>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 flex-wrap no-print">
        <Link href="/leads" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(lead.status)}`}>
              {lead.status?.replace("_", " ")}
            </span>
            {lead.convertedToStudent && (
              <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">✓ Converted to Student</span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5">Lead Details</p>
        </div>
        {/* Print + Export PDF buttons */}
        {canPrint && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:border-gray-400 text-gray-600 hover:text-gray-800 rounded-lg text-sm font-medium transition-colors bg-white"
          >
            <Printer size={14} /> Print
          </button>
        )}
        {canPrint && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={14} /> Export PDF
          </button>
        )}
        {canConvert && (
          <button onClick={() => setShowConvertModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">
            <GraduationCap size={14} /> Convert to Student
          </button>
        )}
      </div>

      {/* ── Print-Only Letterhead ── */}
      <div className="print-only">
        <div className="flex items-start justify-between pb-5 mb-6 border-b-2 border-gray-900">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Education Tree Global</h1>
            <p className="text-sm text-gray-500 mt-0.5">Lead Profile Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Generated</p>
            <p className="text-sm font-semibold text-gray-700">
              {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border border-gray-400 text-gray-600">
              ETG-{lead._id.slice(-4).toUpperCase()}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(lead.status)}`}>
              {lead.status?.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {[lead.phone, lead.email].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* ── Main Form Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">

        {/* Contact Information */}
        <div className="px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
            <Field label="Full Name" value={lead.name} />
            <Field label="Phone Number" value={lead.phone} />
            <Field label="Email Address" value={lead.email} />
            <Field label="Date of Birth" value={lead.dateOfBirth} />
            <Field label="Gender" value={(lead as unknown as { gender?: string }).gender ? ((lead as unknown as { gender: string }).gender.charAt(0).toUpperCase() + (lead as unknown as { gender: string }).gender.slice(1).replace(/_/g, " ")) : null} />
            <Field label="Marital Status" value={(lead as unknown as { maritalStatus?: string }).maritalStatus ? ((lead as unknown as { maritalStatus: string }).maritalStatus.charAt(0).toUpperCase() + (lead as unknown as { maritalStatus: string }).maritalStatus.slice(1)) : null} />
            <Field label="Nationality" value={(lead as unknown as { nationality?: string }).nationality} />
            <Field label="Assigned To" value={assignedTo?.name || "Unassigned"} />
          </div>
        </div>

        {/* Passport & Visa */}
        {((lead as unknown as { passportNumber?: string }).passportNumber || (lead as unknown as { visaExpiryDate?: string }).visaExpiryDate) && (
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Passport &amp; Visa</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
              {(lead as unknown as { passportNumber?: string }).passportNumber && (
                <Field label="Passport Number" value={(lead as unknown as { passportNumber: string }).passportNumber.toUpperCase()} />
              )}
              {(lead as unknown as { visaExpiryDate?: string }).visaExpiryDate && (
                <Field label="Visa Expiry Date" value={(lead as unknown as { visaExpiryDate: string }).visaExpiryDate} />
              )}
            </div>
          </div>
        )}

        {/* Lead Details */}
        <div className="px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Lead Details</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
            <Field label="Branch" value={branch?.name} />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Source</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{lead.source?.replace(/_/g, " ")}</p>
              {(lead as unknown as { senderName?: string }).senderName && (
                <p className="text-[11px] text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                  <span className="opacity-60">↗</span> {(lead as unknown as { senderName: string }).senderName}
                </p>
              )}
            </div>
            <Field label="Interested Service" value={lead.interestedService} />
            <div>
              <p className="text-xs text-gray-400 mb-1">Lead Status</p>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(lead.status)}`}>
                {lead.status?.replace("_", " ")}
              </span>
            </div>
            {(() => {
              const stageVal = (lead as unknown as { stage?: string }).stage;
              const stageInfo = LEAD_STAGES.find((s) => s.value === stageVal);
              return stageVal ? (
                <div>
                  <p className="text-xs text-gray-400 mb-1">CRM Stage</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${stageInfo ? stageInfo.color : "bg-gray-100 text-gray-500"}`}>
                    {stageInfo && <span className={`w-1.5 h-1.5 rounded-full ${getLeadStageDotColor(stageVal)} opacity-70`} />}
                    {stageInfo ? stageInfo.label : stageVal}
                  </span>
                </div>
              ) : null;
            })()}
            <Field label="Created" value={formatDate(lead.createdAt)} />
            <Field label="Reminders Sent" value={`${lead.remindersCount}/2`} />
            {(lead as unknown as { applyLevel?: string }).applyLevel && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Apply Level</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100 capitalize">
                  {(lead as unknown as { applyLevel: string }).applyLevel}
                </span>
              </div>
            )}
            {(lead as unknown as { course?: string }).course && (
              <Field label="Course" value={(lead as unknown as { course: string }).course} />
            )}
            {(lead as unknown as { academicYear?: string }).academicYear && (
              <Field label="Academic Year" value={(lead as unknown as { academicYear: string }).academicYear} />
            )}
            {((lead as unknown as { intakeYear?: string }).intakeYear || (lead as unknown as { intakeQuarter?: string }).intakeQuarter) && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Intake</p>
                <p className="text-sm font-semibold text-gray-800">
                  {(lead as unknown as { intakeYear?: string }).intakeYear}
                  {(lead as unknown as { intakeQuarter?: string }).intakeQuarter && (
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                      {(lead as unknown as { intakeQuarter: string }).intakeQuarter}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Parent Information */}
        {(lead.parentName || lead.parentPhone1 || lead.parentPhone2) && (
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Parent / Guardian Information</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <Field label="Parent / Guardian Name" value={lead.parentName} />
              <Field label="Phone Number 1" value={lead.parentPhone1} />
              {lead.parentPhone2 && <Field label="Phone Number 2" value={lead.parentPhone2} />}
            </div>
          </div>
        )}

        {/* Academic Information */}
        {(lead.academicScore || lead.academicInstitution || lead.temporaryAddress || lead.permanentAddress) && (
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Student Academic Information</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              {lead.academicScore && <Field label="GPA / Percentage" value={lead.academicScore} />}
              {lead.academicInstitution && <Field label="School / College" value={lead.academicInstitution} />}
              {lead.temporaryAddress && <Field label="Temporary Address" value={lead.temporaryAddress} />}
              {lead.permanentAddress && <Field label="Permanent Address" value={lead.permanentAddress} />}
            </div>
          </div>
        )}

        {/* Exam Information */}
        {(lead.examType || lead.examScore || lead.examJoinDate || lead.examStartDate || lead.examEndDate || lead.examPaymentMethod || lead.examEstimatedDate) && (
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Exam Information</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
              {lead.examType && <Field label="Exam Type" value={lead.examType} />}
              {lead.examScore && <Field label="Score" value={lead.examScore} />}
              {lead.examPaymentMethod && <Field label="Payment Method" value={lead.examPaymentMethod} />}
              {lead.examJoinDate && <Field label="Join Date" value={lead.examJoinDate} />}
              {lead.examStartDate && <Field label="Start Date" value={lead.examStartDate} />}
              {lead.examEndDate && <Field label="End Date" value={lead.examEndDate} />}
              {lead.examEstimatedDate && <Field label="Estimated Date" value={lead.examEstimatedDate} />}
            </div>
          </div>
        )}

        {/* Interested Countries & Universities */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Interested Countries &amp; Universities</p>
            {leadCountries.filter((e) => e.country).length > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full font-semibold">
                {leadCountries.filter((e) => e.country).length} countr{leadCountries.filter((e) => e.country).length > 1 ? "ies" : "y"}
              </span>
            )}
          </div>
          <div className="space-y-2" onClick={() => { setLcOpenDropdown(null); setLcUniOpen(null); }}>
            {leadCountries.map((entry, i) => {
              const usedLc = new Set(leadCountries.map((e) => e.country));
              const unis = getUniversities(entry.country);
              const filteredUnis = unis.filter((u) => u.toLowerCase().includes((lcUniSearch[i] ?? "").toLowerCase()));
              return (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Destination {i + 1} — Country</p>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`flex items-center justify-between w-full px-3 py-2 bg-white border rounded-lg text-sm ${canEdit ? "cursor-pointer" : "cursor-default"} transition-colors ${lcOpenDropdown === i ? "border-gray-500 ring-1 ring-gray-400" : "border-gray-200 hover:border-gray-400"}`}
                        onClick={() => { if (canEdit) { setLcUniOpen(null); setLcOpenDropdown(lcOpenDropdown === i ? null : i); } }}
                      >
                        {entry.country ? <span className="text-gray-800 font-semibold flex items-center gap-1.5"><Globe size={12} className="text-blue-400" />{entry.country}</span> : <span className="text-gray-300 text-sm">Select a country…</span>}
                        {canEdit && <ChevronDown size={13} className={`text-gray-400 transition-transform ${lcOpenDropdown === i ? "rotate-180" : ""}`} />}
                      </div>
                      {canEdit && lcOpenDropdown === i && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <input autoFocus value={lcSearch[i] ?? ""} onChange={(e) => { setLcSearch((p) => p.map((v, idx) => idx === i ? e.target.value : v)); }} placeholder="Search countries…" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" onClick={(e) => e.stopPropagation()} />
                          </div>
                          <ul className="max-h-40 overflow-y-auto">
                            {COUNTRIES.filter((c) => c.toLowerCase().includes((lcSearch[i] ?? "").toLowerCase())).map((c) => {
                              const alreadyUsed = usedLc.has(c) && entry.country !== c;
                              return (
                                <li key={c}>
                                  <button type="button" disabled={alreadyUsed} onClick={(e) => { e.stopPropagation(); if (!alreadyUsed) setLcCountry(i, c); }} className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${entry.country === c ? "bg-blue-50 text-blue-700 font-medium" : alreadyUsed ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`}>
                                    {c}{entry.country === c && <span className="text-blue-500 text-xs">✓</span>}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">University</p>
                      {canEdit && leadCountries.length > 1 && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeLcEntry(i); }} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                      )}
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`flex items-center justify-between w-full px-3 py-2 bg-white border rounded-lg text-sm transition-colors ${!entry.country || !canEdit ? "opacity-50 cursor-not-allowed bg-gray-50" : lcUniOpen === i ? "border-gray-500 ring-1 ring-gray-400 cursor-pointer" : "border-gray-200 hover:border-gray-400 cursor-pointer"}`}
                        onClick={() => { if (entry.country && canEdit) { setLcOpenDropdown(null); setLcUniOpen(lcUniOpen === i ? null : i); } }}
                      >
                        {entry.universityName ? <span className="text-gray-800 font-semibold flex items-center gap-1.5"><GraduationCap size={12} className="text-purple-400" />{entry.universityName}</span> : <span className="text-gray-300 text-sm">{entry.country ? "Select university (optional)…" : "Select country first"}</span>}
                        {canEdit && <ChevronDown size={13} className={`text-gray-400 transition-transform ${lcUniOpen === i ? "rotate-180" : ""}`} />}
                      </div>
                      {canEdit && lcUniOpen === i && entry.country && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <input autoFocus value={lcUniSearch[i] ?? ""} onChange={(e) => setLcUniSearch((p) => p.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Search ${entry.country} universities…`} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" onClick={(e) => e.stopPropagation()} />
                          </div>
                          <ul className="max-h-44 overflow-y-auto">
                            {entry.universityName && <li><button type="button" onClick={() => setLcUniversity(i, "")} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 italic">Clear selection</button></li>}
                            {filteredUnis.length === 0 ? (
                              <li className="px-3 py-3 text-xs text-gray-400 text-center">{unis.length === 0 ? "No universities listed" : "No matches found"}</li>
                            ) : filteredUnis.map((u) => (
                              <li key={u}>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setLcUniversity(i, u); }} className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${entry.universityName === u ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                                  {u}{entry.universityName === u && <span className="text-purple-500 text-xs">✓</span>}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={addLcEntry} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                <Plus size={12} /> Add Country
              </button>
              <div className="flex-1" />
              <button type="button" onClick={saveLeadCountries} disabled={savingCountries} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${countriesSaved ? "bg-emerald-600 text-white" : "bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white"}`}>
                {savingCountries ? "Saving…" : countriesSaved ? "✓ Saved" : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Change Status */}
        {canUpdateStatus && (
          <div className="no-print px-6 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Change Status</p>
            <div className="flex items-center gap-2 flex-wrap">
              {["heated", "hot", "warm", "out_of_contact"].map((s) => (
                <button key={s} onClick={() => updateStatus(s)} disabled={lead.status === s}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${
                    lead.status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div id="notes" className="px-6 py-5 scroll-mt-20">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Notes &amp; Comments</p>
          <div className="space-y-3 mb-4">
            {(lead as unknown as { comments?: string }).comments && (
              <div className="border-l-2 border-blue-200 pl-4 py-0.5 bg-blue-50 rounded-r-lg pr-3">
                <p className="text-xs font-semibold text-blue-500 mb-0.5">Creation Note</p>
                <p className="text-sm text-gray-700 leading-relaxed">{(lead as unknown as { comments: string }).comments}</p>
              </div>
            )}
            {lead.notes?.length === 0 && !(lead as unknown as { comments?: string }).comments && <p className="text-gray-300 text-sm">No notes yet.</p>}
            {lead.notes?.map((n) => (
              <div key={n._id} className="border-l-2 border-gray-200 pl-4 py-0.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-600">{n.addedByName}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{getRoleLabel(n.addedByRole)}</span>
                  <span className="text-xs text-gray-300 ml-auto">{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{n.content}</p>
              </div>
            ))}
          </div>
          {canNote && (
            <div className="no-print flex gap-2 pt-3 border-t border-gray-100">
              <textarea ref={noteTextareaRef} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a follow-up note…" rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 placeholder-gray-300"
              />
              <button onClick={addNote} disabled={addingNote || !note.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white rounded-lg text-sm font-semibold self-end transition-colors">
                {addingNote ? "…" : "Add"}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Convert to Student Modal ── */}
      {showConvertModal && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConvertModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <GraduationCap size={18} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Convert to Student</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Convert <span className="font-medium text-gray-600">{lead.name}</span> into a student record</p>
                </div>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* Confirmation body */}
            <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-1">
                <UserPlus size={26} className="text-green-500" />
              </div>
              <p className="text-sm text-gray-700">
                Are you sure you want to convert <span className="font-semibold text-gray-900">{lead.name}</span> into a student record?
              </p>
              <p className="text-xs text-gray-400">This action will create a new student profile linked to this lead.</p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={convertToStudent}
                disabled={converting}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {converting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {converting ? "Converting…" : "Convert to Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
