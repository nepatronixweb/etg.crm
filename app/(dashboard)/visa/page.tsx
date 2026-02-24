"use client";
import { useEffect, useState } from "react";
import { Plane, Search } from "lucide-react";
import Link from "next/link";

interface Student {
  _id: string;
  name: string;
  email: string;
  currentStage: string;
  countries: Array<{ country: string; status: string; visaStatus?: string; visaApprovedAt?: string }>;
  counsellor: { name: string };
}

const VISA_FILTERS = ["All", "Approved", "Pending"] as const;
type VisaFilter = (typeof VISA_FILTERS)[number];

export default function VisaPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visaFilter, setVisaFilter] = useState<VisaFilter>("All");

  useEffect(() => {
    fetch("/api/students?stage=visa")
      .then((r) => r.json())
      .then((d) => { setStudents(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.countries?.some((c) => c.country.toLowerCase().includes(search.toLowerCase()));

    const matchesVisa =
      visaFilter === "All" ||
      (visaFilter === "Approved" && s.countries?.some((c) => c.visaApprovedAt)) ||
      (visaFilter === "Pending" && s.countries?.every((c) => !c.visaApprovedAt));

    return matchesSearch && matchesVisa;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 border border-gray-200 rounded-md">
            <Plane size={16} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Visa Processing</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "Loading…" : `${filtered.length} of ${students.length} students in visa stage`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, email or country…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {VISA_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setVisaFilter(f)}
                className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                  visaFilter === f
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-800"
                }`}
              >
                {f}
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
                {["Student", "Counsellor", "Countries", "Visa Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading visa records…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <Plane size={28} className="text-gray-300" />
                      <span className="text-sm">
                        {search || visaFilter !== "All" ? "No matching students found" : "No students in visa stage"}
                      </span>
                      {(search || visaFilter !== "All") && (
                        <button
                          onClick={() => { setSearch(""); setVisaFilter("All"); }}
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-gray-600">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {s.counsellor?.name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {s.countries?.map((c) => (
                        <span
                          key={c.country}
                          className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-700"
                        >
                          {c.country}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-1">
                      {s.countries?.map((c) => (
                        <div key={c.country} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-16 shrink-0">{c.country}</span>
                          {c.visaApprovedAt ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-900 text-white">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-600">
                              Pending
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/students/${s._id}`}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-2.5 py-1 rounded transition-colors"
                    >
                      Manage
                    </Link>
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
              <span className="font-semibold text-gray-700">{students.length}</span> students
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
