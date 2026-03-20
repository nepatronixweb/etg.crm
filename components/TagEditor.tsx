import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { INPUT_STYLES, BUTTON_STYLES } from "./FormComponents";

interface TagEditorProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  category?: string;
}

export default function TagEditor({
  items,
  onItemsChange,
  placeholder = "Enter item name...",
  label = "Items",
  description,
  category,
}: TagEditorProps) {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const addItem = () => {
    if (input.trim() && !items.includes(input.trim())) {
      onItemsChange([...items, input.trim()]);
      setInput("");
    }
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const getCategoryColor = (cat: string | undefined) => {
    switch (cat) {
      case "branding":
        return "from-purple-600 to-pink-600";
      case "lead":
        return "from-blue-600 to-cyan-600";
      case "course":
        return "from-green-600 to-emerald-600";
      case "country":
        return "from-orange-600 to-red-600";
      case "service":
        return "from-indigo-600 to-blue-600";
      case "remark":
        return "from-amber-600 to-orange-600";
      default:
        return "from-slate-600 to-gray-600";
    }
  };

  return (
    <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-600 hover:text-gray-900 transition-colors p-1"
          >
            <ChevronDown
              size={18}
              className={`transform transition-transform ${isOpen ? "" : "-rotate-90"}`}
            />
          </button>
          <div>
            <h4 className="font-semibold text-gray-900">{label}</h4>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold px-2.5 py-1 rounded-full">
          {items.length}
        </span>
      </div>

      {isOpen && (
        <>
          {/* Input Section */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className={INPUT_STYLES.full}
              />
              <button
                onClick={addItem}
                className={`${BUTTON_STYLES.primary} flex items-center gap-2 shrink-0`}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          </div>

          {/* Items Grid */}
          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No items yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first item to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={`group flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r ${getCategoryColor(
                    category
                  )} bg-opacity-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${getCategoryColor(
                        category
                      )} shrink-0`}
                    />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {item}
                    </span>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
