import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";
import { getAppSettingsDocumentForSession } from "@/lib/appSettingsScope";
import { DEFAULT_APPLICATION_ROLES, normalizeApplicationRoles } from "@/lib/applicationRoles";
import { DEFAULT_TELECALLER_TRANSFER_OUTCOMES, normalizeTelecallerTransferOutcomes } from "@/lib/telecallerTransferConfig";
import { normalizeUniversitiesArray } from "@/lib/countryUniversities";
import { FD_STATUSES } from "@/lib/utils";
import { normalizeInventoryCategories, normalizeInventoryUnits } from "@/lib/inventoryConfig";

export const dynamic = "force-dynamic";

// GET - public for login branding (no session → platform row); authenticated users get their tenant row.
export async function GET() {
  try {
    await connectDB();
    const session = await auth();
    const settings = await getAppSettingsDocumentForSession(session);

    const DEFAULT_REMARK_OPTIONS = [
      "Additional Documents Requested", "Additional Documents Sent",
      "Interview - GS/Cr./Visa", "Interview Cleared", "Payment Made",
      "Medical Requested/Booked", "Passport Submitted",
      "DS-160/VFS/Embassy Appointment", "Pink Slip", "NOC",
      "Defer Offer Requested", "Defer CoE Requested",
      "Refund Requested", "Offer Withdrawn", "Done",
    ];

    const DEFAULT_COURSES = [
      "Bachelor of IT",
      "Bachelor of Nursing",
      "Bachelor of Business",
      "Master of IT",
      "Bachelor of Community Services",
      "Master of Business Analyst",
      "Master of Business Administration",
    ];
    const DEFAULT_LEAD_SOURCES = [
      "Walk-in",
      "Capture Visit",
      "Facebook",
      "WhatsApp",
      "Instagram",
      "Website",
      "Referral",
      "Other",
    ];
    const MANDATORY_FD_STATUSES = ["Phone Counselling", "Online Counselling"];

    const defaultCountryStages = {
        "United Kingdom": [
          { value: "offer_applied",         label: "Offer Applied",         pipeline: "Offer" },
          { value: "conditional_offer",      label: "Conditional Offer",     pipeline: "Offer" },
          { value: "unconditional_offer",    label: "Unconditional Offer",   pipeline: "Offer" },
          { value: "offer_reject",           label: "Offer Reject",          pipeline: "Offer" },
          { value: "coe_applied",            label: "CoE Applied",           pipeline: "COE"   },
          { value: "coe_received",           label: "CoE Received",          pipeline: "COE"   },
          { value: "coe_withdrawn_reject",   label: "CoE Withdrawn/Reject",  pipeline: "COE"   },
          { value: "visa_applied",           label: "Visa Applied",          pipeline: "Visa"  },
          { value: "visa_grant",             label: "Visa Grant",            pipeline: "Visa"  },
          { value: "visa_reject",            label: "Visa Reject",           pipeline: "Visa"  },
          { value: "visa_withdrawn",         label: "Visa Withdrawn",        pipeline: "Visa"  },
          { value: "visa_reapply",           label: "Visa Reapply",          pipeline: "Visa"  },
        ],
        "New Zealand": [
          { value: "offer_applied",         label: "Offer Applied",         pipeline: "Offer" },
          { value: "conditional_offer",      label: "Conditional Offer",     pipeline: "Offer" },
          { value: "unconditional_offer",    label: "Unconditional Offer",   pipeline: "Offer" },
          { value: "offer_reject",           label: "Offer Reject",          pipeline: "Offer" },
          { value: "visa_applied",           label: "Visa Applied",          pipeline: "Visa"  },
          { value: "aip",                    label: "AIP",                   pipeline: "Visa"  },
          { value: "visa_grant",             label: "Visa Grant",            pipeline: "Visa"  },
          { value: "visa_reject",            label: "Visa Reject",           pipeline: "Visa"  },
          { value: "visa_withdrawn",         label: "Visa Withdrawn",        pipeline: "Visa"  },
          { value: "visa_reapply",           label: "Visa Reapply",          pipeline: "Visa"  },
        ],
        "United States": [
          { value: "offer_applied",         label: "Offer Applied",         pipeline: "Offer" },
          { value: "conditional_offer",      label: "Conditional Offer",     pipeline: "Offer" },
          { value: "unconditional_offer",    label: "Unconditional Offer",   pipeline: "Offer" },
          { value: "offer_reject",           label: "Offer Reject",          pipeline: "Offer" },
          { value: "coe_applied",            label: "CoE Applied",           pipeline: "COE"   },
          { value: "coe_received",           label: "CoE Received",          pipeline: "COE"   },
          { value: "visa_applied",           label: "Visa Applied",          pipeline: "Visa"  },
          { value: "visa_grant",             label: "Visa Grant",            pipeline: "Visa"  },
          { value: "visa_reject",            label: "Visa Reject",           pipeline: "Visa"  },
          { value: "visa_withdrawn",         label: "Visa Withdrawn",        pipeline: "Visa"  },
          { value: "visa_reapply",           label: "Visa Reapply",          pipeline: "Visa"  },
        ],
        "Canada": [
          { value: "offer_applied",         label: "Offer Applied",         pipeline: "Offer" },
          { value: "conditional_offer",      label: "Conditional Offer",     pipeline: "Offer" },
          { value: "unconditional_offer",    label: "Unconditional Offer",   pipeline: "Offer" },
          { value: "offer_reject",           label: "Offer Reject",          pipeline: "Offer" },
          { value: "coe_applied",            label: "CoE Applied",           pipeline: "COE"   },
          { value: "coe_received",           label: "CoE Received",          pipeline: "COE"   },
          { value: "pal_applied",            label: "PAL Applied",           pipeline: "COE"   },
          { value: "pal_received",           label: "PAL Received",          pipeline: "COE"   },
          { value: "visa_applied",           label: "Visa Applied",          pipeline: "Visa"  },
          { value: "ppr",                    label: "PPR",                   pipeline: "Visa"  },
          { value: "visa_grant",             label: "Visa Grant",            pipeline: "Visa"  },
          { value: "visa_reject",            label: "Visa Reject",           pipeline: "Visa"  },
          { value: "visa_withdrawn",         label: "Visa Withdrawn",        pipeline: "Visa"  },
          { value: "visa_reapply",           label: "Visa Reapply",          pipeline: "Visa"  },
        ],
        "Germany": [
          { value: "offer_applied",         label: "Offer Applied",         pipeline: "Offer" },
          { value: "conditional_offer",      label: "Conditional Offer",     pipeline: "Offer" },
          { value: "unconditional_offer",    label: "Unconditional Offer",   pipeline: "Offer" },
          { value: "offer_reject",           label: "Offer Reject",          pipeline: "Offer" },
          { value: "coe_applied",            label: "CoE Applied",           pipeline: "COE"   },
          { value: "coe_received",           label: "CoE Received",          pipeline: "COE"   },
          { value: "visa_applied",           label: "Visa Applied",          pipeline: "Visa"  },
          { value: "visa_grant",             label: "Visa Grant",            pipeline: "Visa"  },
          { value: "visa_reject",            label: "Visa Reject",           pipeline: "Visa"  },
          { value: "visa_withdrawn",         label: "Visa Withdrawn",        pipeline: "Visa"  },
          { value: "visa_reapply",           label: "Visa Reapply",          pipeline: "Visa"  },
        ],
        "Finland": [
          { value: "offer_applied",         label: "Offer Applied",         pipeline: "Offer" },
          { value: "conditional_offer",      label: "Conditional Offer",     pipeline: "Offer" },
          { value: "unconditional_offer",    label: "Unconditional Offer",   pipeline: "Offer" },
          { value: "offer_reject",           label: "Offer Reject",          pipeline: "Offer" },
          { value: "coe_applied",            label: "CoE Applied",           pipeline: "COE"   },
          { value: "coe_received",           label: "CoE Received",          pipeline: "COE"   },
          { value: "visa_applied",           label: "Visa Applied",          pipeline: "Visa"  },
          { value: "visa_grant",             label: "Visa Grant",            pipeline: "Visa"  },
          { value: "visa_reject",            label: "Visa Reject",           pipeline: "Visa"  },
          { value: "visa_withdrawn",         label: "Visa Withdrawn",        pipeline: "Visa"  },
          { value: "visa_reapply",           label: "Visa Reapply",          pipeline: "Visa"  },
        ],
      };

    // Use lean() for the JSON response to bypass Mongoose schema projection.
    // This ensures fields added after the model was first compiled (e.g. after a
    // hot-reload) are always included - toObject() only returns schema-known fields.
    const json = (await AppSettings.findById(settings._id).lean()) ?? settings.toObject();
    const isPlatformRow = settings.organization == null;

    // Safety fallbacks in case the DB document is somehow missing a field
    if (isPlatformRow) {
      if (!Array.isArray(json.remarkOptions) || json.remarkOptions.length === 0) {
        json.remarkOptions = DEFAULT_REMARK_OPTIONS;
      }
      if (!Array.isArray(json.courses) || json.courses.length === 0) {
        json.courses = DEFAULT_COURSES;
      }
      if (!Array.isArray(json.leadSources) || json.leadSources.length === 0) {
        json.leadSources = DEFAULT_LEAD_SOURCES;
      } else {
        const mergedLeadSources = [...json.leadSources];
        for (const src of DEFAULT_LEAD_SOURCES) {
          if (!mergedLeadSources.includes(src)) mergedLeadSources.push(src);
        }
        json.leadSources = mergedLeadSources;
      }
      if (!Array.isArray(json.educationLevels) || json.educationLevels.length === 0) {
        json.educationLevels = ["Diploma", "Bachelor", "Master"];
      }
    } else {
      if (!Array.isArray(json.remarkOptions)) json.remarkOptions = [];
      if (!Array.isArray(json.courses)) json.courses = [];
      if (!Array.isArray(json.leadSources)) json.leadSources = [];
      if (!Array.isArray(json.educationLevels)) json.educationLevels = [];
    }
    if (!json.countryStages || typeof json.countryStages !== "object") {
      json.countryStages = {};
    }

    const ro =
      Array.isArray(json.remarkOptions) && json.remarkOptions.length > 0
        ? json.remarkOptions
        : isPlatformRow
          ? DEFAULT_REMARK_OPTIONS
          : [];
    if (!Array.isArray(json.remarkOptionsApplication) || json.remarkOptionsApplication.length === 0) {
      json.remarkOptionsApplication = ro;
    }
    if (!Array.isArray(json.remarkOptionsAdmission) || json.remarkOptionsAdmission.length === 0) {
      json.remarkOptionsAdmission = ro;
    }
    if (!Array.isArray(json.remarkOptionsVisa) || json.remarkOptionsVisa.length === 0) {
      json.remarkOptionsVisa = ro;
    }

    if (!Array.isArray(json.applicationRoles) || json.applicationRoles.length === 0) {
      json.applicationRoles = DEFAULT_APPLICATION_ROLES.map((r) => ({
        slug: r.slug,
        label: r.label,
        defaultPermissions: [...r.defaultPermissions],
      }));
    }
    if (!Array.isArray(json.telecallerTransferOutcomes) || json.telecallerTransferOutcomes.length === 0) {
      json.telecallerTransferOutcomes = DEFAULT_TELECALLER_TRANSFER_OUTCOMES.map((o) => ({ ...o }));
    }
    json.applicationRoles = normalizeApplicationRoles(json.applicationRoles);
    json.telecallerTransferOutcomes = normalizeTelecallerTransferOutcomes(json.telecallerTransferOutcomes);

    if (Array.isArray(json.countries)) {
      json.countries = json.countries.map((c: unknown) => {
        if (typeof c === "string") return { name: c, universities: [] };
        if (c && typeof c === "object" && "name" in c) {
          const o = c as { name: string; universities?: unknown };
          return {
            name: String(o.name ?? ""),
            universities: normalizeUniversitiesArray(o.universities),
          };
        }
        return { name: "", universities: normalizeUniversitiesArray(undefined) };
      });
    }

    if (!json.commissionPercentByCountry || typeof json.commissionPercentByCountry !== "object") {
      json.commissionPercentByCountry = {};
    }
    if (!Array.isArray(json.inventoryCategories) || json.inventoryCategories.length === 0) {
      json.inventoryCategories = normalizeInventoryCategories(undefined);
    } else {
      json.inventoryCategories = normalizeInventoryCategories(json.inventoryCategories);
    }
    if (!Array.isArray(json.inventoryUnits) || json.inventoryUnits.length === 0) {
      json.inventoryUnits = normalizeInventoryUnits(undefined);
    } else {
      json.inventoryUnits = normalizeInventoryUnits(json.inventoryUnits);
    }
    const mods = Array.isArray(json.enabledModules) ? [...json.enabledModules] : [];
    if (!mods.includes("commission")) {
      mods.push("commission");
      json.enabledModules = mods;
    }
    if (!mods.includes("inventory")) {
      mods.push("inventory");
      json.enabledModules = mods;
    }
    if (!mods.includes("hr")) {
      mods.push("hr");
      json.enabledModules = mods;
    }
    if (!mods.includes("chat")) {
      mods.push("chat");
      json.enabledModules = mods;
    }

    if (!Array.isArray(json.fdStatuses)) {
      const docArr = Array.isArray(settings.fdStatuses) ? [...settings.fdStatuses] : [];
      if (docArr.length > 0) {
        json.fdStatuses = docArr;
      } else if (isPlatformRow) {
        json.fdStatuses = FD_STATUSES.map((s) => s.value);
      } else {
        json.fdStatuses = ["Open/Unassigned"];
      }
    }
    if (Array.isArray(json.fdStatuses) && isPlatformRow) {
      const merged = [...json.fdStatuses];
      for (const status of MANDATORY_FD_STATUSES) {
        if (!merged.includes(status)) merged.push(status);
      }
      json.fdStatuses = merged;
    }

    if (isPlatformRow) {
      if (!Array.isArray(json.remarkOptions) || json.remarkOptions.length === 0) {
        json.remarkOptions = DEFAULT_REMARK_OPTIONS;
      }
      const baseRemarks = json.remarkOptions;
      if (!Array.isArray(json.remarkOptionsApplication) || json.remarkOptionsApplication.length === 0) {
        json.remarkOptionsApplication = [...baseRemarks];
      }
      if (!Array.isArray(json.remarkOptionsAdmission) || json.remarkOptionsAdmission.length === 0) {
        json.remarkOptionsAdmission = [...baseRemarks];
      }
      if (!Array.isArray(json.remarkOptionsVisa) || json.remarkOptionsVisa.length === 0) {
        json.remarkOptionsVisa = [...baseRemarks];
      }
      if (!Array.isArray(json.courses) || json.courses.length === 0) {
        json.courses = DEFAULT_COURSES;
      }
      if (!Array.isArray(json.educationLevels) || json.educationLevels.length === 0) {
        json.educationLevels = ["Diploma", "Bachelor", "Master"];
      }
      if (!json.countryStages || Object.keys(json.countryStages).length === 0) {
        json.countryStages = defaultCountryStages;
      }
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error("GET /api/settings/app error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const canEdit = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings");
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    // Build a $set payload only from defined fields to avoid overwriting anything unintentionally
    // Using findOneAndUpdate with $set bypasses Mongoose array-mutation tracking issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const $set: Record<string, any> = {};
    const fields = [
      "companyName", "shortCode", "tagline", "logoPath", "faviconPath", "brandColor", "brandSecondaryColor",
      "address", "phone", "email", "website",
      "leadStatuses", "leadSources", "leadStandings", "fdStatuses",
      "leadStageGroups", "leadStages",
      "b2bNames", "remarkOptions", "remarkOptionsApplication", "remarkOptionsAdmission", "remarkOptionsVisa",
      "countries", "services", "courses", "educationLevels",
      "enabledModules",
      "commissionPercentByCountry",
      "smtpHost", "smtpPort", "smtpUser", "smtpPass", "emailFromName",
      "paymentQrPath",
      "countryStages",
      "applicationRoles",
      "telecallerTransferOutcomes",
      "dashboardWidgets",
      "dashboardWidgetOrder",
      "inventoryCategories",
      "inventoryUnits",
    ];
    for (const field of fields) {
      if (body[field] !== undefined) {
        $set[field] = body[field];
      }
    }

    await connectDB();

    const target = await getAppSettingsDocumentForSession(session);
    const updated = await AppSettings.findByIdAndUpdate(
      target._id,
      { $set },
      { new: true, runValidators: false }
    ).lean();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/settings/app error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
