"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Users } from "lucide-react";
import { formatDate, getRoleBadgeColor, getRoleLabel } from "@/lib/utils";
import { UserRole } from "@/types";

interface User { _id: string; name: string; email: string; role: UserRole; branch: { name: string } | null; target?: number; currentCount?: number; isActive: boolean; createdAt: string; }

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState<{ _id: string; name: string }[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "counsellor" as UserRole, branch: "", phone: "", dateOfBirth: "", target: "0" });

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    fetch("/api/branches").then((r) => r.json()).then(setBranches);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, target: Number(form.target) }) });
    setShowForm(false);
    setForm({ name: "", email: "", password: "", role: "counsellor", branch: "", phone: "", dateOfBirth: "", target: "0" });
    fetchUsers();
  };

  const deactivate = async (id: string) => {
    if (confirm("Deactivate this user?")) {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      fetchUsers();
    }
  };

  const ROLES: UserRole[] = ["counsellor", "telecaller", "front_desk", "application_team", "admission_team", "visa_team", "super_admin"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users /> Users</h1>
          <p className="text-gray-500 text-sm">{users.length} total team members</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Email", "Role", "Branch", "Target", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>}
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.branch?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.role === "counsellor" ? `${user.currentCount || 0}/${user.target || 0}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${user.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    {user._id !== session?.user?.id && user.isActive && (
                      <button onClick={() => deactivate(user._id)} className="text-red-500 hover:underline text-xs">Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-lg">New Team Member</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "Full Name *", key: "name", type: "text" },
                { label: "Email *", key: "email", type: "email" },
                { label: "Password *", key: "password", type: "password" },
                { label: "Phone", key: "phone", type: "tel" },
                { label: "Date of Birth", key: "dateOfBirth", type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} required={label.includes("*")} value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch *</label>
                <select required value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select branch</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              {form.role === "counsellor" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target (Visa Goal)</label>
                  <input type="number" min="0" value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
