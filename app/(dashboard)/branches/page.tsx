"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Branch { _id: string; name: string; location: string; phone?: string; email?: string; isActive: boolean; createdAt: string; }

export default function BranchesPage() {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", phone: "", email: "" });

  const fetchBranches = async () => {
    setLoading(true);
    const res = await fetch("/api/branches");
    const data = await res.json();
    setBranches(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ name: "", location: "", phone: "", email: "" });
    fetchBranches();
  };

  const isAdmin = session?.user?.role === "super_admin";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Building2 /> Branches</h1>
          <p className="text-gray-500 text-sm">{branches.length} branches</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Branch
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-gray-400 text-sm col-span-3 text-center py-8">Loading...</p>}
        {branches.map((b) => (
          <div key={b._id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Building2 size={20} className="text-blue-600" /></div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {b.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{b.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{b.location}</p>
            {b.phone && <p className="text-xs text-gray-400">📞 {b.phone}</p>}
            {b.email && <p className="text-xs text-gray-400">✉️ {b.email}</p>}
            <p className="text-xs text-gray-300 mt-2">Added {formatDate(b.createdAt)}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-lg">New Branch</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "Branch Name *", key: "name" },
                { label: "Location *", key: "location" },
                { label: "Phone", key: "phone" },
                { label: "Email", key: "email" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input required={label.includes("*")} value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
