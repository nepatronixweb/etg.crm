"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  FileText, Download, Trash2, Search,
  CheckCircle, Eye, Upload, Plus, X, CloudUpload,
} from "lucide-react";
import { formatDate, COUNTRIES } from "@/lib/utils";

interface Document {
  _id: string;
  name: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  country: string;
  isVerified: boolean;
  uploadedBy: { name: string };
  createdAt: string;
  student: {
    _id: string;
    name: string;
    phone: string;
  };
}

const VERIFY_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "true", label: "Verified" },
  { value: "false", label: "Pending" },
];

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");

  // Upload modal state
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<{ _id: string; name: string; phone: string }[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadForm, setUploadForm] = useState({ studentId: "", country: "", name: "", file: null as File | null });

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (countryFilter) params.set("country", countryFilter);
    if (verifiedFilter !== "") params.set("isVerified", verifiedFilter);
    const res = await fetch(`/api/documents?${params}`);
    const data = await res.json();
    setDocuments(data.documents || []);
    setLoading(false);
  }, [countryFilter, verifiedFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchDocuments(); }, [countryFilter, verifiedFilter]);

  const toggleVerify = async (docId: string, current: boolean) => {
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !current }),
    });
    if (res.ok) fetchDocuments();
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) fetchDocuments();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filtered = documents.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      d.originalName.toLowerCase().includes(search.toLowerCase())
  );

  const canVerify =
    session?.user?.role === "super_admin" ||
    session?.user?.role === "application_team";

  const canUpload = ["super_admin", "application_team", "counsellor", "front_desk"].includes(session?.user?.role || "");

  const openModal = async () => {
    setUploadForm({ studentId: "", country: "", name: "", file: null });
    setStudentSearch("");
    setUploadError("");
    setShowModal(true);
    if (students.length === 0) {
      const res = await fetch("/api/students");
      const data = await res.json();
      setStudents(Array.isArray(data) ? data.map((s: { _id: string; name: string; phone: string }) => ({ _id: s._id, name: s.name, phone: s.phone })) : []);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setUploadForm((f) => ({
      ...f,
      file,
      name: f.name || file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
    }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) { setUploadError("Please select a file."); return; }
    if (!uploadForm.studentId) { setUploadError("Please select a student."); return; }
    setUploading(true);
    setUploadError("");
    try {
      // Upload file to MongoDB GridFS (chunked for large files)
      const { uploadFile } = await import("@/lib/upload");
      const uploadData = await uploadFile(uploadForm.file);
      // Save document metadata
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: uploadForm.studentId,
          country: uploadForm.country,
          name: uploadForm.name || uploadForm.file.name,
          fileUrl: uploadData.url,
          originalName: uploadData.originalName,
          fileSize: uploadData.fileSize,
          fileType: uploadData.fileType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        fetchDocuments();
      } else {
        setUploadError(data?.error || "Failed to save document record.");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.phone.includes(studentSearch)
  );

  return (
    <>
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${filtered.length} of ${documents.length} documents`}
          </p>
        </div>
        {canUpload && (
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Add Document
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by document name or student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Country dropdown */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
            >
              <option value="">All Countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Verified filter pills */}
            {VERIFY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVerifiedFilter(opt.value)}
                className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                  verifiedFilter === opt.value
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm">Loading documents…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
            <Upload size={28} className="text-gray-300" />
            <p className="text-sm">No documents found</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Document", "Student", "Country", "Size", "Uploaded By", "Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((doc) => (
                    <tr key={doc._id} className="hover:bg-gray-50 transition-colors">

                      {/* Document name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-40">{doc.name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-40">{doc.originalName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3.5">
                        {doc.student ? (
                          <div>
                            <p className="font-medium text-gray-900">{doc.student.name}</p>
                            <p className="text-xs text-gray-400 tabular-nums">{doc.student.phone}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          {doc.country}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3.5 text-gray-600 tabular-nums whitespace-nowrap">
                        {formatBytes(doc.fileSize)}
                      </td>

                      {/* Uploaded By */}
                      <td className="px-4 py-3.5 text-gray-600">
                        {doc.uploadedBy?.name || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-gray-500 tabular-nums whitespace-nowrap">
                        {formatDate(doc.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {doc.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-900 text-white">
                            <CheckCircle size={11} />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <a
                            href={doc.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title="Preview"
                          >
                            <Eye size={15} />
                          </a>
                          <a
                            href={doc.filePath}
                            download={doc.originalName}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download"
                          >
                            <Download size={15} />
                          </a>
                          {canVerify && (
                            <button
                              onClick={() => toggleVerify(doc._id, doc.isVerified)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                              title={doc.isVerified ? "Mark as Pending" : "Mark as Verified"}
                            >
                              <CheckCircle size={15} className={doc.isVerified ? "text-gray-700" : ""} />
                            </button>
                          )}
                          {session?.user?.role === "super_admin" && (
                            <button
                              onClick={() => deleteDoc(doc._id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
                <span className="font-semibold text-gray-700">{documents.length}</span> documents
              </p>
            </div>
          </>
        )}
      </div>
    </div>

    {/* ─── Upload Document Modal ─── */}
    {showModal && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 border border-gray-200 rounded-md">
                <CloudUpload size={16} className="text-gray-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Upload Document</h2>
                <p className="text-xs text-gray-500 mt-0.5">Add a document for a student record</p>
              </div>
            </div>
            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="px-6 py-5 space-y-6">

            {/* Section — Student */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Student</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Search Student</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Name or phone…"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
                    />
                  </div>
                </div>

                {studentSearch && filteredStudents.length > 0 && (
                  <div className="border border-gray-200 rounded-md overflow-hidden divide-y divide-gray-100 max-h-40 overflow-y-auto">
                    {filteredStudents.slice(0, 8).map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => {
                          setUploadForm((f) => ({ ...f, studentId: s._id }));
                          setStudentSearch(s.name);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${uploadForm.studentId === s._id ? "bg-gray-50" : ""}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-gray-600">
                            {s.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.phone}</p>
                        </div>
                        {uploadForm.studentId === s._id && (
                          <CheckCircle size={14} className="ml-auto text-gray-700 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {uploadForm.studentId && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-gray-600" />
                    Student selected
                  </p>
                )}
              </div>
            </div>

            {/* Section — Document Details */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Document Details</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Document Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Passport Copy, Bank Statement…"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Destination Country</label>
                  <select
                    value={uploadForm.country}
                    onChange={(e) => setUploadForm((f) => ({ ...f, country: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
                  >
                    <option value="">— Select country —</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section — File */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">File</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-gray-400 bg-gray-50" : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                {uploadForm.file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-gray-100 border border-gray-200 rounded-md">
                      <FileText size={16} className="text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{uploadForm.file?.name}</p>
                      <p className="text-xs text-gray-500">{((uploadForm.file?.size ?? 0) / 1024).toFixed(1)} KB — click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={20} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-700">Drop file here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 10 MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Error */}
            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2.5">
                {uploadError}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  uploading ? "bg-gray-400 cursor-not-allowed text-white" : "bg-gray-900 hover:bg-gray-700 text-white"
                }`}
              >
                {uploading ? (
                  <>
                    <span className="border-2 border-white/40 border-t-white rounded-full animate-spin w-3.5 h-3.5" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <CloudUpload size={14} />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
