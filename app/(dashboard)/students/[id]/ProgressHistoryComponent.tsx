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
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!formData.stage) {
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
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({
          country: "",
          stage: "",
          remarks: "",
          standing: "",
          statusDate: new Date().toISOString().split("T")[0],
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
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium"
        >
          <Plus size={14} /> Add Entry
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {showCountry && countries && countries.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, country: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Stage *
              </label>
              <input
                type="text"
                value={formData.stage}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stage: e.target.value }))
                }
                placeholder="e.g., Applied, Processing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Standing
              </label>
              <select
                value={formData.standing}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    standing: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select standing</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="heated">Heated</option>
                <option value="cold">Cold</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Status Date
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Calendar size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, remarks: e.target.value }))
              }
              placeholder="Add any notes or remarks..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      )}

      {sortedHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">No progress history yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedHistory.map((entry, idx) => (
            <div
              key={entry._id || idx}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {showCountry && entry.country && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Country:
                    </span>
                    <span className="text-sm text-gray-700">{entry.country}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Stage:
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {entry.stage}
                  </span>
                </div>
                {entry.standing && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Standing:
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded border ${getStandingColor(
                        entry.standing
                      )}`}
                    >
                      {entry.standing}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {new Date(entry.statusDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {entry.remarks && (
                <div className="mb-2">
                  <p className="text-xs text-gray-600">{entry.remarks}</p>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Changed by {entry.changedByName || "System"} •{" "}
                  {entry.createdAt ? formatDateTime(entry.createdAt) : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
