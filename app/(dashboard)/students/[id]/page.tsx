"use client";
import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Upload, FileText, CheckCircle, Plus } from "lucide-react";
import { formatDate, formatDateTime, getStatusColor, getRoleLabel, COUNTRIES } from "@/lib/utils";
import Link from "next/link";

interface StudentDetail {
  _id: string;
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  source: string;
  currentStage: string;
  counsellor: { name: string; email: string };
  branch: { name: string };
  countries: Array<{ country: string; status: string; universityName?: string; visaStatus?: string; visaApprovedAt?: string }>;
  notes: Array<{ _id: string; content: string; addedByName: string; addedByRole: string; createdAt: string }>;
}

interface Document {
  _id: string;
  name: string;
  originalName: string;
  filePath: string;
  country: string;
  fileSize: number;
  uploadedBy: { name: string };
  isVerified: boolean;
  createdAt: string;
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [docName, setDocName] = useState("");
  const [addingCountry, setAddingCountry] = useState(false);
  const [newCountry, setNewCountry] = useState("");

  const fetchData = async () => {
    const [sRes, dRes] = await Promise.all([
      fetch(`/api/students/${id}`),
      fetch(`/api/documents?student=${id}`),
    ]);
    const sData = await sRes.json();
    const dData = await dRes.json();
    setStudent(sData);
    setDocs(Array.isArray(dData) ? dData : []);
    if (sData.countries?.length > 0) setSelectedCountry(sData.countries[0].country);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [id]);

  const addNote = async () => {
    if (!note.trim()) return;
    await fetch(`/api/students/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: note }) });
    setNote("");
    fetchData();
  };

  const updateStage = async (stage: string) => {
    await fetch(`/api/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStage: stage }) });
    fetchData();
  };

  const approveVisa = async (country: string) => {
    await fetch(`/api/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visaApproved: true, country }) });
    fetchData();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCountry || !docName) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentId", id);
    formData.append("country", selectedCountry);
    formData.append("name", docName);
    await fetch("/api/documents", { method: "POST", body: formData });
    setUploading(false);
    setDocName("");
    e.target.value = "";
    fetchData();
  };

  const addCountry = async () => {
    if (!newCountry) return;
    const existing = student?.countries.map((c) => c.country) || [];
    const updated = [...existing.map((c) => ({ country: c })), { country: newCountry }];
    await fetch(`/api/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countries: updated }) });
    setNewCountry("");
    setAddingCountry(false);
    fetchData();
  };

  if (!student) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  const STAGES = ["counsellor", "application", "admission", "visa", "completed"];
  const canUpload = ["super_admin", "counsellor", "application_team"].includes(session?.user?.role || "");
  const canNote = ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"].includes(session?.user?.role || "");
  const canStage = ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"].includes(session?.user?.role || "");
  const canVisa = ["super_admin", "visa_team"].includes(session?.user?.role || "");

  const filteredDocs = docs.filter((d) => !selectedCountry || d.country === selectedCountry);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/students" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
          <p className="text-gray-500 text-sm">Student Profile</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(student.currentStage)}`}>
          {student.currentStage}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Student Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Phone", student.phone], ["Email", student.email],
                ["DOB", student.dateOfBirth], ["Source", student.source?.replace("_", " ")],
                ["Counsellor", student.counsellor?.name], ["Branch", student.branch?.name],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium text-gray-800 mt-1 capitalize">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Countries</h2>
              {canStage && (
                <button onClick={() => setAddingCountry(true)} className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                  <Plus size={12} /> Add Country
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              {student.countries?.map((c) => (
                <button key={c.country} onClick={() => setSelectedCountry(c.country)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${selectedCountry === c.country ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {c.country}
                  <span className={`ml-1 ${getStatusColor(c.status)} px-1 py-0.5 rounded text-xs`}>{c.status}</span>
                </button>
              ))}
            </div>
            {addingCountry && (
              <div className="flex gap-2 mt-2">
                <select value={newCountry} onChange={(e) => setNewCountry(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select country</option>
                  {COUNTRIES.filter((c) => !student.countries.map((x) => x.country).includes(c)).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button onClick={addCountry} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Add</button>
                <button onClick={() => setAddingCountry(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={16} /> Documents
              {selectedCountry && <span className="text-gray-400 text-sm font-normal">— {selectedCountry}</span>}
            </h2>

            {canUpload && selectedCountry && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                <p className="text-sm font-medium text-blue-800 mb-2">Upload Document for {selectedCountry}</p>
                <div className="flex gap-2 flex-wrap">
                  <input value={docName} onChange={(e) => setDocName(e.target.value)}
                    placeholder="Document name (e.g. Passport Copy)"
                    className="flex-1 min-w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors
                    ${docName.trim() ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                    <Upload size={14} />
                    {uploading ? "Uploading..." : "Choose File"}
                    <input type="file" className="hidden" disabled={!docName.trim() || uploading}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredDocs.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">No documents uploaded yet</p>}
              {filteredDocs.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                      <p className="text-xs text-gray-400">{doc.originalName} · {doc.uploadedBy?.name} · {formatDate(doc.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.isVerified && <CheckCircle size={14} className="text-green-500" />}
                    <a href={doc.filePath} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">View</a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
            <div className="space-y-3 mb-4">
              {student.notes?.length === 0 && <p className="text-gray-400 text-sm">No notes yet</p>}
              {student.notes?.map((n) => (
                <div key={n._id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{n.addedByName} · {getRoleLabel(n.addedByRole as never)}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{n.content}</p>
                </div>
              ))}
            </div>
            {canNote && (
              <div className="flex gap-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add note..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button onClick={addNote} disabled={!note.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm">Add</button>
              </div>
            )}
          </div>
        </div>

        {/* Stage Control */}
        <div className="space-y-4">
          {canStage && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Pipeline Stage</h2>
              <div className="space-y-2">
                {STAGES.map((stage, i) => {
                  const current = STAGES.indexOf(student.currentStage);
                  const isActive = student.currentStage === stage;
                  const isDone = i < current;
                  return (
                    <button key={stage} onClick={() => updateStage(stage)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                        ${isActive ? "bg-blue-600 text-white" : isDone ? "bg-green-50 text-green-700" : "hover:bg-gray-50 text-gray-600"}`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${isActive ? "bg-white text-blue-600" : isDone ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {isDone ? "✓" : i + 1}
                      </span>
                      <span className="capitalize">{stage}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visa Approval */}
          {canVisa && selectedCountry && !student.countries.find((c) => c.country === selectedCountry)?.visaApprovedAt && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Visa Approval</h2>
              <p className="text-sm text-gray-500 mb-3">Mark visa as approved for {selectedCountry}. This will decrement counsellor target.</p>
              <button onClick={() => approveVisa(selectedCountry)}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                ✓ Approve Visa for {selectedCountry}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
