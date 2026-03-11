"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDate, getStatusColor, COUNTRIES, SERVICES, LEAD_STAGES, LEAD_STAGE_GROUPS, getLeadStageColor, getLeadStageDotColor } from "@/lib/utils";
import { IStudent } from "@/types";
import Link from "next/link";
import { Search, UserCheck, Plus, X, ChevronDown, MessageSquare, MoreVertical, Phone, Mail, FileSpreadsheet } from "lucide-react";
import { useSession } from "next-auth/react";

const SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

const FIELD = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors";
const LABEL = "block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide";

const STAGES = ["counsellor", "application", "admission", "visa", "completed", "rejected"];

export default function StudentsPage() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<IStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterCounsellor, setFilterCounsellor] = useState("");
  const [filterLeadStage, setFilterLeadStage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [branches, setBranches] = useState<{ _id: string; name: string }[]>([]);
  const [counsellors, setCounsellors] = useState<{ _id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const defaultForm = {
    name: "", phone: "", email: "", dateOfBirth: "",
    source: "walk_in", interestedService: "", interestedCountry: "",
    branch: "", counsellorId: "", comments: "",
  };
  const [form, setForm] = useState(defaultForm);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const fetchStudents = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStage) params.set("stage", filterStage);
    const role = session?.user?.role ?? "";
    if (role === "admission_team" || role === "visa_team") params.set("enrolled", "true");
    const res = await fetch(`/api/students?${params}`);
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStudents(); }, [filterStage, session?.user?.role]);

  useEffect(() => {
    fetch("/api/branches").then((r) => r.json()).then((br) => setBranches(Array.isArray(br) ? br : []));
    fetch("/api/users").then((r) => r.json()).then((u) =>
      setCounsellors(Array.isArray(u) ? u.filter((x: { role: string }) => x.role === "counsellor") : [])
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stageDropdownId, setStageDropdownId] = useState<string | null>(null);
  const [crmStageDropdownId, setCrmStageDropdownId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [crmStagePanelPos, setCrmStagePanelPos] = useState({ top: 0, left: 0 });
  const crmStagePanelRef = useRef<HTMLDivElement>(null);
  const [crmStageSearch, setCrmStageSearch] = useState("");
  const [pipelinePanelPos, setPipelinePanelPos] = useState({ top: 0, left: 0 });
  const pipelinePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (crmStagePanelRef.current && !crmStagePanelRef.current.contains(e.target as Node)) {
        setCrmStageDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pipelinePanelRef.current && !pipelinePanelRef.current.contains(e.target as Node)) {
        setStageDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const quickUpdateCrmStage = async (studentId: string, newStage: string) => {
    setCrmStageDropdownId(null);
    setStudents((prev) => prev.map((s) => s._id === studentId ? { ...s, stage: newStage } : s));
    await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
  };

  const quickUpdateStage = async (studentId: string, newStage: string) => {
    setStageDropdownId(null);
    setStudents((prev) => prev.map((s) => s._id === studentId ? { ...s, currentStage: newStage as IStudent["currentStage"] } : s));
    await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStage: newStage }),
    });
  };

  const openCrmStagePortal = (e: React.MouseEvent, studentId: string) => {
    if (crmStageDropdownId === studentId) { setCrmStageDropdownId(null); return; }
    setCrmStageSearch("");
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const popoverWidth = 320;
    const left = Math.min(rect.left, window.innerWidth - popoverWidth - 8);
    setCrmStagePanelPos({ top: rect.bottom + window.scrollY + 8, left });
    setCrmStageDropdownId(studentId);
  };

  const openPipelinePortal = (e: React.MouseEvent, studentId: string) => {
    if (stageDropdownId === studentId) { setStageDropdownId(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const popoverWidth = 192;
    const left = Math.min(rect.left, window.innerWidth - popoverWidth - 8);
    setPipelinePanelPos({ top: rect.bottom + window.scrollY + 8, left });
    setStageDropdownId(studentId);
  };

  const formatStudentDateTime = (d: Date | string) => {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, "0");
    const min = String(dt.getMinutes()).padStart(2, "0");
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  };

  const openModal = async () => {
    setForm({ ...defaultForm, branch: session?.user?.branch || "" });
    setSubmitError("");
    setShowModal(true);
    if (branches.length === 0) {
      const br = await fetch("/api/branches").then((r) => r.json());
      setBranches(Array.isArray(br) ? br : []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    const payload: Record<string, unknown> = { ...form, direct: true };
    if (!payload.branch) delete payload.branch;
    if (!payload.counsellorId) delete payload.counsellorId;
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        fetchStudents();
      } else {
        setSubmitError(data?.error || "Failed to add student.");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = ["super_admin", "counsellor", "front_desk"].includes(session?.user?.role || "");
  const canExport = ["super_admin", "telecaller"].includes(session?.user?.role || "");
  const canUpdateStage = ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"].includes(session?.user?.role || "");

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const counsellorName = (s.counsellor as unknown as { name: string } | undefined)?.name ?? "";
    const matchesSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      counsellorName.toLowerCase().includes(q);
    const matchesStage = !filterStage || s.currentStage === filterStage;
    const matchesSource = !filterSource || s.source === filterSource;
    const matchesService = !filterService || (s as unknown as { interestedService?: string }).interestedService === filterService;
    const matchesCounsellor = !filterCounsellor || (s.counsellor as unknown as { _id: string } | undefined)?._id === filterCounsellor;
    const matchesLeadStage = !filterLeadStage || (s as unknown as { stage?: string }).stage === filterLeadStage;
    return matchesSearch && matchesStage && matchesSource && matchesService && matchesCounsellor && matchesLeadStage;
  });

  const activeFilterCount = [filterStage, filterSource, filterService, filterCounsellor, filterLeadStage].filter(Boolean).length;

  // ── Export filtered students to Excel (CSV) ──
  const exportToExcel = () => {
    const headers = [
      "ETG ID", "Name", "Phone", "Email", "Date of Birth",
      "Stage", "CRM Stage", "Source",
      "Interested Service", "Interested Country",
      "Branch", "Counsellor", "Created Date",
    ];
    const escape = (v?: string | null) => {
      const s = (v ?? "").toString().replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };
    const rows = filtered.map((s) => {
      const counsellor = (s.counsellor as unknown as { name?: string } | undefined)?.name ?? "";
      const br = (s.branch as unknown as { name?: string } | undefined)?.name ?? "";
      const ext = s as unknown as Record<string, string | undefined>;
      const stageLabel = LEAD_STAGES.find((st) => st.value === ext.stage)?.label ?? ext.stage ?? "";
      return [
        `ETG-${s._id.slice(-4).toUpperCase()}`,
        s.name, s.phone, s.email,
        s.dateOfBirth ?? "",
        s.currentStage ?? "",
        stageLabel,
        (s.source ?? "").replace(/_/g, " "),
        ext.interestedService ?? "",
        ext.interestedCountry ?? "",
        br, counsellor,
        s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-GB") : "",
      ].map(escape).join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    const suffix = activeFilterCount > 0 ? `_filtered_${filtered.length}` : `_all_${students.length}`;
    a.download = `ETG_Students${suffix}_${dateStamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${filtered.length} of ${students.length} students`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              Add Student
            </button>
          )}
          {canExport && (
          <button
            onClick={exportToExcel}
            disabled={loading || filtered.length === 0}
            title={`Export ${filtered.length} student${filtered.length !== 1 ? "s" : ""} to Excel`}
            className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <FileSpreadsheet size={15} />
            Export{activeFilterCount > 0 ? ` (${filtered.length})` : ""}
          </button>
          )}
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {STAGES.map((stage) => {
          const count = students.filter((s) => s.currentStage === stage).length;
          const isActive = filterStage === stage;
          return (
            <button
              key={stage}
              onClick={() => setFilterStage(isActive ? "" : stage)}
              className={`p-3.5 rounded-lg border text-center transition-colors ${
                isActive
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 hover:border-gray-400 text-gray-700"
              }`}
            >
              <p className={`text-xl font-bold ${isActive ? "text-white" : "text-gray-900"}`}>{count}</p>
              <p className={`text-xs mt-0.5 capitalize font-medium ${isActive ? "text-gray-300" : "text-gray-500"}`}>
                {stage}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter + Search Bar */}
      <div className="bg-white border border-gray-200 rounded-lg" onClick={() => { setStageDropdownId(null); setCrmStageDropdownId(null); setMenuOpenId(null); }}>
        <div className="flex items-stretch gap-0 divide-x divide-gray-200 flex-wrap">

          {/* Student Stage */}
          <div className="flex-1 min-w-36 relative">
            <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">Student Stage</label>
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
              className="w-full pt-7 pb-2 px-3 bg-transparent text-sm text-gray-700 focus:outline-none focus:bg-gray-50 cursor-pointer appearance-none pr-8">
              <option value="">View All Stage</option>
              {STAGES.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Source */}
          <div className="flex-1 min-w-36 relative">
            <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">Lead Source</label>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
              className="w-full pt-7 pb-2 px-3 bg-transparent text-sm text-gray-700 focus:outline-none focus:bg-gray-50 cursor-pointer appearance-none pr-8">
              <option value="">View All Source</option>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Service */}
          <div className="flex-1 min-w-36 relative">
            <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">All Services</label>
            <select value={filterService} onChange={(e) => setFilterService(e.target.value)}
              className="w-full pt-7 pb-2 px-3 bg-transparent text-sm text-gray-700 focus:outline-none focus:bg-gray-50 cursor-pointer appearance-none pr-8">
              <option value="">All Services</option>
              {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Counsellor */}
          <div className="flex-1 min-w-36 relative">
            <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">Counsellor</label>
            <select value={filterCounsellor} onChange={(e) => setFilterCounsellor(e.target.value)}
              className="w-full pt-7 pb-2 px-3 bg-transparent text-sm text-gray-700 focus:outline-none focus:bg-gray-50 cursor-pointer appearance-none pr-8">
              <option value="">All Counsellors</option>
              {counsellors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* CRM Stage */}
          <div className="flex-1 min-w-36 relative">
            <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">CRM Stage</label>
            <select value={filterLeadStage} onChange={(e) => setFilterLeadStage(e.target.value)}
              className="w-full pt-7 pb-2 px-3 bg-transparent text-sm text-gray-700 focus:outline-none focus:bg-gray-50 cursor-pointer appearance-none pr-8">
              <option value="">All Stages</option>
              {LEAD_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="flex-2 min-w-52 relative">
            <label className="absolute left-10 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">Search</label>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, email, counsellor…"
              className="w-full pt-7 pb-2 pl-9 pr-8 bg-transparent text-sm text-gray-800 focus:outline-none focus:bg-gray-50 placeholder-gray-400" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X size={14} /></button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Filters:</span>
            {filterStage && <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full font-medium capitalize">{filterStage}<button onClick={() => setFilterStage("")}><X size={10} /></button></span>}
            {filterSource && <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-full font-medium capitalize">{filterSource.replace(/_/g, " ")}<button onClick={() => setFilterSource("")}><X size={10} /></button></span>}
            {filterService && <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full font-medium">{filterService}<button onClick={() => setFilterService("")}><X size={10} /></button></span>}
            {filterCounsellor && <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full font-medium">{counsellors.find((c) => c._id === filterCounsellor)?.name ?? "Counsellor"}<button onClick={() => setFilterCounsellor("")}><X size={10} /></button></span>}
            {filterLeadStage && <span className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${getLeadStageColor(filterLeadStage)}`}>{LEAD_STAGES.find((s) => s.value === filterLeadStage)?.label ?? filterLeadStage}<button onClick={() => setFilterLeadStage("")}><X size={10} /></button></span>}
            <button onClick={() => { setFilterStage(""); setFilterSource(""); setFilterService(""); setFilterCounsellor(""); setFilterLeadStage(""); }} className="ml-auto text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"><X size={11} /> Clear all</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" onClick={() => { setStageDropdownId(null); setCrmStageDropdownId(null); setMenuOpenId(null); }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Student", "Client", "Services", "CRM Stage", "Pipeline", "Follow-Up"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading students…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <UserCheck size={28} className="text-gray-300" />
                      <span className="text-sm">No students found</span>
                      {(search || activeFilterCount > 0) && (
                        <button onClick={() => { setSearch(""); setFilterStage(""); setFilterSource(""); setFilterService(""); setFilterCounsellor(""); }}
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800">
                          Clear search &amp; filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((student) => {
                const counsellorUser = student.counsellor as unknown as { name: string; _id: string } | undefined;
                const latestNote = student.notes?.[student.notes.length - 1];
                const initials = counsellorUser?.name
                  ? counsellorUser.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                  : null;
                const studentTag = `ETG-${student._id.slice(-4).toUpperCase()}`;
                const interestedService = (student as unknown as { interestedService?: string }).interestedService;
                const countryPart = student.countries?.[0]?.country;
                return (
                  <React.Fragment key={student._id}>
                    <tr className="hover:bg-gray-50/60 transition-colors align-top">

                      {/* STUDENT column */}
                      <td className="px-4 py-3.5 min-w-40">
                        <p className="font-bold text-gray-900 text-sm">{studentTag}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{formatStudentDateTime(student.createdAt)}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 capitalize">{student.source?.replace(/_/g, " ")}</p>
                      </td>

                      {/* CLIENT column */}
                      <td className="px-4 py-3.5 min-w-52">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-amber-400 text-sm">★</span>
                          <span className="font-semibold text-gray-900 text-sm">{student.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[12px] text-gray-500 mb-0.5">
                          <Phone size={10} className="text-gray-400 shrink-0" />
                          <span className="tabular-nums">{student.phone}</span>
                          {student.phone && (
                            <a
                              href={`https://wa.me/${student.phone.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Open WhatsApp"
                              className="ml-1 shrink-0 hover:opacity-80 transition-opacity"
                            >
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[12px] text-gray-500">
                          <Mail size={10} className="text-gray-400 shrink-0" />
                          <span className="truncate max-w-44">{student.email}</span>
                          {student.email && (
                            <a
                              href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(student.email)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Send Gmail"
                              className="ml-1 shrink-0 hover:opacity-80 transition-opacity"
                            >
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.907 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* SERVICES column */}
                      <td className="px-4 py-3.5 min-w-48">
                        <p className="text-sm font-medium text-gray-800">
                          {interestedService || <span className="text-gray-300">—</span>}
                          {countryPart && <span className="text-gray-500 font-normal"> - ({countryPart})</span>}
                        </p>
                        {student.countries && student.countries.length > 1 && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            +{student.countries.length - 1} more countr{student.countries.length - 1 > 1 ? "ies" : "y"}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1 tabular-nums">{formatDate(student.createdAt)}</p>
                      </td>

                      {/* CRM STAGE column */}
                      <td className="px-4 py-3.5 min-w-44">
                        {(() => {
                          const crmStage = (student as unknown as { stage?: string }).stage;
                          const stageInfo = LEAD_STAGES.find((s) => s.value === crmStage);
                          const dotColor = crmStage ? getLeadStageDotColor(crmStage) : "";
                          return (
                            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => canUpdateStage && openCrmStagePortal(e, student._id)}
                                className={`inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 shadow-sm border ${
                                  stageInfo
                                    ? `${stageInfo.color} border-transparent hover:shadow-md`
                                    : "bg-white border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500"
                                } ${canUpdateStage ? "cursor-pointer" : "cursor-default"}`}
                              >
                                {stageInfo
                                  ? <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} opacity-70`} />
                                  : <span className="text-[13px] leading-none opacity-50">+</span>
                                }
                                <span className="max-w-32 truncate">{stageInfo ? stageInfo.label : "Set Stage"}</span>
                                {canUpdateStage && <ChevronDown size={10} className={`shrink-0 opacity-50 transition-transform duration-200 ${crmStageDropdownId === student._id ? "rotate-180" : ""}`} />}
                              </button>
                              {/* Dropdown rendered as fixed portal – see bottom of component */}
                            </div>
                          );
                        })()}
                      </td>

                      {/* PIPELINE (currentStage) column */}
                      <td className="px-4 py-3.5 min-w-36">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => canUpdateStage && openPipelinePortal(e, student._id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${getStatusColor(student.currentStage)} ${canUpdateStage ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                          >
                            <span className="capitalize max-w-24 truncate">{student.currentStage}</span>
                            {canUpdateStage && <ChevronDown size={11} className={`shrink-0 transition-transform ${stageDropdownId === student._id ? "rotate-180" : ""}`} />}
                          </button>
                          {/* Dropdown rendered as fixed portal – see bottom of component */}
                        </div>
                      </td>

                      {/* FOLLOW-UP column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Link href={`/students/${student._id}#notes`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 border border-blue-100 hover:border-blue-300 px-2 py-1 rounded-md transition-colors whitespace-nowrap">
                            + Add
                          </Link>
                          {initials && (
                            <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0 border border-violet-200">
                              {initials}
                            </span>
                          )}
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setMenuOpenId(menuOpenId === student._id ? null : student._id)}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                              <MoreVertical size={14} />
                            </button>
                            {menuOpenId === student._id && (
                              <div className="absolute z-30 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-28">
                                <Link href={`/students/${student._id}`} className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-medium">View Details</Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Notes sub-row */}
                    {latestNote && (
                      <tr key={`${student._id}-note`} className="bg-gray-50/50">
                        <td colSpan={6} className="px-4 py-2 border-b border-gray-100">
                          <div className="flex items-start gap-1.5 text-[11px] text-gray-500">
                            <MessageSquare size={11} className="text-gray-400 mt-0.5 shrink-0" />
                            <span className="font-semibold text-gray-600">Notes:</span>
                            <span className="truncate max-w-2xl">{latestNote.content}</span>
                            {student.notes.length > 1 && (
                              <span className="ml-1 text-gray-400">+{student.notes.length - 1} more</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
              <span className="font-semibold text-gray-700">{students.length}</span> students
            </p>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Add New Student</h2>
                <p className="text-xs text-gray-500 mt-0.5">Fill in all required details to register a student</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* ── Personal Information ─────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Full Name *</label>
                    <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Aarav Sharma" className={FIELD} />
                  </div>
                  <div>
                    <label className={LABEL}>Phone Number *</label>
                    <input required value={form.phone} onChange={(e) => set("phone", e.target.value)}
                      placeholder="e.g. 9841000000" type="tel" className={FIELD} />
                  </div>
                  <div>
                    <label className={LABEL}>Email Address *</label>
                    <input required value={form.email} onChange={(e) => set("email", e.target.value)}
                      placeholder="student@email.com" type="email" className={FIELD} />
                  </div>
                  <div>
                    <label className={LABEL}>Date of Birth *</label>
                    <input required value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)}
                      type="date" className={FIELD} />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ── Interest Details ─────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Interest Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Source *</label>
                    <select required value={form.source} onChange={(e) => set("source", e.target.value)} className={FIELD}>
                      {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Interested Service *</label>
                    <select required value={form.interestedService} onChange={(e) => set("interestedService", e.target.value)} className={FIELD}>
                      <option value="">Select service</option>
                      {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Destination Country *</label>
                    <select required value={form.interestedCountry} onChange={(e) => set("interestedCountry", e.target.value)} className={FIELD}>
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ── Assignment ───────────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Branch *</label>
                    <select required value={form.branch} onChange={(e) => set("branch", e.target.value)} className={FIELD}>
                      <option value="">Select branch</option>
                      {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Assign Counsellor</label>
                    <select value={form.counsellorId} onChange={(e) => set("counsellorId", e.target.value)} className={FIELD}>
                      <option value="">Unassigned</option>
                      {counsellors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ── Notes ────────────────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Additional Notes</p>
                <label className={LABEL}>Comments / Notes</label>
                <textarea
                  value={form.comments}
                  onChange={(e) => set("comments", e.target.value)}
                  rows={3}
                  placeholder="Any additional notes about this student…"
                  className={`${FIELD} resize-none`}
                />
              </div>

              {/* Error */}
              {submitError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{submitError}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2">
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {submitting ? "Adding…" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM Stage dropdown portal */}
      {crmStageDropdownId && typeof document !== "undefined" && (() => {
        const dropStudent = students.find((s) => s._id === crmStageDropdownId);
        if (!dropStudent) return null;
        const dropCrmStage = (dropStudent as unknown as { stage?: string }).stage;
        const dropStageInfo = LEAD_STAGES.find((s) => s.value === dropCrmStage);
        const searched = crmStageSearch.trim().toLowerCase();
        const filteredStages = searched ? LEAD_STAGES.filter((s) => s.label.toLowerCase().includes(searched)) : null;
        return createPortal(
          <div
            ref={crmStagePanelRef}
            style={{ position: "fixed", top: crmStagePanelPos.top, left: crmStagePanelPos.left, zIndex: 9999 }}
            className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 w-80"
          >
            <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.12em]">Select CRM Stage</span>
              {dropStageInfo && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dropStageInfo.color}`}>{dropStageInfo.label}</span>
              )}
            </div>
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  autoFocus
                  value={crmStageSearch}
                  onChange={(e) => setCrmStageSearch(e.target.value)}
                  placeholder="Search stages…"
                  className="w-full pl-7 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 text-gray-800 placeholder-gray-300"
                />
                {crmStageSearch && (
                  <button onClick={() => setCrmStageSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={10} /></button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] py-1.5">
              {filteredStages ? (
                filteredStages.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-5">No stages match &ldquo;{crmStageSearch}&rdquo;</p>
                  : filteredStages.map((s) => {
                      const isActive = dropCrmStage === s.value;
                      return (
                        <button key={s.value} onClick={() => quickUpdateCrmStage(crmStageDropdownId, s.value)}
                          className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-3 transition-colors duration-100 ${isActive ? "bg-gray-50" : "hover:bg-gray-50/80"}`}
                        >
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${s.color}`}>{s.label}</span>
                          {isActive && <span className="w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center shrink-0"><svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>}
                        </button>
                      );
                    })
              ) : (
                LEAD_STAGE_GROUPS.map((group) => {
                  const groupStages = LEAD_STAGES.filter((s) => group.stages.includes(s.value));
                  return (
                    <div key={group.label}>
                      <div className="px-3.5 pt-3 pb-1 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${group.dot}`} />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{group.label}</span>
                      </div>
                      {groupStages.map((s) => {
                        const isActive = dropCrmStage === s.value;
                        return (
                          <button key={s.value} onClick={() => quickUpdateCrmStage(crmStageDropdownId, s.value)}
                            className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-3 transition-colors duration-100 ${isActive ? "bg-gray-50" : "hover:bg-gray-50/80"}`}
                          >
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${s.color}`}>{s.label}</span>
                            {isActive && <span className="w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center shrink-0"><svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
            {dropCrmStage && (
              <div className="border-t border-gray-100 px-3.5 py-2">
                <button onClick={() => quickUpdateCrmStage(crmStageDropdownId, "")}
                  className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors flex items-center gap-1.5">
                  <X size={10} /> Clear stage
                </button>
              </div>
            )}
          </div>,
          document.body
        );
      })()}

      {/* Pipeline dropdown portal */}
      {stageDropdownId && typeof document !== "undefined" && (() => {
        const dropStudent = students.find((s) => s._id === stageDropdownId);
        if (!dropStudent) return null;
        return createPortal(
          <div
            ref={pipelinePanelRef}
            style={{ position: "fixed", top: pipelinePanelPos.top, left: pipelinePanelPos.left, zIndex: 9999 }}
            className="bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 w-48 overflow-hidden"
          >
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.12em]">Select Pipeline</span>
            </div>
            <div className="py-1.5">
              {STAGES.map((s) => {
                const isActive = dropStudent.currentStage === s;
                return (
                  <button key={s} onClick={() => quickUpdateStage(stageDropdownId, s)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium capitalize transition-colors flex items-center justify-between ${
                      isActive ? "bg-gray-50 text-gray-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
                    }`}>
                    {s}
                    {isActive && <svg width="8" height="6" viewBox="0 0 8 6" fill="none" className="shrink-0"><path d="M1 3L3 5L7 1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
