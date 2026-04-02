/** Maps admission-detail `pipeline` (Offer, GS, COE, Visa, Application) to settings remark lists. */

export type DeptRemarkLists = {
  application: string[];
  admission: string[];
  visa: string[];
};

export type RemarkDepartmentKey = keyof DeptRemarkLists;

/** Pipeline values come from stage→pipeline mapping (e.g. Application, Offer, GS, COE, Visa). */
export function pipelineToRemarkDepartment(pipeline?: string | null): RemarkDepartmentKey | null {
  const pl = (pipeline || "").trim().toLowerCase();
  if (pl === "visa") return "visa";
  if (["offer", "gs", "coe"].includes(pl)) return "admission";
  if (pl === "application") return "application";
  return null;
}

/** Department-specific remarks first, then global (deduped). */
export function mergeRemarksForPipeline(
  pipeline: string | undefined | null,
  globalRemarks: string[],
  byDept: DeptRemarkLists
): string[] {
  const key = pipelineToRemarkDepartment(pipeline);
  const dept = key ? (byDept[key] ?? []).filter(Boolean) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of [...dept, ...globalRemarks]) {
    const t = String(r).trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
