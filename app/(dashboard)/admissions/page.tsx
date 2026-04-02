"use client";
import { useEffect, useState, useCallback } from "react";
import {
  GraduationCap, Search, Phone, Mail, ExternalLink,
  ChevronDown, Building2, Calendar, MapPin, Layers,
  Filter, X, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { mergeRemarksForPipeline, type DeptRemarkLists } from "@/lib/admissionPipelineRemarks";
import { formatStandingLabel, standingInlineStyle, standingOptionPrefix } from "@/lib/studentStandingUi";

interface AdmissionEntry {
  _id: string;
  country: string;
  universityName?: string;
  stage?: string;
  pipeline?: string;
  standing?: string;
  remarks?: string;
  statusDate?: string;
  closed?: boolean;
}

interface Student {
  _id: string;
  name: string;
  phone: string;
  email: string;
  enrolled: boolean;
  standing: string;
  currentStage: string;
  countries: Array<{ country: string; status: string; universityName?: string; admissionStatus?: string }>;
  admissionDetails?: AdmissionEntry[];
  counsellor: { name: string };
  enrolledAt?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const PIPELINE_META: Record<string, { color: string; bg: string; border: string; dot: string; order: number }> = {
  Application: { color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200", dot: "bg-amber-400",  order: 1 },
  Offer:       { color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",  dot: "bg-blue-500",   order: 2 },
  GS:          { color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200",dot: "bg-purple-500", order: 3 },
  COE:         { color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-500",order: 4 },
  Visa:        { color: "text-teal-700",   bg: "bg-teal-50",    border: "border-teal-200",  dot: "bg-teal-500",   order: 5 },
};

const PIPELINE_STEPS = ["Application", "Offer", "GS", "COE", "Visa"];

const STANDING_META: Record<string, { bg: string; text: string; border: string; label: string }> = {
  hot:     { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "🔴 Hot"     },
  warm:    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "🟠 Warm"    },
  heated:  { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "🟡 Heated"  },
  cold:    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   label: "🔵 Cold"    },
  missed:  { bg: "bg-gray-100",  text: "text-gray-500",   border: "border-gray-200",   label: "⚪ Missed"  },
};

const COUNTRY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Australia:        { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
  "United Kingdom": { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200"   },
  Canada:           { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200"    },
  "United States":  { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200"    },
  "New Zealand":    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200"},
  Germany:          { bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200" },
  Finland:          { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200"   },
};
const defaultCountryColor = { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600","from-emerald-500 to-teal-600","from-violet-500 to-purple-600",
  "from-orange-500 to-red-500","from-pink-500 to-rose-600","from-amber-500 to-yellow-600",
  "from-cyan-500 to-blue-500","from-green-500 to-emerald-600",
];

function avatarGradient(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdmissionsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPipeline, setFilterPipeline] = useState("");
  const [filterStanding, setFilterStanding] = useState("");
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  const [appLeadStages, setAppLeadStages] = useState<{ value: string; label: string; group: string }[]>([]);
  const [appRemarkOptions, setAppRemarkOptions] = useState<string[]>([]);
  const [remarkOptionsByDept, setRemarkOptionsByDept] = useState<DeptRemarkLists>({
    application: [],
    admission: [],
    visa: [],
  });
  const [appStandings, setAppStandings] = useState<string[]>([]);
  const [countryStages, setCountryStages] = useState<Record<string, { value: string; label: string; pipeline: string }[]>>({});

  useEffect(() => {
    fetch("/api/students?enrolled=true")
      .then((r) => r.json())
      .then((d) => {
        const list: Student[] = Array.isArray(d) ? d : Array.isArray(d?.students) ? d.students : [];
        setStudents(list);
        // Expand all by default
        setExpandedStudents(new Set(list.map((s) => s._id)));
        setLoading(false);
      });
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((d) => {
        if (d?.leadStages?.length) setAppLeadStages(d.leadStages);
        const globalR = Array.isArray(d?.remarkOptions) && d.remarkOptions.length > 0 ? d.remarkOptions : [];
        setAppRemarkOptions(globalR);
        setRemarkOptionsByDept({
          application:
            Array.isArray(d?.remarkOptionsApplication) && d.remarkOptionsApplication.length > 0
              ? d.remarkOptionsApplication
              : globalR,
          admission:
            Array.isArray(d?.remarkOptionsAdmission) && d.remarkOptionsAdmission.length > 0
              ? d.remarkOptionsAdmission
              : globalR,
          visa:
            Array.isArray(d?.remarkOptionsVisa) && d.remarkOptionsVisa.length > 0 ? d.remarkOptionsVisa : globalR,
        });
        if (d?.leadStandings?.length) setAppStandings(d.leadStandings);
        if (d?.countryStages && typeof d.countryStages === "object") setCountryStages(d.countryStages);
      })
      .catch(() => {});
  }, []);

  const getStagesForCountry = useCallback((country?: string) => {
    if (country && countryStages[country]?.length) {
      return countryStages[country].map((s) => ({ value: s.value, label: s.label, group: s.pipeline }));
    }
    return appLeadStages;
  }, [countryStages, appLeadStages]);

  const handleStageChange = useCallback(
    (studentId: string, entryIndex: number, newStage: string, country: string) => {
      const today = new Date().toISOString().split("T")[0];
      const stageList = countryStages[country]?.length ? countryStages[country] : appLeadStages.map(s => ({ value: s.value, label: s.label, pipeline: s.group }));
      const pipeline = stageList.find(s => s.value === newStage)?.pipeline || "";

      const clone = students.map((s) => {
        if (s._id !== studentId) return s;
        const details = (s.admissionDetails || []).map((e, i) =>
          i !== entryIndex ? e : { ...e, stage: newStage, pipeline, remarks: "", standing: "", statusDate: today }
        );
        return { ...s, admissionDetails: details };
      });
      setStudents(clone);
      setTick((t) => t + 1);
      const changed = clone.find((s) => s._id === studentId);
      if (changed) {
        fetch(`/api/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admissionDetails: changed.admissionDetails }),
        }).catch(() => {});
      }
    },
    [students, countryStages, appLeadStages],
  );

  const handleFieldChange = useCallback(
    (studentId: string, entryIndex: number, field: string, value: string) => {
      const clone = students.map((s) => {
        if (s._id !== studentId) return s;
        const details = (s.admissionDetails || []).map((e, i) =>
          i !== entryIndex ? e : { ...e, [field]: value }
        );
        return { ...s, admissionDetails: details };
      });
      setStudents(clone);
      setTick((t) => t + 1);
      const changed = clone.find((s) => s._id === studentId);
      if (changed) {
        fetch(`/api/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admissionDetails: changed.admissionDetails }),
        }).catch(() => {});
      }
    },
    [students],
  );

  const toggleExpand = (id: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── stats ──
  const allEntries = students.flatMap((s) => s.admissionDetails || []);
  const pipelineCounts = PIPELINE_STEPS.reduce<Record<string, number>>((acc, p) => {
    acc[p] = allEntries.filter((e) => e.pipeline === p).length;
    return acc;
  }, {});

  // ── filter ──
  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q)
      || s.email.toLowerCase().includes(q)
      || (s.admissionDetails || []).some((e) =>
          [e.country, e.universityName].filter(Boolean).some((v) => (v || "").toLowerCase().includes(q))
        );
    const matchesPipeline = !filterPipeline || (s.admissionDetails || []).some((e) => e.pipeline === filterPipeline);
    const matchesStanding = !filterStanding || (s.admissionDetails || []).some((e) => e.standing === filterStanding);
    return matchesSearch && matchesPipeline && matchesStanding;
  });

  const activeFilters = [filterPipeline, filterStanding].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnptNiAwaDZ2LTZoLTZ2NnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/15 backdrop-blur rounded-xl border border-white/20">
                <GraduationCap size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admissions</h1>
                <p className="text-white/70 text-sm mt-0.5">
                  {loading ? "Loading…" : `${students.length} enrolled student${students.length !== 1 ? "s" : ""} · ${allEntries.length} admission entries`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur rounded-lg border border-white/20 text-white/90 text-xs font-semibold">
              <TrendingUp size={12} />
              Live Tracking
            </div>
          </div>
        </div>

        {/* Pipeline stats */}
        <div className="relative mt-5 grid grid-cols-5 gap-3">
          {PIPELINE_STEPS.map((p) => {
            const meta = PIPELINE_META[p];
            return (
              <button
                key={p}
                onClick={() => setFilterPipeline(filterPipeline === p ? "" : p)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                  filterPipeline === p
                    ? "bg-white text-gray-900 border-white shadow-lg scale-105"
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filterPipeline === p ? meta.dot : "bg-white/60"}`} />
                <span className="text-lg font-bold leading-none">{pipelineCounts[p] ?? 0}</span>
                <span className="text-[10px] font-semibold opacity-80">{p}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, country, university…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Standing filter */}
          <div className="relative">
            <select
              value={filterStanding}
              onChange={(e) => setFilterStanding(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">All Standings</option>
              {Object.entries(STANDING_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Active filter chips */}
          {activeFilters > 0 && (
            <div className="flex items-center gap-2">
              {filterPipeline && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${PIPELINE_META[filterPipeline]?.bg} ${PIPELINE_META[filterPipeline]?.color} ${PIPELINE_META[filterPipeline]?.border}`}>
                  {filterPipeline}
                  <button onClick={() => setFilterPipeline("")}><X size={10} /></button>
                </span>
              )}
              {filterStanding && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${STANDING_META[filterStanding]?.bg} ${STANDING_META[filterStanding]?.text} ${STANDING_META[filterStanding]?.border}`}>
                  {STANDING_META[filterStanding]?.label}
                  <button onClick={() => setFilterStanding("")}><X size={10} /></button>
                </span>
              )}
              <button onClick={() => { setFilterPipeline(""); setFilterStanding(""); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div className="space-y-4">
        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="inline-flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin border-[3px]" />
              <span className="text-sm font-medium">Loading admissions…</span>
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="inline-flex flex-col items-center gap-3 text-gray-400">
              <div className="p-4 bg-gray-100 rounded-2xl">
                <GraduationCap size={32} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">No students found</p>
                <p className="text-xs text-gray-400 mt-1">{search ? "Try adjusting your search or filters" : "No enrolled students yet"}</p>
              </div>
              {(search || activeFilters > 0) && (
                <button onClick={() => { setSearch(""); setFilterPipeline(""); setFilterStanding(""); }}
                  className="px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && filtered.map((s) => {
          const isExpanded = expandedStudents.has(s._id);
          const grad = avatarGradient(s.name);
          const entries = s.admissionDetails || [];
          const highestPipeline = entries.reduce<string>((best, e) => {
            const a = PIPELINE_META[best]?.order ?? 0;
            const b = PIPELINE_META[e.pipeline ?? ""]?.order ?? 0;
            return b > a ? (e.pipeline ?? "") : best;
          }, "");

          return (
            <div key={s._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">

              {/* ── Student Header ── */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
                    <span className="text-base font-bold text-white">{s.name.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/students/${s._id}`}
                        className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                        {s.name}
                      </Link>
                      {highestPipeline && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${PIPELINE_META[highestPipeline]?.bg} ${PIPELINE_META[highestPipeline]?.color} ${PIPELINE_META[highestPipeline]?.border}`}>
                          {highestPipeline}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-600 transition-colors">
                        <Phone size={9} className="text-gray-400" />
                        <span className="tabular-nums">{s.phone}</span>
                      </a>
                      <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-600 transition-colors max-w-48 truncate">
                        <Mail size={9} className="text-gray-400" />
                        <span className="truncate">{s.email}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                  {s.counsellor?.name && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 font-medium">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">{s.counsellor.name.charAt(0)}</span>
                      </div>
                      {s.counsellor.name}
                    </div>
                  )}
                  {s.enrolledAt && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={10} />
                      <span>{formatDate(s.enrolledAt)}</span>
                    </div>
                  )}
                  <Link href={`/students/${s._id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 rounded-xl border border-indigo-100 hover:border-indigo-200 text-xs font-semibold transition-all">
                    <ExternalLink size={11} />
                    Manage
                  </Link>
                  <button onClick={() => toggleExpand(s._id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                    <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {/* ── Admission Entries ── */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {entries.length === 0 ? (
                    <div className="px-5 py-6 flex items-center gap-3 text-gray-400">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <Building2 size={16} className="text-gray-300" />
                      </div>
                      <span className="text-xs font-medium">No admission entries — add from the student profile</span>
                    </div>
                  ) : (
                    <div>
                      {/* Column headers */}
                      <div className="grid grid-cols-[2fr_1.4fr_1.2fr_1fr_0.9fr_1.1fr] gap-0 px-5 py-2 bg-gray-50/80 border-b border-gray-100">
                        {["University & Country", "Stage", "Remarks", "Standing", "Pipeline", "Status Date"].map((col) => (
                          <div key={col} className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{col}</div>
                        ))}
                      </div>

                      {entries.map((entry, entryIndex) => {
                        const cc = COUNTRY_COLORS[entry.country] ?? defaultCountryColor;
                        const pm = PIPELINE_META[entry.pipeline ?? ""];
                        const stageList = getStagesForCountry(entry.country);
                        const stageLabel = stageList.find((s) => s.value === entry.stage)?.label ?? entry.stage ?? "";

                        return (
                          <div
                            key={`${s._id}-${entryIndex}-${tick}`}
                            className={`grid grid-cols-[2fr_1.4fr_1.2fr_1fr_0.9fr_1.1fr] gap-0 px-5 py-3 border-b border-gray-50 last:border-0 items-center transition-colors hover:bg-gray-50/60 ${entry.closed ? "opacity-40" : ""}`}
                          >
                            {/* University + Country */}
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-lg border ${cc.bg} ${cc.text} ${cc.border}`}>
                                {entry.country}
                              </span>
                              {entry.universityName ? (
                                <span className="text-xs font-semibold text-gray-700 truncate">{entry.universityName}</span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-gray-400 italic">
                                  <MapPin size={10} />No university
                                </span>
                              )}
                            </div>

                            {/* Stage */}
                            <div className="pr-2">
                              <select
                                value={entry.stage || ""}
                                disabled={entry.closed}
                                onChange={(e) => handleStageChange(s._id, entryIndex, e.target.value, entry.country)}
                                className="w-full text-[11px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer disabled:cursor-default transition-all hover:border-yellow-300 appearance-none"
                                title={stageLabel}
                              >
                                <option value="">— Select —</option>
                                {stageList.map((st) => (
                                  <option key={st.value} value={st.value}>{st.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Remarks */}
                            <div className="pr-2">
                              <select
                                value={entry.remarks || ""}
                                disabled={entry.closed}
                                onChange={(e) => handleFieldChange(s._id, entryIndex, "remarks", e.target.value)}
                                className="w-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer disabled:cursor-default transition-all hover:border-amber-300 appearance-none"
                              >
                                <option value="">— Remark —</option>
                                {mergeRemarksForPipeline(entry.pipeline, appRemarkOptions, remarkOptionsByDept).map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>

                            {/* Standing */}
                            <div className="pr-2">
                              <select
                                value={entry.standing || ""}
                                disabled={entry.closed}
                                onChange={(e) => handleFieldChange(s._id, entryIndex, "standing", e.target.value)}
                                className="w-full text-[11px] font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 cursor-pointer disabled:cursor-default transition-all appearance-none"
                                style={standingInlineStyle(entry.standing)}
                              >
                                <option value="">— Standing —</option>
                                {appStandings.map((st) => (
                                  <option key={st} value={st}>
                                    {standingOptionPrefix(st)}
                                    {formatStandingLabel(st)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Pipeline badge */}
                            <div className="pr-2">
                              {pm ? (
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${pm.bg} ${pm.color} ${pm.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`} />
                                  {entry.pipeline}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300 font-medium px-2">—</span>
                              )}
                            </div>

                            {/* Status Date */}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Calendar size={11} className="text-gray-400 shrink-0" />
                                <input
                                  type="date"
                                  value={entry.statusDate ? entry.statusDate.split("T")[0] : ""}
                                  disabled={entry.closed}
                                  onChange={(e) => handleFieldChange(s._id, entryIndex, "statusDate", e.target.value)}
                                  className="text-[11px] text-gray-700 font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-gray-50 hover:bg-white cursor-pointer disabled:cursor-default transition-all w-full"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Pipeline progress bar */}
                      {entries.length > 0 && entries.some(e => e.pipeline) && (
                        <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            {PIPELINE_STEPS.map((step, i) => {
                              const active = entries.some(e => e.pipeline === step);
                              const meta = PIPELINE_META[step];
                              const isLast = i === PIPELINE_STEPS.length - 1;
                              return (
                                <div key={step} className="flex items-center gap-1 flex-1 last:flex-none">
                                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    active ? `${meta.bg} ${meta.color} ${meta.border} border shadow-sm` : "bg-gray-100 text-gray-400 border border-gray-200"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${active ? meta.dot : "bg-gray-300"}`} />
                                    {step}
                                    {active && (
                                      <span className="font-black">{entries.filter(e => e.pipeline === step).length}</span>
                                    )}
                                  </div>
                                  {!isLast && (
                                    <div className={`flex-1 h-px ${active ? "bg-indigo-200" : "bg-gray-200"}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between py-2">
          <p className="text-xs text-gray-400">
            Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of <span className="font-semibold text-gray-600">{students.length}</span> students
          </p>
          <div className="flex items-center gap-1.5">
            {PIPELINE_STEPS.filter(p => pipelineCounts[p] > 0).map(p => (
              <span key={p} className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${PIPELINE_META[p].bg} ${PIPELINE_META[p].color} ${PIPELINE_META[p].border}`}>
                {pipelineCounts[p]} in {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
