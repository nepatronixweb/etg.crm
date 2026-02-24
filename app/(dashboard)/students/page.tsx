"use client";
import { useEffect, useState } from "react";
import { formatDate, getStatusColor, COUNTRIES, SERVICES } from "@/lib/utils";
import { IStudent } from "@/types";
import Link from "next/link";
import { Search, UserCheck, Plus, X } from "lucide-react";
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

const STAGE_OPTIONS = [
  { value: "", label: "All Stages" },
  ...STAGES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
];

export default function StudentsPage() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<IStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
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
    const res = await fetch(`/api/students?${params}`);
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStudents(); }, [filterStage]);

  const openModal = async () => {
    setForm({ ...defaultForm, branch: session?.user?.branch || "" });
    setSubmitError("");
    setShowModal(true);
    if (branches.length === 0) {
      const [br, us] = await Promise.all([
        fetch("/api/branches").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
      ]);
      setBranches(Array.isArray(br) ? br : []);
      setCounsellors(Array.isArray(us) ? us.filter((u: { role: string }) => u.role === "counsellor") : []);
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

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

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
        {canCreate && (
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Add Student
          </button>
        )}
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

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
          </div>

          {/* Stage filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {STAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterStage(opt.value)}
                className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                  filterStage === opt.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Name", "Phone", "Email", "Counsellor", "Stage", "Countries", "Branch", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading students…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <UserCheck size={28} className="text-gray-300" />
                      <span className="text-sm">No students found</span>
                      {search && (
                        <button
                          onClick={() => setSearch("")}
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((student) => {
                const counsellor = student.counsellor as unknown as { name: string };
                const branch = student.branch as unknown as { name: string };
                const countryList = student.countries?.map((c) => c.country).join(", ");
                return (
                  <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-gray-600">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 tabular-nums">{student.phone}</td>
                    <td className="px-4 py-3.5 text-gray-600">{student.email}</td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {counsellor?.name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(student.currentStage)}`}>
                        {student.currentStage}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 max-w-40 truncate">
                      {countryList || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {branch?.name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums whitespace-nowrap">
                      {formatDate(student.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/students/${student._id}`}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-2.5 py-1 rounded transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
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
    </div>
  );
}
