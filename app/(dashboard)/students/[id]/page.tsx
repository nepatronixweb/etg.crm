"use client";
import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Upload, FileText, CheckCircle, Plus, UserCheck, Trash2, GraduationCap, Pencil } from "lucide-react";
import { formatDate, formatDateTime, getStatusColor, getRoleLabel, COUNTRIES } from "@/lib/utils";
import { upload } from "@vercel/blob/client";
import Link from "next/link";

interface StudentDetail {
  _id: string;
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  source: string;
  currentStage: string;
  standing?: string;
  enrolled?: boolean;
  enrolledAt?: string;
  counsellor: { name: string; email: string };
  branch: { name: string };
  countries: Array<{ country: string; status: string; universityName?: string; visaStatus?: string; visaApprovedAt?: string }>;
  admissionDetails: Array<{ 
    _id: string; 
    country: string; 
    universityName: string; 
    annualTuitionFee: string;
    standing: string;
    courses: Array<{ name: string; intakeQuarter: string; intakeYear: string; commencementDate: string }>;
    createdAt: string 
  }>;
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
  const [enrolling, setEnrolling] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ 
    country: "", 
    universityName: "", 
    annualTuitionFee: "",
    standing: "",
    courses: [{ name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }]
  });
  const [savingAdmission, setSavingAdmission] = useState(false);
  const [editingAdmission, setEditingAdmission] = useState<number | null>(null);
  const [editAdmissionForm, setEditAdmissionForm] = useState({ 
    country: "", 
    universityName: "", 
    annualTuitionFee: "",
    standing: "",
    courses: [{ name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }]
  });

  const fetchData = async () => {
    const [sRes, dRes] = await Promise.all([
      fetch(`/api/students/${id}`),
      fetch(`/api/documents?student=${id}`),
    ]);
    const sData = await sRes.json();
    const dData = await dRes.json();
    setStudent(sData);
    setDocs(dData.documents || []);
    if (sData.countries?.length > 0) setSelectedCountry(sData.countries[0].country);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [id]);

  const addNote = async () => {
    if (!note.trim()) return;
    const noteContent = note.trim();
    await fetch(`/api/students/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteContent }) });
    setNote("");
    fetchData();
    // Auto-send via WhatsApp and Gmail
    if (student?.phone) {
      const waPhone = student.phone.replace(/[^\d]/g, "");
      const waMsg = encodeURIComponent(`Hi ${student.name},\n\n${noteContent}\n\n– ETG Team`);
      window.open(`https://wa.me/${waPhone}?text=${waMsg}`, "_blank");
    }
    if (student?.email) {
      const subject = encodeURIComponent(`Update from ETG – ${student.name}`);
      const body = encodeURIComponent(`Hi ${student.name},\n\n${noteContent}\n\nBest regards,\nETG Team`);
      window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(student.email)}&su=${subject}&body=${body}`, "_blank");
    }
  };

  const updateStage = async (stage: string) => {
    await fetch(`/api/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStage: stage }) });
    fetchData();
  };

  const enrollStudent = async () => {
    setEnrolling(true);
    const enrolledAt = new Date().toISOString();
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolled: true, enrolledAt, standing: "heated", currentStage: "application" }),
      });
      if (res.ok) {
        setStudent((prev) => prev ? {
          ...prev,
          enrolled: true,
          enrolledAt,
          standing: "heated",
          currentStage: "application",
        } : prev);
      } else {
        const data = await res.json();
        alert(`Enroll failed: ${data.error || "Unknown error"}`);
      }
    } catch (e) {
      alert(`Network error: ${e}`);
    }
    setEnrolling(false);
  };

  const unenrollStudent = async () => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolled: false, enrolledAt: null }),
      });
      if (res.ok) {
        setStudent((prev) => prev ? { ...prev, enrolled: false, enrolledAt: undefined } : prev);
      }
    } catch {}
  };

  const updateStanding = async (standing: string) => {
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standing }),
    });
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
    try {
      // Direct browser-to-blob upload
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/documents/upload",
      });
      await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          country: selectedCountry,
          name: docName,
          blobUrl: blob.url,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });
    } catch { /* silent */ }
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

  const saveAdmissionDetail = async () => {
    if (!admissionForm.country) return;
    if (admissionForm.courses.some(c => !c.name)) return; // Validate at least one course with name
    setSavingAdmission(true);
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ $push: { admissionDetails: { ...admissionForm } } }),
    });
    setSavingAdmission(false);
    setShowAdmissionForm(false);
    setAdmissionForm({ country: "", universityName: "", annualTuitionFee: "", standing: "", courses: [{ name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }] });
    fetchData();
  };

  const deleteAdmissionDetail = async (index: number) => {
    const entry = student?.admissionDetails?.[index];
    if (!entry) return;
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ $pull: { admissionDetails: { _id: entry._id } } }),
    });
    fetchData();
  };

  const updateAdmissionDetail = async (index: number) => {
    const entry = student?.admissionDetails?.[index];
    if (!entry) return;
    setSavingAdmission(true);
    const existing = student?.admissionDetails || [];
    const updated = existing.map((e, i) => i === index ? { ...editAdmissionForm, _id: e._id } : e);
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admissionDetails: updated }),
    });
    setSavingAdmission(false);
    setEditingAdmission(null);
    fetchData();
  };

  if (!student) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  const STAGES = ["counsellor", "application", "admission", "visa", "completed"];
  const canUpload = ["super_admin", "counsellor", "application_team"].includes(session?.user?.role || "");
  const canNote = ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"].includes(session?.user?.role || "");
  const canStage = ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"].includes(session?.user?.role || "");
  const canEnroll = ["super_admin", "application_team", "counsellor"].includes(session?.user?.role || "");
  const canAdmission = ["super_admin", "admission_team"].includes(session?.user?.role || "");
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
        <div className="ml-auto flex items-center gap-2">
          {student.enrolled && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
              <CheckCircle size={11} /> Enrolled
            </span>
          )}
          {student.standing && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              student.standing === "hot" ? "bg-red-50 text-red-600 border-red-200" :
              student.standing === "warm" ? "bg-amber-50 text-amber-600 border-amber-200" :
              student.standing === "heated" ? "bg-orange-50 text-orange-600 border-orange-200" :
              "bg-gray-50 text-gray-500 border-gray-200"
            }`}>
              {student.standing.replace("_", " ")}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(student.currentStage)}`}>
            {student.currentStage}
          </span>
        </div>
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

          {/* Admission Details */}
          {canAdmission && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap size={16} /> Admission Details
                </h2>
                {!showAdmissionForm && (
                  <button onClick={() => setShowAdmissionForm(true)} className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                    <Plus size={12} /> Add Entry
                  </button>
                )}
              </div>

              {showAdmissionForm && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">New Admission Entry</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Country *</label>
                      <select
                        value={admissionForm.country}
                        onChange={(e) => setAdmissionForm((f) => ({ ...f, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select country</option>
                        {student.countries?.map((c) => (
                          <option key={c.country} value={c.country}>{c.country}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">University Name</label>
                      <input
                        value={admissionForm.universityName}
                        onChange={(e) => setAdmissionForm((f) => ({ ...f, universityName: e.target.value }))}
                        placeholder="e.g. University of Melbourne"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Annual Tuition Fee</label>
                      <input
                        value={admissionForm.annualTuitionFee}
                        onChange={(e) => setAdmissionForm((f) => ({ ...f, annualTuitionFee: e.target.value }))}
                        placeholder="e.g. AUD 32,000"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Standing</label>
                      <select
                        value={admissionForm.standing}
                        onChange={(e) => setAdmissionForm((f) => ({ ...f, standing: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Standing</option>
                        <option value="heated">Heated</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                        <option value="out_of_contact">Out of Contact</option>
                      </select>
                    </div>
                  </div>

                  {/* Courses Section */}
                  <div className="border-t border-gray-300 pt-3 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Courses</p>
                      <button
                        onClick={() => setAdmissionForm((f) => ({
                          ...f,
                          courses: [...f.courses, { name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }]
                        }))}
                        className="text-blue-600 text-xs flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> Add Course
                      </button>
                    </div>
                    <div className="space-y-3">
                      {admissionForm.courses.map((course, idx) => (
                        <div key={idx} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Course Name *</label>
                              <input
                                value={course.name}
                                onChange={(e) => {
                                  const updated = [...admissionForm.courses];
                                  updated[idx].name = e.target.value;
                                  setAdmissionForm((f) => ({ ...f, courses: updated }));
                                }}
                                placeholder="e.g. Bachelor of Engineering"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Quarter</label>
                              <select
                                value={course.intakeQuarter}
                                onChange={(e) => {
                                  const updated = [...admissionForm.courses];
                                  updated[idx].intakeQuarter = e.target.value;
                                  setAdmissionForm((f) => ({ ...f, courses: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Quarter</option>
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Year</label>
                              <input
                                value={course.intakeYear}
                                onChange={(e) => {
                                  const updated = [...admissionForm.courses];
                                  updated[idx].intakeYear = e.target.value;
                                  setAdmissionForm((f) => ({ ...f, courses: updated }));
                                }}
                                placeholder="e.g. 2025"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Course Commencement Date</label>
                              <input
                                type="date"
                                value={course.commencementDate}
                                onChange={(e) => {
                                  const updated = [...admissionForm.courses];
                                  updated[idx].commencementDate = e.target.value;
                                  setAdmissionForm((f) => ({ ...f, courses: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          {admissionForm.courses.length > 1 && (
                            <button
                              onClick={() => setAdmissionForm((f) => ({
                                ...f,
                                courses: f.courses.filter((_, i) => i !== idx)
                              }))}
                              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Remove Course
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveAdmissionDetail}
                      disabled={!admissionForm.country || admissionForm.courses.some(c => !c.name) || savingAdmission}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium"
                    >
                      {savingAdmission ? "Saving" : "Save"}
                    </button>
                    <button
                      onClick={() => { 
                        setShowAdmissionForm(false); 
                        setAdmissionForm({ country: "", universityName: "", annualTuitionFee: "", standing: "", courses: [{ name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }] }); 
                      }}
                      className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {(!student.admissionDetails || student.admissionDetails.length === 0) && !showAdmissionForm && (
                <p className="text-sm text-gray-400 text-center py-4">No admission details added yet</p>
              )}

              <div className="space-y-3">
                {student.admissionDetails?.map((entry, i) => (
                  <div key={entry._id ?? i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {editingAdmission === i ? (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Edit Entry</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                            <select
                              value={editAdmissionForm.country}
                              onChange={(e) => setEditAdmissionForm((f) => ({ ...f, country: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select country</option>
                              {student.countries?.map((c) => (
                                <option key={c.country} value={c.country}>{c.country}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">University Name</label>
                            <input
                              value={editAdmissionForm.universityName}
                              onChange={(e) => setEditAdmissionForm((f) => ({ ...f, universityName: e.target.value }))}
                              placeholder="e.g. University of Melbourne"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Annual Tuition Fee</label>
                            <input
                              value={editAdmissionForm.annualTuitionFee}
                              onChange={(e) => setEditAdmissionForm((f) => ({ ...f, annualTuitionFee: e.target.value }))}
                              placeholder="e.g. AUD 32,000"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Standing</label>
                            <select
                              value={editAdmissionForm.standing}
                              onChange={(e) => setEditAdmissionForm((f) => ({ ...f, standing: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Standing</option>
                              <option value="heated">Heated</option>
                              <option value="warm">Warm</option>
                              <option value="cold">Cold</option>
                              <option value="out_of_contact">Out of Contact</option>
                            </select>
                          </div>
                        </div>

                        {/* Edit Courses Section */}
                        <div className="border-t border-gray-300 pt-3 mt-3">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Courses</p>
                            <button
                              onClick={() => setEditAdmissionForm((f) => ({
                                ...f,
                                courses: [...f.courses, { name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }]
                              }))}
                              className="text-blue-600 text-xs flex items-center gap-1 hover:underline"
                            >
                              <Plus size={12} /> Add Course
                            </button>
                          </div>
                          <div className="space-y-3">
                            {editAdmissionForm.courses.map((course, idx) => (
                              <div key={idx} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Course Name *</label>
                                    <input
                                      value={course.name}
                                      onChange={(e) => {
                                        const updated = [...editAdmissionForm.courses];
                                        updated[idx].name = e.target.value;
                                        setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                      }}
                                      placeholder="e.g. Bachelor of Engineering"
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Quarter</label>
                                    <select
                                      value={course.intakeQuarter}
                                      onChange={(e) => {
                                        const updated = [...editAdmissionForm.courses];
                                        updated[idx].intakeQuarter = e.target.value;
                                        setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Select Quarter</option>
                                      <option value="Q1">Q1</option>
                                      <option value="Q2">Q2</option>
                                      <option value="Q3">Q3</option>
                                      <option value="Q4">Q4</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Year</label>
                                    <input
                                      value={course.intakeYear}
                                      onChange={(e) => {
                                        const updated = [...editAdmissionForm.courses];
                                        updated[idx].intakeYear = e.target.value;
                                        setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                      }}
                                      placeholder="e.g. 2025"
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Course Commencement Date</label>
                                    <input
                                      type="date"
                                      value={course.commencementDate}
                                      onChange={(e) => {
                                        const updated = [...editAdmissionForm.courses];
                                        updated[idx].commencementDate = e.target.value;
                                        setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                                {editAdmissionForm.courses.length > 1 && (
                                  <button
                                    onClick={() => setEditAdmissionForm((f) => ({
                                      ...f,
                                      courses: f.courses.filter((_, ci) => ci !== idx)
                                    }))}
                                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                                  >
                                    <Trash2 size={12} /> Remove Course
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => updateAdmissionDetail(i)}
                            disabled={!editAdmissionForm.country || editAdmissionForm.courses.some(c => !c.name) || savingAdmission}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium"
                          >
                            {savingAdmission ? "Saving…" : "Update"}
                          </button>
                          <button
                            onClick={() => setEditingAdmission(null)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{entry.country}</span>
                            {entry.universityName && <span className="text-sm font-semibold text-gray-800">{entry.universityName}</span>}
                            {entry.standing && (
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                entry.standing === "heated" ? "bg-red-100 text-red-700" :
                                entry.standing === "hot" ? "bg-orange-100 text-orange-700" :
                                entry.standing === "warm" ? "bg-yellow-100 text-yellow-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                                {entry.standing.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-wrap mt-2">
                            {entry.annualTuitionFee && (
                              <span className="text-sm text-gray-600"><span className="text-xs text-gray-400 font-medium">Fee: </span>{entry.annualTuitionFee} / yr</span>
                            )}
                          </div>
                          {/* Display Courses */}
                          {entry.courses && entry.courses.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {entry.courses.map((course, idx) => (
                                <div key={idx} className="inline-block bg-green-50 border border-green-200 rounded-lg p-2 text-xs">
                                  <div className="font-medium text-green-900">{course.name}</div>
                                  <div className="text-green-700">
                                    {course.intakeQuarter && <span>{course.intakeQuarter}</span>}
                                    {course.intakeYear && <span>{course.intakeYear}</span>}
                                    {course.intakeQuarter && course.intakeYear && <span> • </span>}
                                  </div>
                                  {course.commencementDate && (
                                    <div className="text-green-600">{new Date(course.commencementDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-3 shrink-0">
                          <button
                            onClick={() => { 
                              setEditingAdmission(i); 
                              setEditAdmissionForm({ 
                                country: entry.country, 
                                universityName: entry.universityName || "", 
                                annualTuitionFee: entry.annualTuitionFee || "",
                                standing: entry.standing || "",
                                courses: entry.courses || []
                              }); 
                            }}
                            className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                            title="Edit entry"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteAdmissionDetail(i)}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                            title="Remove entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Enrollment Card */}
          {canEnroll && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck size={16} /> Enrollment
              </h2>
              {!student.enrolled ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    Enroll this student to move them into the application pipeline. Standing will be set to <span className="font-semibold text-orange-600">Heated</span> automatically and visible to the Admission department.
                  </p>
                  <button
                    onClick={enrollStudent}
                    disabled={enrolling}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <UserCheck size={15} /> {enrolling ? "Enrolling…" : "Enroll Student"}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                      <CheckCircle size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-green-800">Student Enrolled</p>
                      {student.enrolledAt && (
                        <p className="text-xs text-green-600">Enrolled on {formatDate(student.enrolledAt)}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">This student is now visible in the Admission department.</p>
                  <button
                    onClick={unenrollStudent}
                    className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors"
                  >
                    Undo enrollment
                  </button>
                </>
              )}

              {/* Standing — manual override */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Standing</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: "hot",           label: "Hot",             active: "bg-red-500 text-white border-red-500",    idle: "border-red-200 text-red-600 hover:bg-red-50" },
                    { value: "warm",          label: "Warm",            active: "bg-amber-500 text-white border-amber-500", idle: "border-amber-200 text-amber-600 hover:bg-amber-50" },
                    { value: "heated",        label: "Heated",          active: "bg-orange-500 text-white border-orange-500", idle: "border-orange-200 text-orange-600 hover:bg-orange-50" },
                    { value: "out_of_contact",label: "Out of Contact",   active: "bg-gray-500 text-white border-gray-500",  idle: "border-gray-200 text-gray-500 hover:bg-gray-50" },
                  ] as const).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateStanding(student.standing === s.value ? "" : s.value)}
                      className={`px-2 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        student.standing === s.value ? s.active : s.idle
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
