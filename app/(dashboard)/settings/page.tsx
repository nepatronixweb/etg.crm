"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Settings, Lock, Upload, Plus, Trash2, Save, CheckCircle,
  Palette, Building2, Phone, Mail, Globe, MapPin,
  Users, Tag, List, ToggleLeft, ToggleRight, Server,
  FileText, Image as ImageIcon, ChevronRight, X,
} from "lucide-react";
import { COUNTRIES } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AppSettings {
  companyName: string;
  shortCode: string;
  tagline: string;
  logoPath: string;
  faviconPath: string;
  brandColor: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  leadStatuses: string[];
  leadSources: string[];
  countries: string[];
  services: string[];
  enabledModules: string[];
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFromName: string;
  paymentQrPath: string;
}

interface ChecklistItem { name: string; description?: string; isRequired: boolean; }
interface Checklist { _id?: string; country: string; documents: ChecklistItem[]; }

const TABS = [
  { id: "branding",    label: "Branding",            icon: Palette },
  { id: "contact",     label: "Contact Info",         icon: Building2 },
  { id: "leads",       label: "Lead Configuration",   icon: Users },
  { id: "lists",       label: "Countries & Services", icon: List },
  { id: "modules",     label: "Module Toggles",       icon: ToggleRight },
  { id: "email",       label: "Email & SMTP",         icon: Mail },
  { id: "checklists",  label: "Document Checklists",  icon: FileText },
] as const;

type TabId = typeof TABS[number]["id"];

const ALL_MODULES = [
  { key: "leads",         label: "Leads" },
  { key: "students",      label: "Students" },
  { key: "documents",     label: "Documents" },
  { key: "applications",  label: "Applications" },
  { key: "admissions",    label: "Admissions" },
  { key: "visa",          label: "Visa" },
  { key: "analytics",     label: "Analytics / Reports" },
  { key: "branches",      label: "Branches" },
  { key: "users",         label: "User Management" },
  { key: "activity_logs", label: "Activity Logs" },
  { key: "settings",      label: "Settings" },
];

const DEFAULT_SETTINGS: AppSettings = {
  companyName: "Education Tree Global",
  shortCode: "ETG",
  tagline: "Your global education partner",
  logoPath: "",
  faviconPath: "",
  brandColor: "#2563eb",
  address: "",
  phone: "",
  email: "",
  website: "",
  leadStatuses: ["new","contacted","qualified","application","admission","visa","completed","rejected"],
  leadSources: ["Walk-in","Referral","Social Media","Website","Partner","Phone Call","Email","Exhibition","Other"],
  countries: COUNTRIES,
  services: [
    "Study Abroad","Language Courses","University Application",
    "Visa Assistance","Test Preparation (IELTS/TOEFL)","Scholarship Guidance",
    "Career Counselling","Document Verification",
  ],
  enabledModules: ["leads","students","documents","applications","admissions","visa","analytics","branches","users","activity_logs","settings"],
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  emailFromName: "",
  paymentQrPath: "",
};

// ─── Tag/Pill List Editor ────────────────────────────────────────────────────
function TagEditor({
  label, items, onChange, placeholder,
}: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const val = draft.trim();
    if (!val || items.includes(val)) return;
    onChange([...items, val]);
    setDraft("");
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[44px]">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700">
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-gray-400 self-center">No items yet</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder ?? `Add ${label.toLowerCase()}`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1"
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Save Button ─────────────────────────────────────────────────────────────
function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        saved
          ? "bg-green-600 text-white"
          : "bg-gray-900 hover:bg-gray-700 text-white disabled:opacity-60"
      }`}
    >
      {saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
    </button>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = "text", hint,
}: {
  label: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabId>("branding");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Logo upload
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // QR upload
  const [qrPreview, setQrPreview] = useState<string>("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Checklists
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [clSaving, setClSaving] = useState(false);
  const [clSaved, setClSaved] = useState(false);

  // ── Load settings ──
  useEffect(() => {
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.companyName) {
          setSettings((prev) => ({ ...prev, ...d }));
          if (d.logoPath) setLogoPreview(d.logoPath);
          if (d.paymentQrPath) setQrPreview(d.paymentQrPath);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Load checklists when tab changes ──
  useEffect(() => {
    if (tab !== "checklists") return;
    fetch("/api/checklists").then((r) => r.json()).then((d) => setChecklists(Array.isArray(d) ? d : []));
  }, [tab]);

  const set = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  // ── Save app settings ──
  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  // ── Logo upload ──
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
      const d = await res.json();
      if (d.logoPath) { setLogoPreview(d.logoPath); set("logoPath", d.logoPath); }
    } finally { setUploadingLogo(false); }
  };

  // ── QR upload ──
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    const formData = new FormData();
    formData.append("qr", file);
    try {
      const res = await fetch("/api/settings/qr", { method: "POST", body: formData });
      const d = await res.json();
      if (d.paymentQrPath) { setQrPreview(d.paymentQrPath); set("paymentQrPath", d.paymentQrPath); }
    } finally { setUploadingQr(false); }
  };

  // ── Checklist helpers ──
  const loadCountry = async (country: string) => {
    setSelectedCountry(country);
    const res = await fetch(`/api/checklists?country=${country}`);
    const data = await res.json();
    setSelectedChecklist({ country, documents: data?.documents || [] });
  };

  const addDoc = () => {
    if (!selectedChecklist) return;
    setSelectedChecklist({ ...selectedChecklist, documents: [...selectedChecklist.documents, { name: "", isRequired: true }] });
  };

  const removeDoc = (i: number) => {
    if (!selectedChecklist) return;
    setSelectedChecklist({ ...selectedChecklist, documents: selectedChecklist.documents.filter((_, idx) => idx !== i) });
  };

  const updateDoc = (i: number, field: keyof ChecklistItem, value: string | boolean) => {
    if (!selectedChecklist) return;
    const docs = [...selectedChecklist.documents];
    docs[i] = { ...docs[i], [field]: value };
    setSelectedChecklist({ ...selectedChecklist, documents: docs });
  };

  const saveChecklist = async () => {
    if (!selectedChecklist) return;
    setClSaving(true);
    await fetch("/api/checklists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selectedChecklist) });
    setClSaving(false); setClSaved(true);
    setTimeout(() => setClSaved(false), 2000);
    const res = await fetch("/api/checklists");
    setChecklists(Array.isArray(await res.json()) ? await (await fetch("/api/checklists")).json() : []);
  };

  // ── Access guard ──
  if (session?.user?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <div className="p-3 bg-gray-100 border border-gray-200 rounded-full">
          <Lock size={20} className="text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-600">Access Restricted</p>
        <p className="text-xs text-gray-400">This page is only accessible to Super Admins.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 border border-gray-200 rounded-lg">
            <Settings size={16} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Customize every aspect of your platform</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Branding ── */}
      {tab === "branding" && (
        <div className="space-y-5">
          <SectionCard title="Brand Identity" description="Configure your company name, logo, and visual identity">
            <div className="space-y-5">
              {/* Logo Upload */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Company Logo</p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon size={24} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">Upload your company logo (PNG, JPG, SVG, WebP)</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 hover:border-gray-500 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                      >
                        <Upload size={12} />
                        {uploadingLogo ? "Uploading…" : "Upload Logo"}
                      </button>
                      {logoPreview && (
                        <button
                          onClick={() => { setLogoPreview(""); set("logoPath", ""); }}
                          className="px-3 py-2 border border-red-200 hover:border-red-400 text-red-500 hover:text-red-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Company Name"
                  value={settings.companyName}
                  onChange={(v) => set("companyName", v)}
                  placeholder="e.g. Education Tree Global"
                  hint="Shown in the sidebar and across the app"
                />
                <Field
                  label="Short Code / Abbreviation"
                  value={settings.shortCode}
                  onChange={(v) => set("shortCode", v.toUpperCase().slice(0, 5))}
                  placeholder="e.g. ETG"
                  hint="Up to 5 characters, shown in the sidebar badge"
                />
              </div>

              <Field
                label="Tagline / Slogan"
                value={settings.tagline}
                onChange={(v) => set("tagline", v)}
                placeholder="e.g. Your global education partner"
                hint="Shown on login page and marketing materials"
              />
            </div>
          </SectionCard>

          <SectionCard title="Brand Color" description="Set the primary brand color used throughout the interface">
            <div className="flex items-center gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Primary Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.brandColor}
                    onChange={(e) => set("brandColor", e.target.value)}
                    className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <div>
                    <p className="text-sm font-mono font-medium text-gray-900">{settings.brandColor.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">Click to change color</p>
                  </div>
                  <div
                    className="w-32 h-12 rounded-lg flex items-center justify-center text-white text-xs font-semibold shadow-sm"
                    style={{ backgroundColor: settings.brandColor }}
                  >
                    Preview
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Online Payment QR Code" description="Upload the QR code displayed to users when they select Online as the exam payment method">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                  {qrPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrPreview} alt="Payment QR" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-gray-300">
                      <ImageIcon size={28} />
                      <span className="text-[10px]">No QR</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Upload your company&apos;s payment QR code (PNG, JPG, WebP).</p>
                <p className="text-xs text-gray-400 mb-3">This image is shown in the Add Lead form when &quot;Online&quot; is selected as the exam payment method.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => qrInputRef.current?.click()}
                    disabled={uploadingQr}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 hover:border-gray-500 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    <Upload size={12} />
                    {uploadingQr ? "Uploading…" : "Upload QR Code"}
                  </button>
                  {qrPreview && (
                    <button
                      onClick={() => { setQrPreview(""); set("paymentQrPath", ""); }}
                      className="px-3 py-2 border border-red-200 hover:border-red-400 text-red-500 hover:text-red-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input ref={qrInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleQrUpload} />
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <SaveBtn saving={saving} saved={saved} onClick={saveSettings} />
          </div>
        </div>
      )}

      {/* ── Tab: Contact Info ── */}
      {tab === "contact" && (
        <div className="space-y-5">
          <SectionCard title="Contact Information" description="Business contact details displayed in the system">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <Phone size={12} />Phone Number
                  </label>
                  <input
                    value={settings.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <Mail size={12} />Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="contact@yourcompany.com"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Globe size={12} />Website URL
                </label>
                <input
                  value={settings.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://www.yourcompany.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={12} />Office Address
                </label>
                <textarea
                  value={settings.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="123 Main Street, City, Country"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none"
                />
              </div>
            </div>
          </SectionCard>
          <div className="flex justify-end">
            <SaveBtn saving={saving} saved={saved} onClick={saveSettings} />
          </div>
        </div>
      )}

      {/* ── Tab: Lead Configuration ── */}
      {tab === "leads" && (
        <div className="space-y-5">
          <SectionCard title="Lead Statuses" description="Define the stages in your lead pipeline. These will be available as status options when managing leads.">
            <TagEditor
              label="Pipeline Stages"
              items={settings.leadStatuses}
              onChange={(v) => set("leadStatuses", v)}
              placeholder="Add a new status (e.g. 'proposal')"
            />
            <p className="text-xs text-gray-400 mt-3">Press Enter or click Add to insert a new stage. Click × to remove.</p>
          </SectionCard>

          <SectionCard title="Lead Sources" description="Where your leads come from. Shown in the source dropdown when creating or editing leads.">
            <TagEditor
              label="Lead Sources"
              items={settings.leadSources}
              onChange={(v) => set("leadSources", v)}
              placeholder="Add a source (e.g. 'LinkedIn')"
            />
          </SectionCard>

          <div className="flex justify-end">
            <SaveBtn saving={saving} saved={saved} onClick={saveSettings} />
          </div>
        </div>
      )}

      {/* ── Tab: Countries & Services ── */}
      {tab === "lists" && (
        <div className="space-y-5">
          <SectionCard title="Destination Countries" description="Countries shown in lead forms, document checklists, and filters.">
            <TagEditor
              label="Countries"
              items={settings.countries}
              onChange={(v) => set("countries", v)}
              placeholder="Add a country (e.g. 'Italy')"
            />
          </SectionCard>

          <SectionCard title="Services Offered" description="Services your consultancy provides.">
            <TagEditor
              label="Services"
              items={settings.services}
              onChange={(v) => set("services", v)}
              placeholder="Add a service (e.g. 'Coaching')"
            />
          </SectionCard>

          <div className="flex justify-end">
            <SaveBtn saving={saving} saved={saved} onClick={saveSettings} />
          </div>
        </div>
      )}

      {/* ── Tab: Module Toggles ── */}
      {tab === "modules" && (
        <div className="space-y-5">
          <SectionCard title="Feature Modules" description="Enable or disable sections of the application. Disabled modules will be hidden from navigation.">
            <div className="space-y-3">
              {ALL_MODULES.map(({ key, label }) => {
                const enabled = settings.enabledModules.includes(key);
                const isCore = key === "settings";
                const toggle = () => {
                  if (isCore) return;
                  const next = enabled
                    ? settings.enabledModules.filter((m) => m !== key)
                    : [...settings.enabledModules, key];
                  set("enabledModules", next);
                };
                return (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${enabled ? "bg-green-500" : "bg-gray-300"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{enabled ? "Visible to authorized roles" : "Hidden from all users"}</p>
                      </div>
                    </div>
                    <button
                      onClick={toggle}
                      title={isCore ? "Settings module cannot be disabled" : ""}
                      className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
                        enabled ? "bg-gray-900" : "bg-gray-300"
                      } ${isCore ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          enabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <SaveBtn saving={saving} saved={saved} onClick={saveSettings} />
          </div>
        </div>
      )}

      {/* ── Tab: Email & SMTP ── */}
      {tab === "email" && (
        <div className="space-y-5">
          <SectionCard title="SMTP Configuration" description="Configure outgoing email for transactional messages, reminders, and reports.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="SMTP Host" value={settings.smtpHost} onChange={(v) => set("smtpHost", v)} placeholder="smtp.gmail.com" />
                <Field label="SMTP Port" value={settings.smtpPort} onChange={(v) => set("smtpPort", parseInt(v) || 587)} type="number" placeholder="587" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="SMTP Username" value={settings.smtpUser} onChange={(v) => set("smtpUser", v)} placeholder="you@gmail.com" />
                <Field label="SMTP Password" value={settings.smtpPass} onChange={(v) => set("smtpPass", v)} type="password" placeholder="App password or SMTP secret" />
              </div>
              <Field
                label="From Name"
                value={settings.emailFromName}
                onChange={(v) => set("emailFromName", v)}
                placeholder="e.g. Education Tree Global"
                hint="The sender name shown in email inboxes"
              />
            </div>
            <div className="mt-5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">Tip</p>
              <p className="text-xs text-blue-600 mt-0.5">
                For Gmail: enable 2-Step Verification and use an App Password. For Office 365: use smtp.office365.com on port 587.
              </p>
            </div>
          </SectionCard>
          <div className="flex justify-end">
            <SaveBtn saving={saving} saved={saved} onClick={saveSettings} />
          </div>
        </div>
      )}

      {/* ── Tab: Document Checklists ── */}
      {tab === "checklists" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <FileText size={15} className="text-gray-500" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Document Checklists by Country</h2>
              <p className="text-xs text-gray-500 mt-0.5">Define required documents for each destination country</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Country List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Countries</p>
              </div>
              <div className="overflow-y-auto max-h-[480px] p-2 space-y-0.5">
                {settings.countries.map((c) => {
                  const has = checklists.some((cl) => cl.country === c);
                  const active = selectedCountry === c;
                  return (
                    <button
                      key={c}
                      onClick={() => loadCountry(c)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        active ? "bg-gray-900 text-white" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span>{c}</span>
                      {has && <span className={`text-xs ${active ? "text-gray-400" : "text-green-500"}`}>●</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist Editor */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
              {!selectedChecklist ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
                  <ChevronRight size={28} className="text-gray-300" />
                  <p className="text-sm">Select a country to manage its checklist</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Documents for {selectedChecklist.country}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedChecklist.documents.length} document{selectedChecklist.documents.length !== 1 ? "s" : ""} configured
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addDoc}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 hover:border-gray-500 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                      >
                        <Plus size={13} /> Add Document
                      </button>
                      <button
                        onClick={saveChecklist}
                        disabled={clSaving}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                          clSaved ? "bg-green-600 text-white" : "bg-gray-900 hover:bg-gray-700 text-white disabled:opacity-60"
                        }`}
                      >
                        {clSaving ? "Saving…" : clSaved ? "Saved!" : "Save Changes"}
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    {selectedChecklist.documents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                        <p className="text-sm">No documents yet.</p>
                        <button onClick={addDoc} className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800">
                          Add the first document
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-2 mb-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Document Name</p>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Required</p>
                          <span />
                        </div>
                        {selectedChecklist.documents.map((doc, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center p-3 bg-gray-50 border border-gray-100 rounded-lg">
                            <input
                              value={doc.name}
                              placeholder="Document name *"
                              onChange={(e) => updateDoc(i, "name", e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                            />
                            <input
                              value={doc.description || ""}
                              placeholder="Description (optional)"
                              onChange={(e) => updateDoc(i, "description", e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                            />
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap cursor-pointer select-none">
                              <input type="checkbox" checked={doc.isRequired} onChange={(e) => updateDoc(i, "isRequired", e.target.checked)} className="accent-gray-900" />
                              Required
                            </label>
                            <button onClick={() => removeDoc(i)} className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-400 hover:text-gray-700">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
