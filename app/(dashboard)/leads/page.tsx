"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, X, Users, Paperclip, FileText, Trash2, SlidersHorizontal, ChevronDown } from "lucide-react";
import { formatDate, getStatusColor, COUNTRIES, SERVICES } from "@/lib/utils";
import { ILead, LeadSource, LeadStatus } from "@/types";
import Link from "next/link";

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "walk_in", label: "Walk-in" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

const FIELD_CLASS =
  "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors";

const LABEL_CLASS = "block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide";

export default function LeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [branches, setBranches] = useState<{ _id: string; name: string }[]>([]);
  const [counsellors, setCounsellors] = useState<{ _id: string; name: string }[]>([]);
  const [paymentQr, setPaymentQr] = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", email: "", dateOfBirth: "",
    source: "walk_in" as LeadSource, interestedService: "",
    interestedCountry: "", branch: session?.user?.branch || "",
    status: "warm" as LeadStatus, assignedTo: "", assignmentMethod: "manual",
    comments: "",
    // Parent information
    parentName: "", parentPhone1: "", parentPhone2: "",
    // Student academic information
    academicScore: "", academicInstitution: "", temporaryAddress: "", permanentAddress: "",
    // IELTS / PTE information
    examType: "", examScore: "", examJoinDate: "", examStartDate: "", examEndDate: "",
    examPaymentMethod: "", examEstimatedDate: "",
  });

  const fetchLeads = async () => {
    setLoading(true);
    const res = await fetch(`/api/leads`);
    const data = await res.json();
    setLeads(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
    fetch("/api/branches").then((r) => r.json()).then(setBranches);
    fetch("/api/users").then((r) => r.json()).then((u) =>
      setCounsellors(Array.isArray(u) ? u.filter((x: { role: string }) => x.role === "counsellor") : [])
    );
    fetch("/api/settings/app").then((r) => r.json()).then((d) => {
      if (d?.paymentQrPath) setPaymentQr(d.paymentQrPath);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setFilterStatus("");
    setFilterCountry("");
    setFilterAssignedTo("");
    setFilterSource("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const activeFilterCount = [filterStatus, filterCountry, filterAssignedTo, filterSource, filterDateFrom || filterDateTo]
    .filter(Boolean).length;

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...files.filter((f) => !existingNames.has(f.name))];
    });
    e.target.value = "";
  };

  const removeFile = (name: string) =>
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));

  const resetForm = () => {
    setForm({
      name: "", phone: "", email: "", dateOfBirth: "",
      source: "walk_in", interestedService: "", interestedCountry: "",
      branch: session?.user?.branch || "", status: "warm",
      assignedTo: "", assignmentMethod: "manual", comments: "",
      parentName: "", parentPhone1: "", parentPhone2: "",
      academicScore: "", academicInstitution: "", temporaryAddress: "", permanentAddress: "",
      examType: "", examScore: "", examJoinDate: "", examStartDate: "", examEndDate: "",
      examPaymentMethod: "", examEstimatedDate: "",
    });
    setAttachedFiles([]);
    setSubmitError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    // Strip empty string ObjectId fields so MongoDB doesn't reject them
    const payload: Record<string, unknown> = { ...form };
    if (!payload.assignedTo) delete payload.assignedTo;
    if (!payload.branch) delete payload.branch;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const leadId = data._id || data.lead?._id;
        // Upload attached files one by one
        if (leadId && attachedFiles.length > 0) {
          await Promise.all(
            attachedFiles.map((file) => {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("leadId", leadId);
              fd.append("name", file.name);
              return fetch("/api/documents", { method: "POST", body: fd });
            })
          );
        }
        setShowForm(false);
        fetchLeads();
        resetForm();
      } else {
        setSubmitError(data?.error || "Failed to create lead. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const assignedName = (l.assignedTo as unknown as { name: string } | undefined)?.name ?? "";
    const dateStr = formatDate(l.createdAt).toLowerCase();
    const matchesSearch =
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.interestedCountry || "").toLowerCase().includes(q) ||
      (l.status || "").replace("_", " ").toLowerCase().includes(q) ||
      assignedName.toLowerCase().includes(q) ||
      dateStr.includes(q);
    const matchesStatus = !filterStatus || l.status === filterStatus;
    const matchesCountry = !filterCountry || l.interestedCountry === filterCountry;
    const matchesAssigned = !filterAssignedTo ||
      (l.assignedTo as unknown as { _id: string } | undefined)?._id === filterAssignedTo;
    const matchesSource = !filterSource || l.source === filterSource;
    const leadDate = new Date(l.createdAt);
    const matchesDateFrom = !filterDateFrom || leadDate >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || leadDate <= new Date(filterDateTo + "T23:59:59");
    return matchesSearch && matchesStatus && matchesCountry && matchesAssigned && matchesSource && matchesDateFrom && matchesDateTo;
  });

  const canCreate = ["super_admin", "telecaller", "front_desk", "counsellor"].includes(session?.user?.role || "");
  const canAssign = ["super_admin", "telecaller", "front_desk"].includes(session?.user?.role || "");

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${filtered.length} of ${leads.length} leads`}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Add Lead
          </button>
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Top row */}
        <div className="flex items-center gap-3 p-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, country, status, assigned to, date…"
              className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md border text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-800"
            }`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={13} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                >
                  <option value="">All Statuses</option>
                  <option value="heated">Heated</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="out_of_contact">Out of Contact</option>
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Country</label>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                >
                  <option value="">All Countries</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assigned To</label>
                <select
                  value={filterAssignedTo}
                  onChange={(e) => setFilterAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                >
                  <option value="">All Counsellors</option>
                  {counsellors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Source</label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                >
                  <option value="">All Sources</option>
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{activeFilterCount}</span> filter{activeFilterCount > 1 ? "s" : ""} active
                </p>
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <X size={12} /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Name", "Phone", "Source", "Country", "Status", "Assigned To", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading leads…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <Users size={28} className="text-gray-300" />
                      <span className="text-sm">No leads found</span>
                      {(search || activeFilterCount > 0) && (
                        <button
                          onClick={() => { setSearch(""); clearFilters(); }}
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800"
                        >
                          Clear search &amp; filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-gray-600">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 tabular-nums">{lead.phone}</td>
                  <td className="px-4 py-3.5 text-gray-600 capitalize">{lead.source?.replace("_", " ")}</td>
                  <td className="px-4 py-3.5 text-gray-600">{lead.interestedCountry || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(lead.status)}`}>
                      {lead.status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {(lead.assignedTo as unknown as { name: string })?.name || (
                      <span className="text-gray-300">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 tabular-nums whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/leads/${lead._id}`}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-2.5 py-1 rounded transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
              <span className="font-semibold text-gray-700">{leads.length}</span> leads
            </p>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Add New Lead</h2>
                <p className="text-xs text-gray-500 mt-0.5">Fill in the details to register a new lead</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Personal Info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", key: "name", type: "text", required: true },
                    { label: "Phone Number", key: "phone", type: "tel", required: true },
                    { label: "Email Address", key: "email", type: "email", required: true },
                    { label: "Date of Birth", key: "dateOfBirth", type: "date", required: true },
                  ].map(({ label, key, type, required }) => (
                    <div key={key}>
                      <label className={LABEL_CLASS}>
                        {label} {required && <span className="text-gray-400 normal-case font-normal tracking-normal">*</span>}
                      </label>
                      <input
                        type={type}
                        required={required}
                        value={(form as Record<string, string>)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className={FIELD_CLASS}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Interest Info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Interest Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Source <span className="text-gray-400 normal-case font-normal tracking-normal">*</span></label>
                    <select
                      required
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
                      className={FIELD_CLASS}
                    >
                      {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>Status <span className="text-gray-400 normal-case font-normal tracking-normal">*</span></label>
                    <select
                      required
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                      className={FIELD_CLASS}
                    >
                      <option value="warm">Warm</option>
                      <option value="hot">Hot</option>
                      <option value="heated">Heated</option>
                      <option value="out_of_contact">Out of Contact</option>
                    </select>
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>Interested Country <span className="text-gray-400 normal-case font-normal tracking-normal">*</span></label>
                    <select
                      required
                      value={form.interestedCountry}
                      onChange={(e) => setForm({ ...form, interestedCountry: e.target.value })}
                      className={FIELD_CLASS}
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>Interested Service <span className="text-gray-400 normal-case font-normal tracking-normal">*</span></label>
                    <select
                      required
                      value={form.interestedService}
                      onChange={(e) => setForm({ ...form, interestedService: e.target.value })}
                      className={FIELD_CLASS}
                    >
                      <option value="">Select service</option>
                      {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Assignment Info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Branch <span className="text-gray-400 normal-case font-normal tracking-normal">*</span></label>
                    <select
                      required
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                      className={FIELD_CLASS}
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>

                  {canAssign && (
                    <>
                      <div>
                        <label className={LABEL_CLASS}>Assignment Method</label>
                        <select
                          value={form.assignmentMethod}
                          onChange={(e) => setForm({ ...form, assignmentMethod: e.target.value })}
                          className={FIELD_CLASS}
                        >
                          <option value="manual">Manual</option>
                          <option value="round_robin">Round Robin (Auto)</option>
                        </select>
                      </div>

                      {form.assignmentMethod === "manual" && (
                        <div>
                          <label className={LABEL_CLASS}>Assign to Counsellor</label>
                          <select
                            value={form.assignedTo}
                            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                            className={FIELD_CLASS}
                          >
                            <option value="">Unassigned</option>
                            {counsellors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Parent Information */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Parent Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>Parent&apos;s Full Name</label>
                    <input
                      type="text"
                      value={form.parentName}
                      onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                      placeholder="Parent or guardian name"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Parent Phone Number 1</label>
                    <input
                      type="tel"
                      value={form.parentPhone1}
                      onChange={(e) => setForm({ ...form, parentPhone1: e.target.value })}
                      placeholder="Primary contact"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Parent Phone Number 2</label>
                    <input
                      type="tel"
                      value={form.parentPhone2}
                      onChange={(e) => setForm({ ...form, parentPhone2: e.target.value })}
                      placeholder="Secondary contact"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Student Academic Information */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Student Academic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Scored GPA / Percentage</label>
                    <input
                      type="text"
                      value={form.academicScore}
                      onChange={(e) => setForm({ ...form, academicScore: e.target.value })}
                      placeholder="e.g. 3.8 GPA or 85%"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Academic School / College Name</label>
                    <input
                      type="text"
                      value={form.academicInstitution}
                      onChange={(e) => setForm({ ...form, academicInstitution: e.target.value })}
                      placeholder="Institution name"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Temporary Address</label>
                    <input
                      type="text"
                      value={form.temporaryAddress}
                      onChange={(e) => setForm({ ...form, temporaryAddress: e.target.value })}
                      placeholder="Current / temporary address"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Permanent Address</label>
                    <input
                      type="text"
                      value={form.permanentAddress}
                      onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })}
                      placeholder="Permanent home address"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* IELTS / PTE Information */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">IELTS / PTE Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Exam Type</label>
                    <select
                      value={form.examType}
                      onChange={(e) => setForm({ ...form, examType: e.target.value })}
                      className={FIELD_CLASS}
                    >
                      <option value="">None / Not Applicable</option>
                      <option value="IELTS">IELTS</option>
                      <option value="PTE">PTE</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Score (if already taken)</label>
                    <input
                      type="text"
                      value={form.examScore}
                      onChange={(e) => setForm({ ...form, examScore: e.target.value })}
                      placeholder="e.g. 6.5 band or 65 PTE"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Join Date</label>
                    <input
                      type="date"
                      value={form.examJoinDate}
                      onChange={(e) => setForm({ ...form, examJoinDate: e.target.value })}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Start Date</label>
                    <input
                      type="date"
                      value={form.examStartDate}
                      onChange={(e) => setForm({ ...form, examStartDate: e.target.value })}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>End Date</label>
                    <input
                      type="date"
                      value={form.examEndDate}
                      onChange={(e) => setForm({ ...form, examEndDate: e.target.value })}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Payment Method</label>
                    <select
                      value={form.examPaymentMethod}
                      onChange={(e) => setForm({ ...form, examPaymentMethod: e.target.value })}
                      className={FIELD_CLASS}
                    >
                      <option value="">Select method</option>
                      <option value="online">Online</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  {form.examPaymentMethod === "online" && (
                    <div className="sm:col-span-2">
                      {paymentQr ? (
                        <div className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Scan to Pay</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={paymentQr} alt="Payment QR Code" className="w-40 h-40 object-contain rounded-md border border-gray-200 bg-white p-1" />
                          <p className="text-xs text-gray-400">Use the company QR code to make the payment</p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          No payment QR code configured. Please ask an admin to upload one in Settings → Branding.
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className={LABEL_CLASS}>Exam Estimated / Booked Date</label>
                    <input
                      type="date"
                      value={form.examEstimatedDate}
                      onChange={(e) => setForm({ ...form, examEstimatedDate: e.target.value })}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Documents */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Documents</p>
                <div className="space-y-3">
                  <label
                    htmlFor="lead-file-upload"
                    className="flex items-center gap-2.5 border-2 border-dashed border-gray-200 rounded-lg px-4 py-4 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <Paperclip size={16} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Attach files</p>
                      <p className="text-xs text-gray-400 mt-0.5">Images (JPG, PNG, WEBP) and PDF — multiple allowed</p>
                    </div>
                    <input
                      id="lead-file-upload"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>

                  {attachedFiles.length > 0 && (
                    <ul className="space-y-1.5">
                      {attachedFiles.map((file) => (
                        <li key={file.name} className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                          {file.type === "application/pdf" ? (
                            <FileText size={15} className="text-red-400 shrink-0" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-7 h-7 object-cover rounded border border-gray-200 shrink-0"
                            />
                          )}
                          <span className="flex-1 text-xs text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(file.name)}
                            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Notes */}
              <div>
                <label className={LABEL_CLASS}>Comments / Notes</label>
                <textarea
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes about this lead…"
                  className={`${FIELD_CLASS} resize-none`}
                />
              </div>

              {/* Error */}
              {submitError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{submitError}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {submitting ? "Creating…" : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
