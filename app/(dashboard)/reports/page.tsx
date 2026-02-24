"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { BarChart3, Users, GraduationCap, FileText, TrendingUp, Percent } from "lucide-react";

const GRAY_PALETTE = ["#111827", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb"];
const CHART_TOOLTIP_STYLE = { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "12px" };

interface AnalyticsData {
  summary: { totalLeads: number; totalStudents: number; totalApplications: number; convertedLeads: number; conversionRate: number };
  leadsBySource: Array<{ _id: string; count: number }>;
  leadsByStatus: Array<{ _id: string; count: number }>;
  studentsByStage: Array<{ _id: string; count: number }>;
  applicationsByStatus: Array<{ _id: string; count: number }>;
  applicationsByCountry: Array<{ _id: string; count: number }>;
  counsellorPerformance: Array<{ _id: string; name: string; target: number; currentCount: number }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: "", to: "" });

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const res = await fetch(`/api/analytics?${params}`);
    const d = await res.json();
    if (!d.error) setData(d);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="inline-flex flex-col items-center gap-2 text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        <span className="text-sm">Loading analytics…</span>
      </div>
    </div>
  );
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
      <BarChart3 size={28} className="text-gray-300" />
      <span className="text-sm">Analytics not available</span>
    </div>
  );

  const sourceData = data.leadsBySource.map((x) => ({ name: x._id.replace(/_/g, " "), value: x.count }));
  const stageData = data.studentsByStage.map((x) => ({ name: x._id, count: x.count }));
  const countryData = data.applicationsByCountry.map((x) => ({ name: x._id, count: x.count }));
  const statusData = data.applicationsByStatus.map((x) => ({ name: x._id, count: x.count }));

  const SUMMARY_CARDS = [
    { label: "Total Leads", value: data.summary.totalLeads, icon: Users },
    { label: "Total Students", value: data.summary.totalStudents, icon: GraduationCap },
    { label: "Applications", value: data.summary.totalApplications, icon: FileText },
    { label: "Converted Leads", value: data.summary.convertedLeads, icon: TrendingUp },
    { label: "Conversion Rate", value: `${data.summary.conversionRate}%`, icon: Percent },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 border border-gray-200 rounded-md">
            <BarChart3 size={16} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Analytics & Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Comprehensive overview of operations</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1.5">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1.5">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Apply Filters
            </button>
            {(filters.from || filters.to) && (
              <button
                onClick={() => { setFilters({ from: "", to: "" }); setTimeout(fetchData, 0); }}
                className="px-4 py-2.5 border border-gray-300 hover:border-gray-500 text-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                <div className="p-1.5 bg-gray-100 border border-gray-200 rounded-md">
                  <Icon size={12} className="text-gray-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Leads by Source — Pie */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Leads by Source</h2>
            <p className="text-xs text-gray-500 mt-0.5">Distribution across acquisition channels</p>
          </div>
          {sourceData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={36}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={GRAY_PALETTE[i % GRAY_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                {sourceData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: GRAY_PALETTE[i % GRAY_PALETTE.length] }} />
                    <span className="text-xs text-gray-600 capitalize">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Students by Stage — Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Students by Stage</h2>
            <p className="text-xs text-gray-500 mt-0.5">Current pipeline breakdown</p>
          </div>
          {stageData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stageData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="count" fill="#111827" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Applications by Country — Horizontal Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Applications by Country</h2>
            <p className="text-xs text-gray-500 mt-0.5">Top destination countries</p>
          </div>
          {countryData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="count" fill="#374151" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Applications by Status — Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Applications by Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Outcome distribution</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="count" fill="#6b7280" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Counsellor Performance */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Counsellor Performance vs Target</h2>
          <p className="text-xs text-gray-500 mt-0.5">Current period progress</p>
        </div>
        {data.counsellorPerformance.length === 0 ? (
          <p className="text-gray-300 text-sm text-center py-8">No counsellor data available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {data.counsellorPerformance.map((c) => {
              const pct = c.target > 0 ? Math.min(100, Math.round((c.currentCount / c.target) * 100)) : 0;
              return (
                <div key={c._id}>
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-gray-600">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{c.name}</span>
                    </div>
                    <span className="text-xs tabular-nums text-gray-500">
                      {c.currentCount} / {c.target}
                      <span className="ml-1.5 font-semibold text-gray-900">{pct}%</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-gray-900" : pct >= 60 ? "bg-gray-600" : "bg-gray-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
