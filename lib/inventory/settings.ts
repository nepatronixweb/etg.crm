import type { Session } from "next-auth";
import connectDB from "@/lib/mongodb";
import { getAppSettingsLeanForOrganizationId } from "@/lib/appSettingsScope";
import {
  normalizeInventoryCategories,
  normalizeInventoryUnits,
  type InventoryCategoryDef,
} from "@/lib/inventoryConfig";

export type InventoryConfig = {
  categories: InventoryCategoryDef[];
  units: string[];
};

export async function getInventoryConfigForSession(session: Session): Promise<InventoryConfig> {
  await connectDB();
  const orgId = session.user.organizationId ?? null;
  const settings = await getAppSettingsLeanForOrganizationId(orgId);
  return {
    categories: normalizeInventoryCategories(settings?.inventoryCategories),
    units: normalizeInventoryUnits(settings?.inventoryUnits),
  };
}
