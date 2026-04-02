import { GraduationCap, FileText, ExternalLink } from "lucide-react";
import type { UniversityEntry } from "@/lib/countryUniversities";

function formatRequirementLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function UniRequirementsRich({ text }: { text: string }) {
  const lines = formatRequirementLines(text);
  if (lines.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic leading-relaxed">
        No requirements added yet. Edit in Settings → Countries & Services.
      </p>
    );
  }
  const bulletLike =
    lines.length > 1 || lines.some((l) => /^[•\-*✓·]\s?/.test(l));
  if (bulletLike) {
    return (
      <ul className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-amber-600 font-bold leading-[1.4] shrink-0">•</span>
            <span className="min-w-0">{line.replace(/^[\s•\-*✓·]+/, "")}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text.trim()}</p>;
}

export function UniversityRequirementCard({ uni, brandColor }: { uni: UniversityEntry; brandColor: string }) {
  const hasDocs = uni.attachments && uni.attachments.length > 0;
  return (
    <article className="rounded-2xl border border-gray-200/90 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50/90 to-white flex items-start gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${brandColor}14` }}
        >
          <GraduationCap size={18} style={{ color: brandColor }} />
        </div>
        <h4 className="font-semibold text-gray-900 text-sm leading-snug pt-1">{uni.name}</h4>
      </div>
      <div className="px-4 py-3.5 space-y-4 flex-1 flex flex-col">
        <div className="flex-1 min-h-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Requirements</p>
          <div className="rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/30 border border-amber-100/70 px-3 py-2.5">
            <UniRequirementsRich text={uni.requirements} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Documents</p>
          {hasDocs ? (
            <div className="flex flex-wrap gap-2">
              {uni.attachments!.map((att, i) => (
                <a
                  key={`${att.path}-${i}`}
                  href={att.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 max-w-full min-w-0 px-3 py-2 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-100/90 text-xs font-medium text-blue-900 hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <FileText size={14} className="text-blue-500 shrink-0 group-hover:scale-105 transition-transform" />
                  <span className="truncate min-w-0">{att.originalName || "Document"}</span>
                  <ExternalLink size={12} className="text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No documents attached.</p>
          )}
        </div>
      </div>
    </article>
  );
}
