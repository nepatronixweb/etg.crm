import ActivityLog from "@/models/ActivityLog";
import type { Session } from "next-auth";

export async function logInventoryActivity(
  session: Session,
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "RETURN" | "STOCK_IN" | "STOCK_OUT" | "STOCK_ADJUST" | "STOCK_TRANSFER",
  targetId: string,
  targetName: string,
  details: string
): Promise<void> {
  await ActivityLog.create({
    user: session.user.id,
    userName: session.user.name,
    userRole: session.user.role,
    action,
    module: "Inventory",
    targetId,
    targetName,
    details,
  });
}
