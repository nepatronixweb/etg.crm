"use client";
import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Upload, FileText, CheckCircle, Plus, UserCheck, Trash2, GraduationCap, Pencil, Lock, Unlock, Calendar, DollarSign, BookOpen, MapPin } from "lucide-react";
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
    location: string;
    annualTuitionFee: string;
    standing: string;
    closed?: boolean;
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
          {/* Admission Details */}
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
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">University Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Country <span className="text-red-500">*</span></label>
                          <select
                            value={admissionForm.country}
                            onChange={(e) => setAdmissionForm((f) => ({ ...f, country: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          >
                            <option value="">Select country</option>
                            {student.countries?.map((c) => (
                              <option key={c.country} value={c.country}>{c.country}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">University Name</label>
                          <input
                            value={admissionForm.universityName}
                            onChange={(e) => setAdmissionForm((f) => ({ ...f, universityName: e.target.value }))}
                            placeholder="e.g. University of Melbourne"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Location / Campus</label>
                          <input
                            value={admissionForm.location}
                            onChange={(e) => setAdmissionForm((f) => ({ ...f, location: e.target.value }))}
                            placeholder="e.g. Melbourne, Sydney"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual Tuition Fee</label>
                          <input
                            value={admissionForm.annualTuitionFee}
                            onChange={(e) => setAdmissionForm((f) => ({ ...f, annualTuitionFee: e.target.value }))}
                            placeholder="e.g. AUD 32,000"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Standing</label>
                          <div className="flex gap-2 flex-wrap">
                            {(["heated", "warm", "cold", "out_of_contact"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setAdmissionForm((f) => ({ ...f, standing: f.standing === s ? "" : s }))}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                                  admissionForm.standing === s
                                    ? s === "heated"
                                      ? "bg-red-500 text-white border-red-500"
                                      : s === "warm"
                                        ? "bg-amber-400 text-white border-amber-400"
                                        : s === "cold"
                                          ? "bg-blue-400 text-white border-blue-400"
                                          : "bg-gray-500 text-white border-gray-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                                }`}
                              >
                                {s.replace(/_/g, " ")}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Courses</p>
                        <button
                          type="button"
                          onClick={() => setAdmissionForm((f) => ({
                            ...f,
                            courses: [...f.courses, { name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }],
                          }))}
                          className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:text-blue-700"
                        >
                          <Plus size={12} /> Add Course
                        </button>
                      </div>
                      <div className="space-y-3">
                        {admissionForm.courses.map((course, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            {admissionForm.courses.length > 1 && (
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-gray-500">Course {idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => setAdmissionForm((f) => ({
                                    ...f,
                                    courses: f.courses.filter((_, courseIndex) => courseIndex !== idx),
                                  }))}
                                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                  <Trash2 size={11} /> Remove
                                </button>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Name <span className="text-red-500">*</span></label>
                                <input
                                  value={course.name}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[idx].name = e.target.value;
                                    setAdmissionForm((f) => ({ ...f, courses: updated }));
                                  }}
                                  placeholder="e.g. Bachelor of Engineering"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Quarter</label>
                                <select
                                  value={course.intakeQuarter}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[idx].intakeQuarter = e.target.value;
                                    setAdmissionForm((f) => ({ ...f, courses: updated }));
                                  }}
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="">Select quarter</option>
                                  <option value="Q1">Q1 - Jan / Feb / Mar</option>
                                  <option value="Q2">Q2 - Apr / May / Jun</option>
                                  <option value="Q3">Q3 - Jul / Aug / Sep</option>
                                  <option value="Q4">Q4 - Oct / Nov / Dec</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Year</label>
                                <input
                                  value={course.intakeYear}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[idx].intakeYear = e.target.value;
                                    setAdmissionForm((f) => ({ ...f, courses: updated }));
                                  }}
                                  placeholder="e.g. 2026"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Commencement Date</label>
                                <input
                                  type="date"
                                  value={course.commencementDate}
                                  onChange={(e) => {
                                    const updated = [...admissionForm.courses];
                                    updated[idx].commencementDate = e.target.value;
                                    setAdmissionForm((f) => ({ ...f, courses: updated }));
                                  }}
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        disabled={!admissionForm.country || admissionForm.courses.some((course) => !course.name) || savingAdmission}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {savingAdmission ? "Saving..." : "Save Entry"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAdmissionForm(false);
                          setAdmissionForm({
                            country: "",
                            universityName: "",
                            location: "",
                            annualTuitionFee: "",
                            standing: "",
                            courses: [{ name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }],
                          });
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
                {student.admissionDetails?.map((entry, i) => (
                  <div key={entry._id ?? i} className={`p-4 rounded-xl border transition-all duration-300 relative ${entry.closed ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-100"}`}>
                    {editingAdmission === i ? (
                      <div className="overflow-hidden rounded-lg">
                        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 -mx-4 -mt-4 mb-4">
                          <GraduationCap size={14} className="text-blue-600" />
                          <p className="text-sm font-semibold text-blue-800">Edit Admission Entry</p>
                        </div>
                        <div className="space-y-5">
                          <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">University Details</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country <span className="text-red-500">*</span></label>
                                <select
                                  value={editAdmissionForm.country}
                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, country: e.target.value }))}
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="">Select country</option>
                                  {student.countries?.map((c) => (
                                    <option key={c.country} value={c.country}>{c.country}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">University Name</label>
                                <input
                                  value={editAdmissionForm.universityName}
                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, universityName: e.target.value }))}
                                  placeholder="e.g. University of Melbourne"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location / Campus</label>
                                <input
                                  value={editAdmissionForm.location}
                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, location: e.target.value }))}
                                  placeholder="e.g. Melbourne, Sydney"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual Tuition Fee</label>
                                <input
                                  value={editAdmissionForm.annualTuitionFee}
                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, annualTuitionFee: e.target.value }))}
                                  placeholder="e.g. AUD 32,000"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Standing</label>
                                <div className="flex gap-2 flex-wrap">
                                  {(["heated", "warm", "cold", "out_of_contact"] as const).map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setEditAdmissionForm((f) => ({ ...f, standing: f.standing === s ? "" : s }))}
                                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                                        editAdmissionForm.standing === s
                                          ? s === "heated"
                                            ? "bg-red-500 text-white border-red-500"
                                            : s === "warm"
                                              ? "bg-amber-400 text-white border-amber-400"
                                              : s === "cold"
                                                ? "bg-blue-400 text-white border-blue-400"
                                                : "bg-gray-500 text-white border-gray-500"
                                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                                      }`}
                                    >
                                      {s.replace(/_/g, " ")}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-gray-100 pt-5">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Courses</p>
                              <button
                                type="button"
                                onClick={() => setEditAdmissionForm((f) => ({
                                  ...f,
                                  courses: [...f.courses, { name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }],
                                }))}
                                className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:text-blue-700"
                              >
                                <Plus size={12} /> Add Course
                              </button>
                            </div>
                            <div className="space-y-3">
                              {editAdmissionForm.courses.map((course, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                  {editAdmissionForm.courses.length > 1 && (
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-semibold text-gray-500">Course {idx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditAdmissionForm((f) => ({
                                          ...f,
                                          courses: f.courses.filter((_, courseIndex) => courseIndex !== idx),
                                        }))}
                                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                      >
                                        <Trash2 size={11} /> Remove
                                      </button>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Name <span className="text-red-500">*</span></label>
                                      <input
                                        value={course.name}
                                        onChange={(e) => {
                                          const updated = [...editAdmissionForm.courses];
                                          updated[idx].name = e.target.value;
                                          setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                        }}
                                        placeholder="e.g. Bachelor of Engineering"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Quarter</label>
                                      <select
                                        value={course.intakeQuarter}
                                        onChange={(e) => {
                                          const updated = [...editAdmissionForm.courses];
                                          updated[idx].intakeQuarter = e.target.value;
                                          setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                        }}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                      >
                                        <option value="">Select quarter</option>
                                        <option value="Q1">Q1 - Jan / Feb / Mar</option>
                                        <option value="Q2">Q2 - Apr / May / Jun</option>
                                        <option value="Q3">Q3 - Jul / Aug / Sep</option>
                                        <option value="Q4">Q4 - Oct / Nov / Dec</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Year</label>
                                      <input
                                        value={course.intakeYear}
                                        onChange={(e) => {
                                          const updated = [...editAdmissionForm.courses];
                                          updated[idx].intakeYear = e.target.value;
                                          setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                        }}
                                        placeholder="e.g. 2026"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Commencement Date</label>
                                      <input
                                        type="date"
                                        value={course.commencementDate}
                                        onChange={(e) => {
                                          const updated = [...editAdmissionForm.courses];
                                          updated[idx].commencementDate = e.target.value;
                                          setEditAdmissionForm((f) => ({ ...f, courses: updated }));
                                        }}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1 border-t border-gray-100">
                            <button
                              onClick={() => updateAdmissionDetail(i)}
                              disabled={!editAdmissionForm.country || editAdmissionForm.courses.some((course) => !course.name) || savingAdmission}
                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                              {savingAdmission ? "Saving..." : "Update Entry"}
                            </button>
                            <button
                              onClick={() => setEditingAdmission(null)}
                              className="px-5 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap" style={entry.closed ? { opacity: 0.5 } : {}}>
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{entry.country}</span>
                            {entry.universityName && <span className="text-sm font-bold text-gray-900">{entry.universityName}</span>}
                            {entry.standing && (
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                entry.standing === "heated"
                                  ? "bg-red-100 text-red-700"
                                  : entry.standing === "hot"
                                    ? "bg-orange-100 text-orange-700"
                                    : entry.standing === "warm"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-700"
                              }`}>
                                {entry.standing.replace(/_/g, " ")}
                              </span>
                            )}
                            {entry.closed && (
                              <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-wide border border-red-200" style={{ opacity: 1 }}>Closed</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-3 shrink-0">
                            {canToggleAdmission && (
                              <button
                                onClick={() => toggleAdmissionClosed(i)}
                                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                                  entry.closed
                                    ? "text-green-600 hover:bg-green-50 hover:text-green-700"
                                    : "text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                                }`}
                                title={entry.closed ? "Reopen entry" : "Close entry"}
                              >
                                {entry.closed ? <Unlock size={13} /> : <Lock size={13} />}
                                <span className="text-[11px]">{entry.closed ? "Open" : "Close"}</span>
                              </button>
                            )}
                            {canAdmission && !entry.closed && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingAdmission(i);
                                    setEditAdmissionForm({
                                      country: entry.country,
                                      universityName: entry.universityName || "",
                                      location: entry.location || "",
                                      annualTuitionFee: entry.annualTuitionFee || "",
                                      standing: entry.standing || "",
                                      courses: entry.courses || [],
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
                              </>
                            )}
                          </div>
                        </div>

                        <div className={`transition-all duration-300 ${entry.closed ? "opacity-40 blur-sm pointer-events-none" : ""}`}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                            {entry.location && (
                              <div className="flex items-start gap-2">
                                <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Location</p>
                                  <p className="text-sm text-gray-700">{entry.location}</p>
                                </div>
                              </div>
                            )}
                            {entry.annualTuitionFee && (
                              <div className="flex items-start gap-2">
                                <DollarSign size={13} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tuition Fee</p>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {entry.annualTuitionFee} <span className="text-xs font-normal text-gray-400">/ yr</span>
                                  </p>
                                </div>
                              </div>
                            )}
                            {entry.createdAt && (
                              <div className="flex items-start gap-2">
                                <Calendar size={13} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Added On</p>
                                  <p className="text-sm text-gray-700">{new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {entry.courses && entry.courses.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <BookOpen size={11} /> Courses ({entry.courses.length})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {entry.courses.map((course, idx) => (
                                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-sm font-semibold text-gray-900 mb-1">{course.name}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      {(course.intakeQuarter || course.intakeYear) && (
                                        <span className="flex items-center gap-1">
                                          <Calendar size={10} />
                                          {course.intakeQuarter}{course.intakeQuarter && course.intakeYear && " "}{course.intakeYear}
                                        </span>
                                      )}
                                      {course.commencementDate && (
                                        <span className="text-gray-400">
                                          Starts {new Date(course.commencementDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

              {(!student.admissionDetails || student.admissionDetails.length === 0) && !showAdmissionForm && (
                <p className="text-sm text-gray-400 text-center py-4">No admission details added yet</p>
              )}

              <div className="space-y-3">
                {student.admissionDetails?.map((entry, i) => (
                  <div key={entry._id ?? i} className={`p-4 rounded-xl border transition-all duration-300 relative ${entry.closed ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-100"}`}>
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
                      <div>
                        {/* Action buttons - always clear, not blurred */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap" style={entry.closed ? { opacity: 0.5 } : {}}>
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{entry.country}</span>
                            {entry.universityName && <span className="text-sm font-bold text-gray-900">{entry.universityName}</span>}
                            {entry.standing && (
                              <div className="space-y-3">
                                {student.admissionDetails?.map((entry, i) => (
                                  <div key={entry._id ?? i} className={`p-4 rounded-xl border transition-all duration-300 relative ${entry.closed ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-100"}`}>
                                    {editingAdmission === i ? (
                                      <div className="overflow-hidden rounded-lg">
                                        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 -mx-4 -mt-4 mb-4">
                                          <GraduationCap size={14} className="text-blue-600" />
                                          <p className="text-sm font-semibold text-blue-800">Edit Admission Entry</p>
                                        </div>
                                        <div className="space-y-5">
                                          <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">University Details</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country <span className="text-red-500">*</span></label>
                                                <select value={editAdmissionForm.country}
                                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, country: e.target.value }))}
                                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                >
                                                  <option value="">Select country</option>
                                                  {student.countries?.map((c) => (
                                                    <option key={c.country} value={c.country}>{c.country}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">University Name</label>
                                                <input value={editAdmissionForm.universityName}
                                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, universityName: e.target.value }))}
                                                  placeholder="e.g. University of Melbourne"
                                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location / Campus</label>
                                                <input value={editAdmissionForm.location}
                                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, location: e.target.value }))}
                                                  placeholder="e.g. Melbourne, Sydney"
                                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual Tuition Fee</label>
                                                <input value={editAdmissionForm.annualTuitionFee}
                                                  onChange={(e) => setEditAdmissionForm((f) => ({ ...f, annualTuitionFee: e.target.value }))}
                                                  placeholder="e.g. AUD 32,000"
                                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                              </div>
                                              <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Standing</label>
                                                <div className="flex gap-2 flex-wrap">
                                                  {(["heated", "warm", "cold", "out_of_contact"] as const).map((s) => (
                                                    <button key={s} type="button"
                                                      onClick={() => setEditAdmissionForm((f) => ({ ...f, standing: f.standing === s ? "" : s }))}
                                                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                                                        editAdmissionForm.standing === s
                                                          ? s === "heated" ? "bg-red-500 text-white border-red-500"
                                                          : s === "warm" ? "bg-amber-400 text-white border-amber-400"
                                                          : s === "cold" ? "bg-blue-400 text-white border-blue-400"
                                                          : "bg-gray-500 text-white border-gray-500"
                                                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                                                      }`}
                                                    >{s.replace(/_/g, " ")}</button>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="border-t border-gray-100 pt-5">
                                            <div className="flex items-center justify-between mb-3">
                                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Courses</p>
                                              <button type="button"
                                                onClick={() => setEditAdmissionForm((f) => ({ ...f, courses: [...f.courses, { name: "", intakeQuarter: "", intakeYear: "", commencementDate: "" }] }))}
                                                className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:text-blue-700"
                                              ><Plus size={12} /> Add Course</button>
                                            </div>
                                            <div className="space-y-3">
                                              {editAdmissionForm.courses.map((course, idx) => (
                                                <div key={idx} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                  {editAdmissionForm.courses.length > 1 && (
                                                    <div className="flex items-center justify-between mb-3">
                                                      <span className="text-xs font-semibold text-gray-500">Course {idx + 1}</span>
                                                      <button type="button"
                                                        onClick={() => setEditAdmissionForm((f) => ({ ...f, courses: f.courses.filter((_, ci) => ci !== idx) }))}
                                                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                                      ><Trash2 size={11} /> Remove</button>
                                                    </div>
                                                  )}
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="sm:col-span-2">
                                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Name <span className="text-red-500">*</span></label>
                                                      <input value={course.name}
                                                        onChange={(e) => { const u = [...editAdmissionForm.courses]; u[idx].name = e.target.value; setEditAdmissionForm((f) => ({ ...f, courses: u })); }}
                                                        placeholder="e.g. Bachelor of Engineering"
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Quarter</label>
                                                      <select value={course.intakeQuarter}
                                                        onChange={(e) => { const u = [...editAdmissionForm.courses]; u[idx].intakeQuarter = e.target.value; setEditAdmissionForm((f) => ({ ...f, courses: u })); }}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                      >
                                                        <option value="">Select quarter</option>
                                                        <option value="Q1">Q1 — Jan / Feb / Mar</option>
                                                        <option value="Q2">Q2 — Apr / May / Jun</option>
                                                        <option value="Q3">Q3 — Jul / Aug / Sep</option>
                                                        <option value="Q4">Q4 — Oct / Nov / Dec</option>
                                                      </select>
                                                    </div>
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Year</label>
                                                      <input value={course.intakeYear}
                                                        onChange={(e) => { const u = [...editAdmissionForm.courses]; u[idx].intakeYear = e.target.value; setEditAdmissionForm((f) => ({ ...f, courses: u })); }}
                                                        placeholder="e.g. 2026"
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Commencement Date</label>
                                                      <input type="date" value={course.commencementDate}
                                                        onChange={(e) => { const u = [...editAdmissionForm.courses]; u[idx].commencementDate = e.target.value; setEditAdmissionForm((f) => ({ ...f, courses: u })); }}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="flex gap-2 pt-1 border-t border-gray-100">
                                            <button onClick={() => updateAdmissionDetail(i)}
                                              disabled={!editAdmissionForm.country || editAdmissionForm.courses.some(c => !c.name) || savingAdmission}
                                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
                                            >{savingAdmission ? "Saving…" : "Update Entry"}</button>
                                            <button onClick={() => setEditingAdmission(null)}
                                              className="px-5 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                                            >Cancel</button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2 flex-wrap" style={entry.closed ? { opacity: 0.5 } : {}}>
                                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{entry.country}</span>
                                            {entry.universityName && <span className="text-sm font-bold text-gray-900">{entry.universityName}</span>}
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
                                            {entry.closed && (
                                              <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-wide border border-red-200" style={{ opacity: 1 }}>Closed</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 ml-3 shrink-0">
                                            {canToggleAdmission && (
                                              <button
                                                onClick={() => toggleAdmissionClosed(i)}
                                                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                                                  entry.closed
                                                    ? "text-green-600 hover:bg-green-50 hover:text-green-700"
                                                    : "text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                                                }`}
                                                title={entry.closed ? "Reopen entry" : "Close entry"}
                                              >
                                                {entry.closed ? <Unlock size={13} /> : <Lock size={13} />}
                                                <span className="text-[11px]">{entry.closed ? "Open" : "Close"}</span>
                                              </button>
                                            )}
                                            {canAdmission && !entry.closed && (
                                              <>
                                                <button
                                                  onClick={() => {
                                                    setEditingAdmission(i);
                                                    setEditAdmissionForm({
                                                      country: entry.country,
                                                      universityName: entry.universityName || "",
                                                      location: entry.location || "",
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
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className={`transition-all duration-300 ${entry.closed ? "opacity-40 blur-sm pointer-events-none" : ""}`}>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                                            {entry.location && (
                                              <div className="flex items-start gap-2">
                                                <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div>
                                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Location</p>
                                                  <p className="text-sm text-gray-700">{entry.location}</p>
                                                </div>
                                              </div>
                                            )}
                                            {entry.annualTuitionFee && (
                                              <div className="flex items-start gap-2">
                                                <DollarSign size={13} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div>
                                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tuition Fee</p>
                                                  <p className="text-sm font-semibold text-gray-800">{entry.annualTuitionFee} <span className="text-xs font-normal text-gray-400">/ yr</span></p>
                                                </div>
                                              </div>
                                            )}
                                            {entry.createdAt && (
                                              <div className="flex items-start gap-2">
                                                <Calendar size={13} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div>
                                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Added On</p>
                                                  <p className="text-sm text-gray-700">{new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          {entry.courses && entry.courses.length > 0 && (
                                            <div className="border-t border-gray-200 pt-3">
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                <BookOpen size={11} /> Courses ({entry.courses.length})
                                              </p>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {entry.courses.map((course, idx) => (
                                                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                                                    <p className="text-sm font-semibold text-gray-900 mb-1">{course.name}</p>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                      {(course.intakeQuarter || course.intakeYear) && (
                                                        <span className="flex items-center gap-1">
                                                          <Calendar size={10} />
                                                          {course.intakeQuarter}{course.intakeQuarter && course.intakeYear && " "}{course.intakeYear}
                                                        </span>
                                                      )}
                                                      {course.commencementDate && (
                                                        <span className="text-gray-400">Starts {new Date(course.commencementDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
            </div>
          )}
          {/* Visa Approval */}
