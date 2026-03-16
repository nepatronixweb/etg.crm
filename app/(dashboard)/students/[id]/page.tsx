"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  Plus,
  UserCheck,
  Trash2,
  GraduationCap,
  Pencil,
  Lock,
  Unlock,
  Calendar,
  DollarSign,
  BookOpen,
  MapPin,
} from "lucide-react";
import { formatDate, formatDateTime, getStatusColor, getRoleLabel, COUNTRIES } from "@/lib/utils";
import Link from "next/link";

interface AdmissionCourse {
  name: string;
  intakeQuarter: string;
  intakeYear: string;
  commencementDate: string;
}

interface AdmissionDetail {
  _id: string;
  country: string;
  universityName: string;
  location?: string;
  annualTuitionFee: string;
  standing: string;
  closed?: boolean;
  courses: AdmissionCourse[];
  createdAt: string;
}

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
  admissionDetails: AdmissionDetail[];
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

const EMPTY_COURSE: AdmissionCourse = {
  name: "",
  intakeQuarter: "",
  intakeYear: "",
  commencementDate: "",
};

const EMPTY_ADMISSION_FORM = {
  country: "",
  universityName: "",
  location: "",
  annualTuitionFee: "",
  standing: "",
  courses: [{ ...EMPTY_COURSE }],
};

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
  const [admissionForm, setAdmissionForm] = useState(EMPTY_ADMISSION_FORM);
  const [savingAdmission, setSavingAdmission] = useState(false);
  const [editingAdmission, setEditingAdmission] = useState<number | null>(null);
  const [editAdmissionForm, setEditAdmissionForm] = useState(EMPTY_ADMISSION_FORM);

  const fetchData = async () => {
    const [studentRes, docsRes] = await Promise.all([
      fetch(`/api/students/${id}`),
      fetch(`/api/documents?student=${id}`),
    ]);
    const studentData = await studentRes.json();
    const docsData = await docsRes.json();
    setStudent(studentData);
    setDocs(docsData.documents || []);
    if (studentData.countries?.length > 0) {
      setSelectedCountry((current) => current || studentData.countries[0].country);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const addNote = async () => {
    if (!note.trim()) return;

    const noteContent = note.trim();
    await fetch(`/api/students/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent }),
    });

    setNote("");
    fetchData();

    if (student?.phone) {
      const waPhone = student.phone.replace(/[^\d]/g, "");
      const waMsg = encodeURIComponent(`Hi ${student.name},\n\n${noteContent}\n\n- ETG Team`);
      window.open(`https://wa.me/${waPhone}?text=${waMsg}`, "_blank");
    }

    if (student?.email) {
      const subject = encodeURIComponent(`Update from ETG - ${student.name}`);
      const body = encodeURIComponent(`Hi ${student.name},\n\n${noteContent}\n\nBest regards,\nETG Team`);
      window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(student.email)}&su=${subject}&body=${body}`, "_blank");
    }
  };

  const updateStage = async (stage: string) => {
    await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStage: stage }),
    });
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
    } catch (error) {
      alert(`Network error: ${error}`);
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
    } catch {
      // ignore
    }
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
    await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visaApproved: true, country }),
    });
    fetchData();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCountry || !docName) return;

    setUploading(true);

    try {
      const { uploadFile } = await import("@/lib/upload");
      const uploadData = await uploadFile(file);

      await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          country: selectedCountry,
          name: docName,
          fileUrl: uploadData.url,
          originalName: uploadData.originalName,
          fileSize: uploadData.fileSize,
          fileType: uploadData.fileType,
        }),
      });
    } catch {
      // silent
    }

    setUploading(false);
    setDocName("");
    e.target.value = "";
    fetchData();
  };

  const addCountry = async () => {
    if (!newCountry) return;

    const existing = student?.countries.map((country) => country.country) || [];
    const updated = [...existing.map((country) => ({ country })), { country: newCountry }];

    await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countries: updated }),
    });

    setNewCountry("");
    setAddingCountry(false);
    fetchData();
  };

  const saveAdmissionDetail = async () => {
    if (!admissionForm.country) return;
    if (admissionForm.courses.some((course) => !course.name.trim())) return;

    setSavingAdmission(true);

    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        $push: {
          admissionDetails: {
            ...admissionForm,
            courses: admissionForm.courses.map((course) => ({ ...course })),
          },
        },
      }),
    });

    setSavingAdmission(false);
    setShowAdmissionForm(false);
    setAdmissionForm(EMPTY_ADMISSION_FORM);
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
    const updated = existing.map((admission, admissionIndex) => (
      admissionIndex === index
        ? { ...editAdmissionForm, _id: admission._id, closed: admission.closed }
        : admission
    ));

    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admissionDetails: updated }),
    });

    setSavingAdmission(false);
    setEditingAdmission(null);
    fetchData();
  };

  const toggleAdmissionClosed = async (index: number) => {
    if (!student) return;
    const updated = student.admissionDetails.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, closed: !entry.closed } : entry
    ));

    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admissionDetails: updated }),
    });

    setStudent({ ...student, admissionDetails: updated });
  };

  if (!student) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  const stages = ["counsellor", "application", "admission", "visa", "completed"];
  const role = session?.user?.role || "";
  const canUpload = ["super_admin", "counsellor", "application_team"].includes(role);
  const canNote = ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"].includes(role);
  const canStage = ["super_admin", "counsellor", "application_team", "admission_team", "visa_team"].includes(role);
  const canEnroll = ["super_admin", "application_team", "counsellor"].includes(role);
  const canAdmission = ["super_admin", "admission_team"].includes(role);
  const canToggleAdmission = canAdmission;
  const canVisa = ["super_admin", "visa_team"].includes(role);
  const filteredDocs = docs.filter((doc) => !selectedCountry || doc.country === selectedCountry);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/students" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
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
              student.standing === "hot"
                ? "bg-red-50 text-red-600 border-red-200"
                : student.standing === "warm"
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : student.standing === "heated"
                    ? "bg-orange-50 text-orange-600 border-orange-200"
                    : "bg-gray-50 text-gray-500 border-gray-200"
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
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Student Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Phone", student.phone],
                ["Email", student.email],
                ["DOB", student.dateOfBirth],
                ["Source", student.source?.replace("_", " ")],
                ["Counsellor", student.counsellor?.name],
                ["Branch", student.branch?.name],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium text-gray-800 mt-1 capitalize">{value || "-"}</p>
                </div>
              ))}
            </div>
          </div>

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
              {student.countries?.map((country) => (
                <button
                  key={country.country}
                  onClick={() => setSelectedCountry(country.country)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedCountry === country.country
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {country.country}
                  <span className={`ml-1 ${getStatusColor(country.status)} px-1 py-0.5 rounded text-xs`}>{country.status}</span>
                </button>
              ))}
            </div>

            {addingCountry && (
              <div className="flex gap-2 mt-2">
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.filter((country) => !student.countries.map((entry) => entry.country).includes(country)).map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <button onClick={addCountry} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Add</button>
                <button onClick={() => setAddingCountry(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              </div>
            )}
          </div>

          {(canAdmission || canToggleAdmission) && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap size={16} /> Admission Details
                </h2>
                {!showAdmissionForm && canAdmission && (
                  <button onClick={() => setShowAdmissionForm(true)} className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                    <Plus size={12} /> Add Entry
                  </button>
                )}
              </div>

              {showAdmissionForm && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
                  <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <GraduationCap size={15} className="text-blue-600" />
                    <p className="text-sm font-semibold text-blue-800">New Admission Entry</p>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Country *</label>
                        <select
                          value={admissionForm.country}
                          onChange={(e) => setAdmissionForm((form) => ({ ...form, country: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select country</option>
                          {student.countries?.map((country) => (
                            <option key={country.country} value={country.country}>{country.country}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">University Name</label>
                        <input
                          value={admissionForm.universityName}
                          onChange={(e) => setAdmissionForm((form) => ({ ...form, universityName: e.target.value }))}
                          placeholder="e.g. University of Melbourne"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Location / Campus</label>
                        <input
                          value={admissionForm.location}
                          onChange={(e) => setAdmissionForm((form) => ({ ...form, location: e.target.value }))}
                          placeholder="e.g. Melbourne, Sydney"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual Tuition Fee</label>
                        <input
                          value={admissionForm.annualTuitionFee}
                          onChange={(e) => setAdmissionForm((form) => ({ ...form, annualTuitionFee: e.target.value }))}
                          placeholder="e.g. AUD 32,000"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Courses</p>
                        <button
                          type="button"
                          onClick={() => setAdmissionForm((form) => ({ ...form, courses: [...form.courses, { ...EMPTY_COURSE }] }))}
                          className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:text-blue-700"
                        >
                          <Plus size={12} /> Add Course
                        </button>
                      </div>
                      <div className="space-y-3">
                        {admissionForm.courses.map((course, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            {admissionForm.courses.length > 1 && (
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-gray-500">Course {index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => setAdmissionForm((form) => ({
                                    ...form,
                                    courses: form.courses.filter((_, courseIndex) => courseIndex !== index),
                                  }))}
                                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                  <Trash2 size={11} /> Remove
                                </button>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Name *</label>
                                <input
                                  value={course.name}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[index] = { ...updated[index], name: e.target.value };
                                    setAdmissionForm((form) => ({ ...form, courses: updated }));
                                  }}
                                  placeholder="e.g. Bachelor of Engineering"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Quarter</label>
                                <select
                                  value={course.intakeQuarter}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[index] = { ...updated[index], intakeQuarter: e.target.value };
                                    setAdmissionForm((form) => ({ ...form, courses: updated }));
                                  }}
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                  <option value="">Select quarter</option>
                                  <option value="Q1">Q1</option>
                                  <option value="Q2">Q2</option>
                                  <option value="Q3">Q3</option>
                                  <option value="Q4">Q4</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Year</label>
                                <input
                                  value={course.intakeYear}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[index] = { ...updated[index], intakeYear: e.target.value };
                                    setAdmissionForm((form) => ({ ...form, courses: updated }));
                                  }}
                                  placeholder="e.g. 2026"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Commencement Date</label>
                                <input
                                  type="date"
                                  value={course.commencementDate}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[index] = { ...updated[index], commencementDate: e.target.value };
                                    setAdmissionForm((form) => ({ ...form, courses: updated }));
                                  }}
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={saveAdmissionDetail}
                        disabled={!admissionForm.country || admissionForm.courses.some((course) => !course.name.trim()) || savingAdmission}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {savingAdmission ? "Saving..." : "Save Entry"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAdmissionForm(false);
                          setAdmissionForm(EMPTY_ADMISSION_FORM);
                        }}
                        className="px-5 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(!student.admissionDetails || student.admissionDetails.length === 0) && !showAdmissionForm && (
                <p className="text-sm text-gray-400 text-center py-4">No admission details added yet</p>
              )}

              <div className="space-y-3">
                {student.admissionDetails?.map((entry, index) => (
                  <div key={entry._id ?? index} className={`p-4 rounded-xl border transition-all duration-300 ${entry.closed ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-100"}`}>
                    {editingAdmission === index ? (
                      <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Edit Entry</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                            <select
                              value={editAdmissionForm.country}
                              onChange={(e) => setEditAdmissionForm((form) => ({ ...form, country: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select country</option>
                              {student.countries?.map((country) => (
                                <option key={country.country} value={country.country}>{country.country}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">University Name</label>
                            <input
                              value={editAdmissionForm.universityName}
                              onChange={(e) => setEditAdmissionForm((form) => ({ ...form, universityName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Location / Campus</label>
                            <input
                              value={editAdmissionForm.location}
                              onChange={(e) => setEditAdmissionForm((form) => ({ ...form, location: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Annual Tuition Fee</label>
                            <input
                              value={editAdmissionForm.annualTuitionFee}
                              onChange={(e) => setEditAdmissionForm((form) => ({ ...form, annualTuitionFee: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="border-t border-gray-300 pt-3 mt-3">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Courses</p>
                            <button
                              onClick={() => setEditAdmissionForm((form) => ({ ...form, courses: [...form.courses, { ...EMPTY_COURSE }] }))}
                              className="text-blue-600 text-xs flex items-center gap-1 hover:underline"
                            >
                              <Plus size={12} /> Add Course
                            </button>
                          </div>
                          <div className="space-y-3">
                            {editAdmissionForm.courses.map((course, courseIndex) => (
                              <div key={courseIndex} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Course Name *</label>
                                    <input
                                      value={course.name}
                                      onChange={(e) => {
                                        const updated = [...editAdmissionForm.courses];
                                        updated[courseIndex] = { ...updated[courseIndex], name: e.target.value };
                                        setEditAdmissionForm((form) => ({ ...form, courses: updated }));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Quarter</label>
                                    <select
                                      value={course.intakeQuarter}
                                      onChange={(e) => {
                                        const updated = [...editAdmissionForm.courses];
                                        updated[courseIndex] = { ...updated[courseIndex], intakeQuarter: e.target.value };
                                        setEditAdmissionForm((form) => ({ ...form, courses: updated }));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Select quarter</option>
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
                                        updated[courseIndex] = { ...updated[courseIndex], intakeYear: e.target.value };
                                        setEditAdmissionForm((form) => ({ ...form, courses: updated }));
                                      }}
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
                                        updated[courseIndex] = { ...updated[courseIndex], commencementDate: e.target.value };
                                        setEditAdmissionForm((form) => ({ ...form, courses: updated }));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                                {editAdmissionForm.courses.length > 1 && (
                                  <button
                                    onClick={() => setEditAdmissionForm((form) => ({
                                      ...form,
                                      courses: form.courses.filter((_, currentIndex) => currentIndex !== courseIndex),
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
                            onClick={() => updateAdmissionDetail(index)}
                            disabled={!editAdmissionForm.country || editAdmissionForm.courses.some((course) => !course.name.trim()) || savingAdmission}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium"
                          >
                            {savingAdmission ? "Saving..." : "Update"}
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
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap" style={entry.closed ? { opacity: 0.55 } : undefined}>
                              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{entry.country}</span>
                              {entry.universityName && <span className="text-sm font-semibold text-gray-800">{entry.universityName}</span>}
                              {entry.closed && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-wide border border-red-200">Closed</span>
                              )}
                            </div>
                            <div className={`space-y-3 ${entry.closed ? "opacity-45 blur-sm pointer-events-none select-none" : ""}`}>
                              <div className="flex items-center gap-4 flex-wrap mt-2">
                                {entry.location && (
                                  <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <MapPin size={12} /> {entry.location}
                                  </span>
                                )}
                                {entry.annualTuitionFee && (
                                  <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <DollarSign size={12} /> {entry.annualTuitionFee} / yr
                                  </span>
                                )}
                                {entry.createdAt && (
                                  <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <Calendar size={12} /> {formatDate(entry.createdAt)}
                                  </span>
                                )}
                              </div>
                              {entry.courses && entry.courses.length > 0 && (
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {entry.courses.map((course, courseIndex) => (
                                    <div key={courseIndex} className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
                                      <div className="font-medium text-gray-900 flex items-center gap-1">
                                        <BookOpen size={11} /> {course.name}
                                      </div>
                                      <div className="text-gray-600 mt-1">
                                        {[course.intakeQuarter, course.intakeYear].filter(Boolean).join(" ") || "No intake set"}
                                      </div>
                                      {course.commencementDate && (
                                        <div className="text-gray-500 mt-1">Starts {formatDate(course.commencementDate)}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {canToggleAdmission && (
                              <button
                                onClick={() => toggleAdmissionClosed(index)}
                                className={`p-1.5 rounded-md transition-colors ${entry.closed ? "text-green-600 hover:bg-green-50" : "text-orange-500 hover:bg-orange-50"}`}
                                title={entry.closed ? "Reopen entry" : "Close entry"}
                              >
                                {entry.closed ? <Unlock size={13} /> : <Lock size={13} />}
                              </button>
                            )}
                            {canAdmission && !entry.closed && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingAdmission(index);
                                    setEditAdmissionForm({
                                      country: entry.country,
                                      universityName: entry.universityName || "",
                                      location: entry.location || "",
                                      annualTuitionFee: entry.annualTuitionFee || "",
                                      standing: entry.standing || "",
                                      courses: entry.courses?.length ? entry.courses.map((course) => ({ ...course })) : [{ ...EMPTY_COURSE }],
                                    });
                                  }}
                                  className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                                  title="Edit entry"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => deleteAdmissionDetail(index)}
                                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                  title="Remove entry"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={16} /> Documents
              {selectedCountry && <span className="text-gray-400 text-sm font-normal">- {selectedCountry}</span>}
            </h2>

            {canUpload && selectedCountry && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                <p className="text-sm font-medium text-blue-800 mb-2">Upload Document for {selectedCountry}</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Document name (e.g. Passport Copy)"
                    className="flex-1 min-w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${docName.trim() ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                    <Upload size={14} />
                    {uploading ? "Uploading..." : "Choose File"}
                    <input type="file" className="hidden" disabled={!docName.trim() || uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} />
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

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
            <div className="space-y-3 mb-4">
              {student.notes?.length === 0 && <p className="text-gray-400 text-sm">No notes yet</p>}
              {student.notes?.map((entry) => (
                <div key={entry._id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{entry.addedByName} · {getRoleLabel(entry.addedByRole as never)}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{entry.content}</p>
                </div>
              ))}
            </div>
            {canNote && (
              <div className="flex gap-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add note..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button onClick={addNote} disabled={!note.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm">
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
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
                    <UserCheck size={15} /> {enrolling ? "Enrolling..." : "Enroll Student"}
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
                      {student.enrolledAt && <p className="text-xs text-green-600">Enrolled on {formatDate(student.enrolledAt)}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">This student is now visible in the Admission department.</p>
                  <button onClick={unenrollStudent} className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors">
                    Undo enrollment
                  </button>
                </>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Standing</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: "hot", label: "Hot", active: "bg-red-500 text-white border-red-500", idle: "border-red-200 text-red-600 hover:bg-red-50" },
                    { value: "warm", label: "Warm", active: "bg-amber-500 text-white border-amber-500", idle: "border-amber-200 text-amber-600 hover:bg-amber-50" },
                    { value: "heated", label: "Heated", active: "bg-orange-500 text-white border-orange-500", idle: "border-orange-200 text-orange-600 hover:bg-orange-50" },
                    { value: "out_of_contact", label: "Out of Contact", active: "bg-gray-500 text-white border-gray-500", idle: "border-gray-200 text-gray-500 hover:bg-gray-50" },
                  ] as const).map((standing) => (
                    <button
                      key={standing.value}
                      onClick={() => updateStanding(student.standing === standing.value ? "" : standing.value)}
                      className={`px-2 py-1.5 rounded-md text-xs font-semibold border transition-colors ${student.standing === standing.value ? standing.active : standing.idle}`}
                    >
                      {standing.label}
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
                {stages.map((stage, index) => {
                  const current = stages.indexOf(student.currentStage);
                  const isActive = student.currentStage === stage;
                  const isDone = index < current;

                  return (
                    <button
                      key={stage}
                      onClick={() => updateStage(stage)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-blue-600 text-white" : isDone ? "bg-green-50 text-green-700" : "hover:bg-gray-50 text-gray-600"}`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-white text-blue-600" : isDone ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {isDone ? "✓" : index + 1}
                      </span>
                      <span className="capitalize">{stage}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {canVisa && selectedCountry && !student.countries.find((country) => country.country === selectedCountry)?.visaApprovedAt && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Visa Approval</h2>
              <p className="text-sm text-gray-500 mb-3">Mark visa as approved for {selectedCountry}. This will decrement counsellor target.</p>
              <button onClick={() => approveVisa(selectedCountry)} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Approve Visa for {selectedCountry}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
