"use client";
import { useEffect, useState } from "react";
import { Plane, Search, Phone, Mail } from "lucide-react";
import Link from "next/link";

interface Student {
  _id: string;
  name: string;
  phone: string;
  email: string;
  currentStage: string;
  countries: Array<{ country: string; status: string; universityName?: string; visaStatus?: string; visaApprovedAt?: string }>;
  admissionDetails?: Array<{
    country?: string;
    universityName?: string;
    location?: string;
    courses?: Array<{ name?: string; intakeQuarter?: string; intakeYear?: string }>;
  }>;
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
    const q = search.toLowerCase();
    const destinationMatches = s.countries?.some((c) =>
      [c.country, c.universityName]
        .filter(Boolean)
        .some((v) => (v || "").toLowerCase().includes(q))
    ) ?? false;
    const admissionMatches = s.admissionDetails?.some((entry) => {
      const baseMatch = [entry.country, entry.universityName, entry.location]
        .filter(Boolean)
        .some((v) => (v || "").toLowerCase().includes(q));
      const intakeMatch = entry.courses?.some((course) => {
        const intakeText = `${course.intakeQuarter || ""} ${course.intakeYear || ""}`.trim().toLowerCase();
        return ((course.name || "").toLowerCase().includes(q) || intakeText.includes(q));
      }) ?? false;
      return baseMatch || intakeMatch;
    }) ?? false;

    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      destinationMatches ||
      admissionMatches;

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
              placeholder="Search by student, destination, university or intake…"
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
                        <Link href={`/students/${s._id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline underline-offset-2 transition-colors">{s.name}</Link>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                          <Phone size={9} className="text-gray-400 shrink-0" />
                          <a href={`tel:${s.phone}`} className="tabular-nums hover:text-blue-600 hover:underline transition-colors">{s.phone}</a>
                          {s.phone && (
                            <a href={`https://wa.me/${s.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Open WhatsApp" className="ml-1 shrink-0 hover:opacity-80 transition-opacity">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Mail size={9} className="text-gray-400 shrink-0" />
                          <a href={`mailto:${s.email}`} className="truncate max-w-36 hover:text-blue-600 hover:underline transition-colors">{s.email}</a>
                          {s.email && (
                            <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(s.email)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Send Gmail" className="ml-1 shrink-0 hover:opacity-80 transition-opacity">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.907 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>
                            </a>
                          )}
                        </div>
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
