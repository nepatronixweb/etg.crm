/** Map a student (visa-granted pipeline) into commission form fields. */

export type CommissionFormShape = {
  destinationCountry: string;
  applicantName: string;
  studentId: string;
  universityName: string;
  courseStartDate: string;
  courseEndDate: string;
  courseAnnualFee: string;
  tuitionFeePaid: string;
  intakeQuarter: "" | "Q1" | "Q2" | "Q3" | "Q4";
  intakeYear: string;
  b2bName: string;
  b2bChannel: "" | "direct" | "sub_agent";
};

type LooseCourse = {
  name?: string;
  commencementDate?: string;
  courseEndDate?: string;
  intakeQuarter?: string;
  intakeYear?: string;
};

type LooseAdmission = {
  country?: string;
  universityName?: string;
  annualTuitionFee?: string;
  studentId?: string;
  tuitionFeesPaid?: string;
  stage?: string;
  closed?: boolean;
  b2bAgentType?: string;
  b2bName?: string;
  courses?: LooseCourse[];
};

type LooseCountry = { country?: string; visaApprovedAt?: string | Date | null; visaStatus?: string };

export type LooseStudentForCommission = {
  _id: string;
  name: string;
  stage?: string;
  admissionDetails?: LooseAdmission[];
  countries?: LooseCountry[];
};

function normalizeDateForInput(raw?: string): string {
  if (!raw || typeof raw !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return "";
  return new Date(t).toISOString().slice(0, 10);
}

const QSET = new Set(["Q1", "Q2", "Q3", "Q4"]);

export function pickAdmissionForCommission(s: LooseStudentForCommission): {
  detail: LooseAdmission | null;
  destinationCountry: string;
} {
  const open = (s.admissionDetails || []).filter((a) => !a.closed);
  let detail = open.find((a) => a.stage === "visa_grant");
  if (!detail) {
    const withVisa = s.countries?.find((c) => c.visaApprovedAt != null && c.visaApprovedAt !== "");
    if (withVisa) {
      detail = open.find((a) => a.country === withVisa.country) ?? open[0];
    } else {
      detail = open[0];
    }
  }
  const dest =
    detail?.country ||
    s.countries?.find((c) => c.visaApprovedAt != null)?.country ||
    s.countries?.[0]?.country ||
    "";
  return { detail: detail ?? null, destinationCountry: dest };
}

export function studentToCommissionForm(s: LooseStudentForCommission): CommissionFormShape {
  const { detail, destinationCountry } = pickAdmissionForCommission(s);
  const course = detail?.courses?.[0];
  let b2bChannel: CommissionFormShape["b2bChannel"] = "";
  if (detail?.b2bAgentType === "Agent") b2bChannel = "direct";
  if (detail?.b2bAgentType === "Sub-Agent") b2bChannel = "sub_agent";

  const iq = course?.intakeQuarter ?? "";
  const intakeQuarter = QSET.has(iq) ? (iq as CommissionFormShape["intakeQuarter"]) : "";

  return {
    destinationCountry,
    applicantName: s.name || "",
    studentId: detail?.studentId || String(s._id),
    universityName: detail?.universityName || "",
    courseStartDate: normalizeDateForInput(course?.commencementDate),
    courseEndDate: normalizeDateForInput(course?.courseEndDate),
    courseAnnualFee: detail?.annualTuitionFee || "",
    tuitionFeePaid: detail?.tuitionFeesPaid || "",
    intakeQuarter,
    intakeYear: course?.intakeYear || "",
    b2bName: detail?.b2bName || "",
    b2bChannel,
  };
}
