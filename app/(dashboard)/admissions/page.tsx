"use client";
import { useEffect, useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import Link from "next/link";

interface Student {
  _id: string;
  name: string;
  email: string;
  enrolled: boolean;
  standing: string;
  currentStage: string;
  countries: Array<{ country: string; status: string; universityName?: string; admissionStatus?: string }>;
  counsellor: { name: string };
  enrolledAt?: string;
}

export default function AdmissionsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/students?enrolled=true")
      .then((r) => r.json())
      .then((d) => { setStudents(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.countries?.some((c) => c.country.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 border border-gray-200 rounded-md">
            <GraduationCap size={16} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Admissions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "Loading…" : `${filtered.length} of ${students.length} enrolled students`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, email or country…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Student", "Counsellor", "Countries & Universities", "Standing", "Enrolled", ""].map((h) => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h === "Standing" ? "min-w-[120px]" : ""}`}>
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
                      <span className="text-sm">Loading admissions…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <GraduationCap size={28} className="text-gray-300" />
                      <span className="text-sm">
                        {search ? "No matching students found" : "No enrolled students yet"}
                      </span>
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
                    <div className="space-y-1">
                      {s.countries?.map((c) => (
                        <div key={c.country} className="flex items-center gap-2">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-700 whitespace-nowrap">
                            {c.country}
                          </span>
                          {c.universityName && (
                            <span className="text-xs text-gray-500 truncate max-w-48">{c.universityName}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap capitalize border ${
                      s.standing === "heated" ? "bg-red-100 text-red-700 border-red-200" :
                      s.standing === "hot" ? "bg-orange-100 text-orange-700 border-orange-200" :
                      s.standing === "warm" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                      s.standing === "out_of_contact" ? "bg-gray-100 text-gray-700 border-gray-200" :
                      "bg-blue-100 text-blue-700 border-blue-200"
                    }`}>
                      {s.standing ? s.standing.replace(/_/g, " ") : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {s.enrolledAt && (
                      <span className="text-xs text-gray-600">
                        {new Date(s.enrolledAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
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
