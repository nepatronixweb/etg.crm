"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, X, FileText } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";

interface Application {
  _id: string;
  student: { name: string; email: string };
  country: string;
  universityName: string;
  course: string;
  status: string;
  submittedAt?: string;
  createdAt: string;
}

const APP_STATUSES = ["pending", "submitted", "accepted", "rejected", "deferred"];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...APP_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
];

const FIELD_CLASS =
  "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors";

const LABEL_CLASS = "block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide";

export default function ApplicationsPage() {
  const { data: session } = useSession();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<{ _id: string; name: string }[]>([]);
  const [form, setForm] = useState({ student: "", country: "", universityName: "", course: "", status: "pending" });

  const fetchApps = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/applications?${params}`);
    const data = await res.json();
    setApps(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
    fetch("/api/students").then((r) => r.json()).then((s) => setStudents(Array.isArray(s) ? s : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    fetchApps();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchApps();
  };

  const filtered = apps.filter((a) =>
    a.universityName?.toLowerCase().includes(search.toLowerCase()) ||
    a.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.country?.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = ["super_admin", "application_team", "counsellor"].includes(session?.user?.role || "");

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${filtered.length} of ${apps.length} applications`}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Add Application
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, university or country…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                  filterStatus === opt.value
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
                {["Student", "University", "Country", "Course", "Status", "Date", "Update Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading applications…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <FileText size={28} className="text-gray-300" />
                      <span className="text-sm">No applications found</span>
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
              {!loading && filtered.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-gray-600">
                          {app.student?.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{app.student?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 max-w-40 truncate">{app.universityName}</td>
                  <td className="px-4 py-3.5 text-gray-600">{app.country}</td>
                  <td className="px-4 py-3.5 text-gray-600 max-w-36 truncate">{app.course}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 tabular-nums whitespace-nowrap">
                    {formatDate(app.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    {canCreate && (
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app._id, e.target.value)}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-700 bg-white focus:outline-none focus:border-gray-500 transition-colors"
                      >
                        {APP_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
              <span className="font-semibold text-gray-700">{apps.length}</span> applications
            </p>
          </div>
        )}
      </div>

      {/* Add Application Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">New Application</h2>
                <p className="text-xs text-gray-500 mt-0.5">Attach an application to a student</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className={LABEL_CLASS}>Student <span className="text-gray-400 normal-case font-normal tracking-normal">*</span></label>
                <select
                  required
                  value={form.student}
                  onChange={(e) => setForm({ ...form, student: e.target.value })}
                  className={FIELD_CLASS}
                >
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              {[
                { label: "Country", key: "country" },
                { label: "University Name", key: "universityName" },
                { label: "Course", key: "course" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className={LABEL_CLASS}>
                    {label} <span className="text-gray-400 normal-case font-normal tracking-normal">*</span>
                  </label>
                  <input
                    required
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className={FIELD_CLASS}
                  />
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Create Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
