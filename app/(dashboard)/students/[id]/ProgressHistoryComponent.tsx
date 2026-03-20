import { useState } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ProgressEntry {
  _id?: string;
  country?: string;
  stage: string;
  remarks: string;
  standing: string;
  statusDate: string;
  changedBy?: string;
  changedByName?: string;
  createdAt?: string;
}

interface ProgressHistoryComponentProps {
  title: string;
  type: "admission" | "visa" | "application";
  studentId: string;
  history: ProgressEntry[];
  onHistoryUpdate: () => Promise<void>;
  showCountry?: boolean;
  countries?: string[];
}

const STAGE_OPTIONS = ["Applied", "Processing", "Submitted", "Approved", "Rejected", "Enrolled", "Other"];
const STANDING_OPTIONS = [
  { value: "hot", label: "🔴 Hot", color: "bg-red-500" },
  { value: "warm", label: "🟠 Warm", color: "bg-amber-500" },
  { value: "heated", label: "🟡 Heated", color: "bg-orange-500" },
  { value: "cold", label: "🔵 Cold", color: "bg-blue-500" },
  { value: "missed", label: "⚪ Missed", color: "bg-gray-500" },
];
const REMARKS_OPTIONS = [
  "Awaiting Documents",
  "Processing Application",
  "Interview Scheduled",
  "Offer Received",
  "Visa Processing",
  "Ready to Enroll",
  "Other",
];

export default function ProgressHistoryComponent({
  title,
  type,
  studentId,
  history,
  onHistoryUpdate,
  showCountry = false,
  countries = [],
}: ProgressHistoryComponentProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    country: "",
    stage: "",
    remarks: "",
    standing: "",
    statusDate: new Date().toISOString().split("T")[0],
    otherStage: "",
    otherRemarks: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const finalStage = formData.stage === "Other" ? formData.otherStage : formData.stage;
    const finalRemarks = formData.remarks === "Other" ? formData.otherRemarks : formData.remarks;

    if (!finalStage) {
      alert("Stage is required");
      return;
    }

    if (showCountry && !formData.country) {
      alert("Country is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/students/${studentId}/${type}-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: formData.country,
          stage: finalStage,
          remarks: finalRemarks,
          standing: formData.standing,
          statusDate: formData.statusDate,
        }),
      });

      if (res.ok) {
        setFormData({
          country: "",
          stage: "",
          remarks: "",
          standing: "",
          statusDate: new Date().toISOString().split("T")[0],
          otherStage: "",
          otherRemarks: "",
        });
        setShowForm(false);
        await onHistoryUpdate();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to save progress"}`);
      }
    } catch (error) {
      alert(`Network error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const sortedHistory = [...history].sort(
    (a, b) =>
      new Date(b.statusDate).getTime() - new Date(a.statusDate).getTime()
  );

  const getStandingColor = (standing: string) => {
    switch (standing) {
      case "hot":
        return "text-red-600 bg-red-50 border-red-200";
      case "warm":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "heated":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "cold":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "missed":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={18} /> Add Entry
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-8 mb-6 border border-blue-200 shadow-lg">
          {/* Country Selection (if applicable) */}
          {showCountry && countries && countries.length > 0 && (
            <div className="mb-7 pb-7 border-b border-blue-100">
              <label className="block text-sm font-semibold text-gray-800 mb-4">
                🌍 Country
              </label>
              <select
                value={formData.country}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, country: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white font-medium hover:border-gray-400 transition-all"
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stage Radio Buttons */}
          <div className="mb-7 pb-7 border-b border-blue-100">
            <label className="block text-sm font-semibold text-gray-800 mb-4">
              📌 Stage
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STAGE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.stage === option
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="stage"
                    value={option}
                    checked={formData.stage === option}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stage: e.target.value }))
                    }
                    className="w-4 h-4 text-blue-500 cursor-pointer"
                  />
                  <span className={`ml-2 text-sm font-medium ${
                    formData.stage === option ? "text-blue-700" : "text-gray-700"
                  }`}>{option}</span>
                </label>
              ))}
            </div>
            {formData.stage === "Other" && (
              <input
                type="text"
                value={formData.otherStage}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, otherStage: e.target.value }))
                }
                placeholder="Specify stage..."
                className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white font-medium transition-all"
                autoFocus
              />
            )}
          </div>

          {/* Standing Radio Buttons */}
          <div className="mb-7 pb-7 border-b border-blue-100">
            <label className="block text-sm font-semibold text-gray-800 mb-4">
              🎯 Standing
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STANDING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.standing === option.value
                      ? `border-blue-500 ${option.color} text-white`
                      : "border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="standing"
                    value={option.value}
                    checked={formData.standing === option.value}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, standing: e.target.value }))
                    }
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className={`ml-2 text-xs font-semibold ${
                    formData.standing === option.value ? "text-white" : "text-gray-700"
                  }`}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div className="mb-7 pb-7 border-b border-blue-100">
            <label className="block text-sm font-semibold text-gray-800 mb-4">
              📅 Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.statusDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    statusDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white font-medium hover:border-gray-400 transition-all"
              />
              <Calendar size={18} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Remarks Radio Buttons */}
          <div className="mb-7">
            <label className="block text-sm font-semibold text-gray-800 mb-4">
              💬 Remarks
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {REMARKS_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.remarks === option
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="remarks"
                    value={option}
                    checked={formData.remarks === option}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="w-4 h-4 text-blue-500 cursor-pointer"
                  />
                  <span className={`ml-2 text-sm font-medium ${
                    formData.remarks === option ? "text-blue-700" : "text-gray-700"
                  }`}>{option}</span>
                </label>
              ))}
            </div>
            {formData.remarks === "Other" && (
              <textarea
                value={formData.otherRemarks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, otherRemarks: e.target.value }))
                }
                placeholder="Add more details..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white font-medium transition-all resize-none"
                autoFocus
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all border border-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* History Timeline */}
      {sortedHistory.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-400 font-medium">No progress history yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first entry to track progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedHistory.map((entry, idx) => (
            <div
              key={entry._id || idx}
              className="bg-white rounded-lg border border-blue-100 p-4 hover:border-blue-300 hover:shadow-md transition-all"
            >
              {/* Header with Date and User */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">
                      {new Date(entry.statusDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.changedByName || "System"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {showCountry && entry.country && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Country</p>
                    <p className="text-sm text-gray-800">{entry.country}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Stage</p>
                  <p className="text-sm font-semibold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded">
                    {entry.stage}
                  </p>
                </div>
                {entry.standing && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Standing</p>
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${getStandingColor(
                        entry.standing
                      )}`}
                    >
                      {entry.standing.charAt(0).toUpperCase() + entry.standing.slice(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {entry.remarks && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Remarks</p>
                  <p className="text-sm text-gray-700">{entry.remarks}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
