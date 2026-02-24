"use client";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { ScrollText, Search } from "lucide-react";

interface Log {
  _id: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  targetName?: string;
  details?: string;
  createdAt: string;
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-gray-900 text-white",
  UPDATE: "bg-gray-600 text-white",
  DELETE: "bg-gray-200 text-gray-800",
  UPLOAD: "bg-gray-700 text-white",
  CONVERT: "bg-gray-800 text-white",
  VISA_APPROVED: "bg-gray-900 text-white",
  NOTE: "bg-gray-100 text-gray-700",
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (filterModule) params.set("module", filterModule);
    const res = await fetch(`/api/activity-logs?${params}`);
    const data = await res.json();
    if (!data.error) { setLogs(data.logs); setTotal(data.total); setPages(data.pages); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(1); setPage(1); }, [filterModule]);

  const MODULES = ["All", "Leads", "Students", "Documents", "Applications", "Users", "Branches"];

  const visible = search
    ? logs.filter((l) =>
        l.userName.toLowerCase().includes(search.toLowerCase()) ||
        l.module.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.targetName || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 border border-gray-200 rounded-md">
            <ScrollText size={16} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Activity Logs</h1>
            <p className="text-sm text-gray-500 mt-0.5">{loading ? "Loading…" : `${total} total entries`}</p>
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
              placeholder="Search by user, module, action or target…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {MODULES.map((m) => {
              const active = m === "All" ? !filterModule : filterModule === m;
              return (
                <button
                  key={m}
                  onClick={() => setFilterModule(m === "All" ? "" : m)}
                  className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-800"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["User", "Role", "Action", "Module", "Target", "Details", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading logs…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                      <ScrollText size={28} className="text-gray-300" />
                      <span className="text-sm">{search ? "No matching logs found" : "No logs found"}</span>
                      {search && (
                        <button onClick={() => setSearch("")} className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800">
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && visible.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-gray-600">{log.userName.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-gray-900 whitespace-nowrap">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-500 capitalize">{log.userRole.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${ACTION_STYLES[log.action] || "bg-gray-100 text-gray-600"}` }>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-700">{log.module}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{log.targetName || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-gray-500 max-w-56 truncate">{log.details || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap tabular-nums">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-700">{visible.length}</span> of{" "}
            <span className="font-semibold text-gray-700">{total}</span> entries
          </p>
          {pages > 1 && (
            <div className="flex gap-1.5">
              <button
                onClick={() => { const p = page - 1; setPage(p); fetchLogs(p); }}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500 tabular-nums">{page} / {pages}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); fetchLogs(p); }}
                disabled={page === pages}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
