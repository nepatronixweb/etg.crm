"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Banknote, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { hasPermission } from "@/lib/utils";
import {
  getCurrencySymbolForCountry,
  resolveCommissionPercent,
} from "@/lib/commissionMeta";
import {
  studentToCommissionForm,
  type LooseStudentForCommission,
} from "@/lib/commissionAutofill";
import { normalizeUniversitiesArray, universityEntryNames } from "@/lib/countryUniversities";

type CountryRow = { name: string; universities: string[] };

const INTAKE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
/** Single “commission claim” control: which semester/year is claimed. */
const COMMISSION_CLAIM_OPTIONS = [
  { value: "1st_sem", label: "1st sem" },
  { value: "2nd_sem", label: "2nd sem" },
  { value: "3rd_sem", label: "3rd sem" },
  { value: "4th_sem", label: "4th sem" },
  { value: "5th_sem", label: "5th sem" },
  { value: "6th_sem", label: "6th sem" },
  { value: "1_year", label: "One year" },
] as const;
type CommissionClaimValue = (typeof COMMISSION_CLAIM_OPTIONS)[number]["value"];

const COMMISSION_DURATION_OPTIONS = [
  { value: "one_year", label: "One year" },
  { value: "entire_duration", label: "Entire duration" },
  { value: "other", label: "Other" },
] as const;
type CommissionDurationValue = (typeof COMMISSION_DURATION_OPTIONS)[number]["value"];

function commissionClaimLabel(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "-";
  const hit = COMMISSION_CLAIM_OPTIONS.find((o) => o.value === raw);
  return hit?.label ?? raw;
}

function commissionDurationLabel(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "-";
  const hit = COMMISSION_DURATION_OPTIONS.find((o) => o.value === raw);
  return hit?.label ?? raw;
}
const B2B_CHANNEL = [
  { value: "direct", label: "Direct" },
  { value: "sub_agent", label: "Sub-agent" },
] as const;
const REMARKS_OPTIONS = [
  { value: "processed", label: "Processed" },
  { value: "received", label: "Received" },
] as const;
const OSHC_NAME_OPTIONS = [
  { value: "nb", label: "N/B" },
  { value: "bvpa", label: "BVPA" },
  { value: "annalink", label: "Annalink" },
  { value: "aisa", label: "AISA" },
  { value: "your_oshc", label: "YOUR OSHC" },
  { value: "fly_finance", label: "FLY FINANCE" },
] as const;
type OshcNameValue = (typeof OSHC_NAME_OPTIONS)[number]["value"];
const OSHC_CLAIM_OPTIONS = [
  { value: "proceed", label: "Proceed" },
  { value: "received", label: "Received" },
] as const;
type OshcClaimValue = (typeof OSHC_CLAIM_OPTIONS)[number]["value"];

function oshcNameLabel(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "-";
  const hit = OSHC_NAME_OPTIONS.find((o) => o.value === raw);
  return hit?.label ?? raw;
}

function oshcClaimLabel(raw: unknown): string {
  if (raw === "proceed") return "Proceed";
  if (raw === "received") return "Received";
  return "-";
}

function remarksStatusLabel(raw: unknown): string {
  if (raw === "processed") return "Processed";
  if (raw === "received") return "Received";
  if (raw === "yes") return "Yes";
  return "-";
}

const COMMISSION_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "discontinued", label: "Discontinued" },
] as const;
type CommissionStatusValue = (typeof COMMISSION_STATUS_OPTIONS)[number]["value"];

function commissionStatusLabel(raw: unknown): string {
  if (raw === "completed") return "Completed";
  if (raw === "discontinued") return "Discontinued";
  return "-";
}

const fieldClass =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";
const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";

const emptyForm = {
  destinationCountry: "",
  applicantName: "",
  studentId: "",
  universityName: "",
  courseStartDate: "",
  courseEndDate: "",
  courseAnnualFee: "",
  tuitionFeePaid: "",
  amountFromPercent: "",
  intakeQuarter: "" as "" | "Q1" | "Q2" | "Q3" | "Q4",
  intakeYear: "",
  claimableIntake: "" as "" | CommissionClaimValue,
  commissionDuration: "" as "" | CommissionDurationValue,
  incentives: "",
  oshcName: "" as "" | OshcNameValue,
  oshcAmount: "",
  oshcClaim: "" as "" | OshcClaimValue,
  b2bName: "",
  b2bChannel: "" as "" | "direct" | "sub_agent",
  commissionAmount: "",
  remarksStatus: "" as "" | "processed" | "received",
  commissionStatus: "" as "" | CommissionStatusValue,
};

const CLAIM_VALUE_SET = new Set<string>(COMMISSION_CLAIM_OPTIONS.map((o) => o.value));
const DURATION_VALUE_SET = new Set<string>([
  ...COMMISSION_DURATION_OPTIONS.map((o) => o.value),
  "",
]);
const OSHC_VALUE_SET = new Set<string>(OSHC_NAME_OPTIONS.map((o) => o.value));

function dateFieldToInput(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  }
  return "";
}

function mapCommissionToForm(doc: Record<string, unknown>): typeof emptyForm {
  const ci = doc.claimableIntake;
  const claimableIntake = (typeof ci === "string" && CLAIM_VALUE_SET.has(ci) ? ci : "") as typeof emptyForm.claimableIntake;

  const cd = doc.commissionDuration;
  const commissionDuration = (typeof cd === "string" && DURATION_VALUE_SET.has(cd) ? cd : "") as typeof emptyForm.commissionDuration;

  const on = doc.oshcName;
  const oshcName = (typeof on === "string" && OSHC_VALUE_SET.has(on) ? on : "") as typeof emptyForm.oshcName;

  const oc = doc.oshcClaim;
  const oshcClaim = (oc === "proceed" || oc === "received" ? oc : "") as typeof emptyForm.oshcClaim;

  const iq = doc.intakeQuarter;
  const intakeQuarter =
    iq === "Q1" || iq === "Q2" || iq === "Q3" || iq === "Q4" ? iq : ("" as typeof emptyForm.intakeQuarter);

  const ch = doc.b2bChannel;
  const b2bChannel =
    ch === "direct" || ch === "sub_agent" ? ch : ("" as typeof emptyForm.b2bChannel);

  const rs = doc.remarksStatus;
  const remarksStatus =
    rs === "processed" || rs === "received"
      ? rs
      : ("" as typeof emptyForm.remarksStatus);

  const cs = doc.commissionStatus;
  const commissionStatus =
    cs === "completed" || cs === "discontinued" ? cs : ("" as typeof emptyForm.commissionStatus);

  return {
    destinationCountry: String(doc.destinationCountry ?? ""),
    applicantName: String(doc.applicantName ?? ""),
    studentId: String(doc.studentId ?? ""),
    universityName: String(doc.universityName ?? ""),
    courseStartDate: dateFieldToInput(doc.courseStartDate),
    courseEndDate: dateFieldToInput(doc.courseEndDate),
    courseAnnualFee: String(doc.courseAnnualFee ?? ""),
    tuitionFeePaid: String(doc.tuitionFeePaid ?? ""),
    amountFromPercent: String(doc.amountFromPercent ?? ""),
    intakeQuarter,
    intakeYear: String(doc.intakeYear ?? ""),
    claimableIntake,
    commissionDuration,
    incentives: String(doc.incentives ?? ""),
    oshcName,
    oshcAmount: String(doc.oshcAmount ?? ""),
    oshcClaim,
    b2bName: String(doc.b2bName ?? ""),
    b2bChannel,
    commissionAmount: String(doc.commissionAmount ?? ""),
    remarksStatus,
    commissionStatus,
  };
}

export default function CommissionPage() {
  const { data: session, status } = useSession();
  const branding = useBranding();
  const perms = (session?.user?.permissions ?? []) as string[];
  const role = session?.user?.role ?? "";
  const canAccess =
    status === "authenticated" &&
    (role === "super_admin" || hasPermission(perms, "commission", role));

  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [b2bNames, setB2bNames] = useState<string[]>([]);
  const [percentMap, setPercentMap] = useState<Record<string, number>>({});
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [applicantSuggestions, setApplicantSuggestions] = useState<LooseStudentForCommission[]>([]);
  const [applicantSuggestLoading, setApplicantSuggestLoading] = useState(false);
  const [applicantListOpen, setApplicantListOpen] = useState(false);
  const skipApplicantSearchRef = useRef(false);

  const [list, setList] = useState<Record<string, unknown>[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.countries)) {
          setCountries(
            d.countries.map((c: string | CountryRow & { universities?: unknown[] }) =>
              typeof c === "string"
                ? { name: c, universities: [] }
                : {
                    name: c.name,
                    universities: universityEntryNames(normalizeUniversitiesArray(c.universities)),
                  }
            )
          );
        }
        if (Array.isArray(d?.b2bNames)) setB2bNames(d.b2bNames);
        if (d?.commissionPercentByCountry && typeof d.commissionPercentByCountry === "object") {
          setPercentMap(d.commissionPercentByCountry as Record<string, number>);
        }
      })
      .catch(() => {});
  }, []);

  const loadList = useCallback(() => {
    if (!canAccess) return;
    setListLoading(true);
    fetch("/api/commissions?limit=100")
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d?.commissions) ? d.commissions : []))
      .finally(() => setListLoading(false));
  }, [canAccess]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const universitiesForCountry = useMemo(() => {
    const row = countries.find((c) => c.name === form.destinationCountry);
    return row?.universities?.length ? row.universities : [];
  }, [countries, form.destinationCountry]);

  const showUniversitySelect = useMemo(() => {
    if (universitiesForCountry.length === 0) return false;
    return !form.universityName || universitiesForCountry.includes(form.universityName);
  }, [universitiesForCountry, form.universityName]);

  const commissionPercent = resolveCommissionPercent(form.destinationCountry, percentMap);
  const currencySymbol = getCurrencySymbolForCountry(form.destinationCountry);

  useEffect(() => {
    if (!showCreateForm || !canAccess) return;
    if (skipApplicantSearchRef.current) {
      skipApplicantSearchRef.current = false;
      return;
    }
    const q = form.applicantName.trim();
    if (q.length < 2) {
      setApplicantSuggestions([]);
      setApplicantSuggestLoading(false);
      return;
    }
    setApplicantSuggestLoading(true);
    const t = setTimeout(() => {
      fetch(
        `/api/students?search=${encodeURIComponent(q)}&visaGrantedOnly=1&limit=12`
      )
        .then((r) => r.json())
        .then((d) =>
          setApplicantSuggestions(Array.isArray(d?.students) ? d.students : [])
        )
        .finally(() => setApplicantSuggestLoading(false));
    }, 320);
    return () => clearTimeout(t);
  }, [form.applicantName, showCreateForm, canAccess]);

  const applyVisaGrantedStudent = (s: LooseStudentForCommission) => {
    skipApplicantSearchRef.current = true;
    const filled = studentToCommissionForm(s);
    setForm({
      ...emptyForm,
      ...filled,
      amountFromPercent: "",
      claimableIntake: "",
      commissionDuration: "",
      incentives: "",
      oshcName: "",
      oshcAmount: "",
      oshcClaim: "",
      commissionAmount: "",
      remarksStatus: "",
      commissionStatus: "",
    });
    setApplicantSuggestions([]);
    setApplicantListOpen(false);
  };

  const visaPipelineLabel = (s: LooseStudentForCommission) => {
    if (s.stage === "visa_grant") return "Visa grant";
    if (s.admissionDetails?.some((a) => a.stage === "visa_grant")) return "Visa grant (admission)";
    if (s.countries?.some((c) => c.visaApprovedAt != null)) return "Visa approved";
    if (s.countries?.some((c) => /grant|approved|ppr|aip/i.test(String(c.visaStatus ?? "")))) {
      return "Visa (record)";
    }
    return "Visa pipeline";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!form.destinationCountry || !form.applicantName.trim() || !form.universityName.trim()) {
      setMessage({ type: "err", text: "Destination, applicant name, and university are required." });
      return;
    }
    const isEditing = editingCommissionId !== null;
    setSaving(true);
    const res = await fetch(isEditing ? `/api/commissions/${editingCommissionId}` : "/api/commissions", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        commissionPercent,
        currencySymbol,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error || "Could not save." });
      return;
    }
    setMessage({ type: "ok", text: isEditing ? "Commission updated." : "Commission record saved." });
    setForm(emptyForm);
    setEditingCommissionId(null);
    setShowCreateForm(false);
    loadList();
  };

  const startEditCommission = async (id: string) => {
    if (busyRowId) return;
    setBusyRowId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/commissions/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.commission) {
        setMessage({ type: "err", text: data.error || "Could not load commission." });
        return;
      }
      setForm(mapCommissionToForm(data.commission as Record<string, unknown>));
      setEditingCommissionId(id);
      setShowCreateForm(true);
      setApplicantSuggestions([]);
      setApplicantListOpen(false);
    } finally {
      setBusyRowId(null);
    }
  };

  const deleteCommission = async (id: string, applicantName: string) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete commission record for "${applicantName}"?`)) return;
    if (busyRowId) return;
    setBusyRowId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/commissions/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Could not delete." });
        return;
      }
      setMessage({ type: "ok", text: "Commission deleted." });
      loadList();
    } finally {
      setBusyRowId(null);
    }
  };

  const openCreateForm = () => {
    setMessage(null);
    setForm(emptyForm);
    setEditingCommissionId(null);
    setApplicantSuggestions([]);
    setApplicantListOpen(false);
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setForm(emptyForm);
    setEditingCommissionId(null);
    setMessage(null);
    setApplicantSuggestions([]);
    setApplicantListOpen(false);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center text-gray-500 text-sm">
        You don&apos;t have permission to access Commission.
      </div>
    );
  }

  const yearNow = new Date().getFullYear();
  const yearOptions = Array.from({ length: 12 }, (_, i) => String(yearNow - 4 + i));

  return (
    <div className={`space-y-8 ${showCreateForm ? "max-w-4xl" : "max-w-6xl"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${branding.brandColor}18` }}>
            <Banknote className="w-7 h-7" style={{ color: branding.brandColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commission</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {showCreateForm
                ? editingCommissionId
                  ? "Update this commission record."
                  : "Fill in the form to add a new commission record."
                : "View commission records or create a new entry."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showCreateForm ? (
            <button
              type="button"
              onClick={closeCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to list
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
              style={{ backgroundColor: branding.brandColor }}
            >
              <Plus size={18} />
              Create a commission
            </button>
          )}
        </div>
      </div>

      {!showCreateForm && message && (
        <div
          className={`text-sm px-4 py-3 rounded-xl ${
            message.type === "ok" ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-800 border border-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      {showCreateForm && (
      <form onSubmit={submit} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          {editingCommissionId ? (
            <Pencil size={16} style={{ color: branding.brandColor }} />
          ) : (
            <Plus size={16} style={{ color: branding.brandColor }} />
          )}
          {editingCommissionId ? "Edit commission" : "New commission"}
        </h2>

        {message && (
          <div
            className={`text-sm px-4 py-3 rounded-xl ${
              message.type === "ok" ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-800 border border-red-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Destination (country)</label>
            <select
              required
              value={form.destinationCountry}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  destinationCountry: e.target.value,
                  universityName: "",
                }))
              }
              className={fieldClass}
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative z-20">
            <label className={labelClass}>Applicant name</label>
            <p className="text-[11px] text-gray-400 mb-1">
              Start typing - suggestions are limited to students in the <span className="font-semibold text-gray-600">visa grant / visa approved</span> pipeline. Pick one to auto-fill the form.
            </p>
            <input
              required
              autoComplete="off"
              value={form.applicantName}
              onChange={(e) => {
                setForm((f) => ({ ...f, applicantName: e.target.value }));
                setApplicantListOpen(true);
              }}
              onFocus={() => setApplicantListOpen(true)}
              onBlur={() => setTimeout(() => setApplicantListOpen(false), 200)}
              className={fieldClass}
              placeholder="Full name (visa-granted students)"
            />
            {applicantSuggestLoading && (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Searching…
              </p>
            )}
            {applicantListOpen && applicantSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg z-30">
                {applicantSuggestions.map((s) => {
                  const preview = studentToCommissionForm(s);
                  return (
                    <li key={s._id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyVisaGrantedStudent(s)}
                      >
                        <span className="font-medium text-gray-900">{s.name}</span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          {visaPipelineLabel(s)}
                          {preview.destinationCountry ? ` · ${preview.destinationCountry}` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <label className={labelClass}>Student ID</label>
            <input
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
              className={fieldClass}
              placeholder="Institution ID or internal ref."
            />
          </div>

          <div>
            <label className={labelClass}>University name</label>
            {showUniversitySelect ? (
              <select
                required
                value={form.universityName}
                onChange={(e) => setForm((f) => ({ ...f, universityName: e.target.value }))}
                className={fieldClass}
              >
                <option value="">Select university</option>
                {universitiesForCountry.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
                value={form.universityName}
                onChange={(e) => setForm((f) => ({ ...f, universityName: e.target.value }))}
                className={fieldClass}
                placeholder={
                  form.destinationCountry
                    ? "University (from student record or type to adjust)"
                    : "Select destination first"
                }
              />
            )}
          </div>

          <div>
            <label className={labelClass}>Course start date</label>
            <input
              type="date"
              value={form.courseStartDate}
              onChange={(e) => setForm((f) => ({ ...f, courseStartDate: e.target.value }))}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Course end date</label>
            <input
              type="date"
              value={form.courseEndDate}
              onChange={(e) => setForm((f) => ({ ...f, courseEndDate: e.target.value }))}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Course annual fee</label>
            <input
              value={form.courseAnnualFee}
              onChange={(e) => setForm((f) => ({ ...f, courseAnnualFee: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 25000"
            />
          </div>

          <div>
            <label className={labelClass}>Tuition fee paid</label>
            <input
              value={form.tuitionFeePaid}
              onChange={(e) => setForm((f) => ({ ...f, tuitionFeePaid: e.target.value }))}
              className={fieldClass}
              placeholder="Amount paid to date"
            />
          </div>
        </div>

        {form.destinationCountry && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Commission % (this destination)</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {currencySymbol ? (
                  <>
                    {commissionPercent}% <span className="text-slate-500 font-normal">({currencySymbol})</span>
                  </>
                ) : (
                  <>{commissionPercent}%</>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Override per country in Settings (stored as commission %) if needed.</p>
            </div>
            <div>
              <label className={labelClass}>Amount (after %)</label>
              <div className="flex items-center gap-2">
                {currencySymbol && (
                  <span className="text-sm font-semibold text-gray-600 tabular-nums">{currencySymbol}</span>
                )}
                <input
                  value={form.amountFromPercent}
                  onChange={(e) => setForm((f) => ({ ...f, amountFromPercent: e.target.value }))}
                  className={fieldClass}
                  placeholder="Enter amount"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Intake (quarter)</label>
            <select
              value={form.intakeQuarter}
              onChange={(e) => setForm((f) => ({ ...f, intakeQuarter: e.target.value as typeof f.intakeQuarter }))}
              className={fieldClass}
            >
              <option value="">Select</option>
              {INTAKE_QUARTERS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Year</label>
            <select
              value={form.intakeYear}
              onChange={(e) => setForm((f) => ({ ...f, intakeYear: e.target.value }))}
              className={fieldClass}
            >
              <option value="">Select year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Commission duration</label>
            <p className="text-[11px] text-gray-400 mb-1">How commission is calculated over the course.</p>
            <select
              value={form.commissionDuration}
              onChange={(e) =>
                setForm((f) => ({ ...f, commissionDuration: e.target.value as typeof f.commissionDuration }))
              }
              className={fieldClass}
            >
              <option value="">Select</option>
              {COMMISSION_DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Commission claim</label>
            <p className="text-[11px] text-gray-400 mb-1">Which period this commission applies to.</p>
            <select
              value={form.claimableIntake}
              onChange={(e) => setForm((f) => ({ ...f, claimableIntake: e.target.value as typeof f.claimableIntake }))}
              className={fieldClass}
            >
              <option value="">Select</option>
              {COMMISSION_CLAIM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Incentives</label>
            <input
              value={form.incentives}
              onChange={(e) => setForm((f) => ({ ...f, incentives: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. bonus, tier, notes"
            />
          </div>

          <div className="md:col-span-2 rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-4">
            <p className="text-xs font-bold text-teal-800 uppercase tracking-wide">OSHC</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>OSHC name</label>
                <select
                  value={form.oshcName}
                  onChange={(e) => setForm((f) => ({ ...f, oshcName: e.target.value as typeof f.oshcName }))}
                  className={fieldClass}
                >
                  <option value="">Select</option>
                  {OSHC_NAME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>OSHC amount</label>
                <div className="flex items-center gap-2">
                  {currencySymbol && form.destinationCountry ? (
                    <span className="text-sm font-semibold text-gray-600 shrink-0">{currencySymbol}</span>
                  ) : null}
                  <input
                    value={form.oshcAmount}
                    onChange={(e) => setForm((f) => ({ ...f, oshcAmount: e.target.value }))}
                    className={fieldClass}
                    placeholder="Amount"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>OSHC claim</label>
                <select
                  value={form.oshcClaim}
                  onChange={(e) => setForm((f) => ({ ...f, oshcClaim: e.target.value as typeof f.oshcClaim }))}
                  className={fieldClass}
                >
                  <option value="">Select</option>
                  {OSHC_CLAIM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>B2B</label>
            <select
              value={form.b2bName}
              onChange={(e) => setForm((f) => ({ ...f, b2bName: e.target.value }))}
              className={fieldClass}
            >
              <option value="">Select partner</option>
              {b2bNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>B2B type</label>
            <select
              value={form.b2bChannel}
              onChange={(e) => setForm((f) => ({ ...f, b2bChannel: e.target.value as typeof f.b2bChannel }))}
              className={fieldClass}
            >
              <option value="">Select</option>
              {B2B_CHANNEL.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Commission amount</label>
            <div className="flex items-center gap-2">
              {currencySymbol && form.destinationCountry ? (
                <span className="text-sm font-semibold text-gray-600">{currencySymbol}</span>
              ) : null}
              <input
                value={form.commissionAmount}
                onChange={(e) => setForm((f) => ({ ...f, commissionAmount: e.target.value }))}
                className={fieldClass}
                placeholder="Commission amount"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Remarks</label>
            <select
              value={form.remarksStatus}
              onChange={(e) => setForm((f) => ({ ...f, remarksStatus: e.target.value as typeof f.remarksStatus }))}
              className={fieldClass}
            >
              <option value="">Select</option>
              {REMARKS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="max-w-md">
            <label className={labelClass}>Commission status</label>
            <select
              value={form.commissionStatus}
              onChange={(e) =>
                setForm((f) => ({ ...f, commissionStatus: e.target.value as typeof f.commissionStatus }))
              }
              className={fieldClass}
            >
              <option value="">Select</option>
              {COMMISSION_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={closeCreateForm}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-2"
            style={{ backgroundColor: branding.brandColor }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editingCommissionId ? "Save changes" : "Save commission"}
          </button>
        </div>
      </form>
      )}

      {!showCreateForm && (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Commission records</h3>
        </div>
        {listLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Applicant</th>
                  <th className="px-4 py-2">Destination</th>
                  <th className="px-4 py-2">University</th>
                  <th className="px-4 py-2">Duration</th>
                  <th className="px-4 py-2">Claim</th>
                  <th className="px-4 py-2">Incentives</th>
                  <th className="px-4 py-2">OSHC</th>
                  <th className="px-4 py-2">OSHC amt</th>
                  <th className="px-4 py-2">OSHC claim</th>
                  <th className="px-4 py-2">Remarks</th>
                  <th className="px-4 py-2">%</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-3 py-2 w-14 text-center" aria-label="Actions">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.map((row) => {
                  const claimShow =
                    commissionClaimLabel(row.claimableIntake) !== "-"
                      ? commissionClaimLabel(row.claimableIntake)
                      : [row.commission, row.claim].filter(Boolean).join(" · ") || "-";
                  const trunc = (s: unknown, n: number) => {
                    const t = String(s ?? "").trim();
                    if (!t) return "-";
                    return t.length > n ? `${t.slice(0, n)}…` : t;
                  };
                  return (
                  <tr key={String(row._id)} className="text-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                      {row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        disabled={busyRowId === String(row._id)}
                        onClick={() => void startEditCommission(String(row._id))}
                        className="text-left font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-60 disabled:no-underline"
                      >
                        {busyRowId === String(row._id) ? (
                          <span className="inline-flex items-center gap-1.5 text-gray-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            <span className="truncate max-w-[140px]">{String(row.applicantName ?? "")}</span>
                          </span>
                        ) : (
                          String(row.applicantName ?? "")
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2">{String(row.destinationCountry ?? "")}</td>
                    <td className="px-4 py-2 max-w-[160px] truncate">{String(row.universityName ?? "")}</td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{commissionDurationLabel(row.commissionDuration)}</td>
                    <td className="px-4 py-2 text-xs max-w-[100px]">{claimShow}</td>
                    <td className="px-4 py-2 text-xs max-w-[120px]" title={String(row.incentives ?? "")}>
                      {trunc(row.incentives, 24)}
                    </td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap max-w-[100px] truncate" title={oshcNameLabel(row.oshcName)}>
                      {oshcNameLabel(row.oshcName) !== "-"
                        ? oshcNameLabel(row.oshcName)
                        : trunc(row.marketingBudget, 16)}
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums max-w-[88px] truncate" title={String(row.oshcAmount ?? "")}>
                      {String(row.oshcAmount ?? "").trim() ? (
                        <>
                          {row.currencySymbol ? `${String(row.currencySymbol)} ` : ""}
                          {String(row.oshcAmount)}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{oshcClaimLabel(row.oshcClaim)}</td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{remarksStatusLabel(row.remarksStatus)}</td>
                    <td className="px-4 py-2 tabular-nums">{String(row.commissionPercent ?? "")}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {row.currencySymbol ? `${String(row.currencySymbol)} ` : ""}
                      {String(row.commissionAmount ?? row.amountFromPercent ?? "-")}
                    </td>
                    <td className="px-4 py-2 text-xs font-medium whitespace-nowrap">
                      {commissionStatusLabel(row.commissionStatus)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => void deleteCommission(String(row._id), String(row.applicantName ?? "this record"))}
                        disabled={busyRowId === String(row._id)}
                        className="inline-flex p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete commission"
                      >
                        {busyRowId === String(row._id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
