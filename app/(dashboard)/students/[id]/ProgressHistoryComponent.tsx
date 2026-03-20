import { useState } from "react";
import { Plus, Trash2, Calendar, ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { FormGroup, FormSection, INPUT_STYLES, SELECT_STYLES, BUTTON_STYLES } from "@/components/FormComponents";

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
    <FormSection title={title} className="relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-10 -z-10" />
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            {type === "admission"
              ? "Per Country Tracking"
              : type === "visa"
              ? "Per Country Visa History"
              : "Global Application Status"}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`${BUTTON_STYLES.small} flex items-center gap-2`}
        >
          <Plus size={15} /> Add Entry
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl p-6 mb-5 border-2 border-blue-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {showCountry && countries && countries.length > 0 && (
              <FormGroup
                label="Country"
                required
              >
                <div className="relative">
                  <select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className={`${SELECT_STYLES.full} ${SELECT_STYLES.arrow}`}
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-gray-600 pointer-events-none" />
                </div>
              </FormGroup>
            )}
            <FormGroup label="Stage" required>
              <input
                type="text"
                value={formData.stage}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stage: e.target.value }))
                }
                placeholder="e.g., Applied, Processing, Approved..."
                className={INPUT_STYLES.full}
              />
            </FormGroup>
            <FormGroup label="Standing">
              <div className="relative">
                <select
                  value={formData.standing}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      standing: e.target.value,
                    }))
                  }
                  className={`${SELECT_STYLES.full} ${SELECT_STYLES.arrow}`}
                >
                  <option value="">Select standing</option>
                  <option value="hot">🔥 Hot</option>
                  <option value="warm">☀️ Warm</option>
                  <option value="heated">🌡️ Heated</option>
                  <option value="cold">❄️ Cold</option>
                  <option value="missed">⏱️ Missed</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3 text-gray-600 pointer-events-none" />
              </div>
            </FormGroup>
            <FormGroup label="Status Date">
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
                  className={INPUT_STYLES.full}
                />
                <Calendar size={16} className="absolute right-3 top-3 text-blue-600 pointer-events-none" />
              </div>
            </FormGroup>
          </div>
          <FormGroup label="Remarks" helper="Add any notes or context about this status change">
            <textarea
              value={formData.remarks}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, remarks: e.target.value }))
              }
              placeholder="E.g., Awaiting document submission, Visa interview scheduled..."
              rows={3}
              className={`${INPUT_STYLES.full.replace("py-2.5", "py-3")} resize-none`}
            />
          </FormGroup>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowForm(false)}
              className={BUTTON_STYLES.secondary}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={BUTTON_STYLES.primary}
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      )}

      {sortedHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full mb-3">
            <Calendar size={24} className="text-blue-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">No progress history yet</p>
          <p className="text-xs text-gray-400 mt-1">Start tracking changes by adding your first entry</p>
        </div>
      ) : (
        <div className="space-y-3 relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-blue-300 to-gray-200" />

          {sortedHistory.map((entry, idx) => (
            <div
              key={entry._id || idx}
              className="relative pl-16 group"
            >
              {/* Timeline dot */}
              <div className="absolute left-2 top-2 w-8 h-8 bg-white rounded-full border-3 border-blue-500 shadow-md group-hover:shadow-lg group-hover:border-blue-600 transition-all duration-200 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
              </div>

              {/* Content card */}
              <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 group-hover:translate-x-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  {showCountry && entry.country && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-200 rounded-full px-2 py-1 shrink-0 mt-0.5">
                        Country
                      </span>
                      <span className="text-sm font-semibold text-gray-800 flex-1">{entry.country}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-blue-100 rounded-full px-2 py-1 shrink-0 mt-0.5">
                      Stage
                    </span>
                    <span className="text-sm font-bold text-gray-900 flex-1">{entry.stage}</span>
                  </div>
                  {entry.standing && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-200 rounded-full px-2 py-1 shrink-0 mt-0.5">
                        Standing
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 whitespace-nowrap ${getStandingColor(
                          entry.standing
                        )}`}
                      >
                        {entry.standing.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {entry.remarks && (
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <p className="text-sm text-gray-700 italic bg-gray-100 rounded-lg p-2.5">
                      💭 {entry.remarks}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Calendar size={13} className="text-blue-600" />
                      <span className="font-semibold">
                        {new Date(entry.statusDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                    By {entry.changedByName || "System"}
                  </span>
                </div>
                {entry.createdAt && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    ⏱ {formatDateTime(entry.createdAt)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
