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
        <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl p-8 mb-6 border-2 border-blue-300 shadow-xl">
          {/* Country Selection (if applicable) */}
          {showCountry && countries && countries.length > 0 && (
            <div className="mb-8 pb-8 border-b-2 border-gradient-to-r from-blue-200 to-indigo-200">
              <label className="block text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <span className="inline-block text-gray-900">🌍 Country *</span>
              </label>
              <select
                value={formData.country}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, country: e.target.value }))
                }
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-200 bg-white font-semibold hover:border-blue-400 transition-all cursor-pointer shadow-sm"
              >
                <option value="">🌐 Select country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stage Radio Buttons */}
          <div className="mb-8 pb-8 border-b-2 border-gradient-to-r from-blue-200 to-indigo-200">
            <label className="block text-sm font-bold text-gray-900 mb-5 uppercase tracking-wider">
              📍 Stage * (Select Your Progress)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STAGE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                    formData.stage === option
                      ? "border-blue-600 bg-gradient-to-br from-blue-100 to-blue-50 shadow-lg ring-2 ring-blue-300"
                      : "border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50 shadow-sm"
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
                    className="w-5 h-5 text-blue-600 cursor-pointer accent-blue-600"
                  />
                  <span className={`ml-3 font-semibold transition-colors ${
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
                placeholder="✏️ Please specify the stage..."
                className="w-full mt-4 px-4 py-3 border-2 border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-200 bg-blue-50 font-medium transition-all shadow-sm"
                autoFocus
              />
            )}
          </div>

          {/* Standing Radio Buttons */}
          <div className="mb-8 pb-8 border-b-2 border-gradient-to-r from-blue-200 to-indigo-200">
            <label className="block text-sm font-bold text-gray-900 mb-5 uppercase tracking-wider">
              🎯 Standing (Lead Quality)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STANDING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                    formData.standing === option.value
                      ? `border-white ${option.color} text-white shadow-xl ring-2 ring-offset-1`
                      : "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 shadow-sm"
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
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span className={`ml-3 font-bold text-sm ${
                    formData.standing === option.value ? "text-white" : "text-gray-700"
                  }`}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div className="mb-8 pb-8 border-b-2 border-gradient-to-r from-blue-200 to-indigo-200">
            <label className="block text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
              📅 Status Date
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
                className="w-full px-4 py-3 pl-5 border-2 border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-200 bg-white font-semibold hover:border-blue-400 transition-all shadow-sm cursor-pointer"
              />
              <Calendar size={20} className="absolute right-4 top-2.5 text-blue-500 pointer-events-none" />
            </div>
          </div>

          {/* Remarks Radio Buttons */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-900 mb-5 uppercase tracking-wider">
              💬 Remarks (Status Update)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {REMARKS_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                    formData.remarks === option
                      ? "border-blue-600 bg-gradient-to-br from-blue-100 to-blue-50 shadow-lg ring-2 ring-blue-300"
                      : "border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50 shadow-sm"
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
                    className="w-5 h-5 text-blue-600 cursor-pointer accent-blue-600"
                  />
                  <span className={`ml-3 font-semibold transition-colors ${
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
                placeholder="✏️ Please provide additional remarks..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-200 bg-blue-50 font-medium transition-all shadow-sm resize-none"
                autoFocus
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-6">
            <button
              onClick={() => setShowForm(false)}
              className="px-8 py-3 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold transition-all border-2 border-transparent hover:border-gray-400 shadow-md hover:shadow-lg"
            >
              ✕ Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:via-blue-400 disabled:to-indigo-400 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:shadow-md"
            >
              {saving ? "💾 Saving..." : "✓ Save Entry"}
            </button>
          </div>
        </div>
      )}

      {/* History Timeline */}
      {sortedHistory.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl text-gray-400 font-bold mb-2">📋 No progress history yet</p>
          <p className="text-md text-gray-400 font-medium">Add your first entry to start tracking progress</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedHistory.map((entry, idx) => (
            <div
              key={entry._id || idx}
              className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-200 p-6 hover:border-blue-400 hover:shadow-xl transition-all duration-300 group"
            >
              {/* Header with Date and User */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-blue-100">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:scale-150 transition-transform shadow-lg"></div>
                  <div>
                    <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">
                      📅 {new Date(entry.statusDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      By {entry.changedByName || "System"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                {showCountry && entry.country && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      🌍 Country
                    </p>
                    <p className="text-sm font-bold text-gray-900">{entry.country}</p>
                  </div>
                )}
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    📌 Stage
                  </p>
                  <p className="text-sm font-bold text-blue-700 bg-blue-100 w-fit px-3 py-1 rounded-lg">
                    {entry.stage}
                  </p>
                </div>
                {entry.standing && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      🎯 Standing
                    </p>
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1.5 rounded-lg border-2 ${getStandingColor(
                        entry.standing
                      )}`}
                    >
                      {entry.standing.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {entry.remarks && (
                <div className="mt-5 pt-4 border-t-2 border-blue-100 bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    💬 Remarks
                  </p>
                  <p className="text-sm text-gray-800 font-semibold italic">"{entry.remarks}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
