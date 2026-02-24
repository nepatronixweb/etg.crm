import Notification, { NotificationType } from "@/models/Notification";
import User from "@/models/User";

/**
 * Create notifications for a set of recipient user IDs.
 */
export async function createNotifications({
  recipientIds,
  type,
  title,
  message,
  link,
  createdBy,
}: {
  recipientIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  createdBy?: string;
}) {
  if (recipientIds.length === 0) return;
  const docs = recipientIds.map((id) => ({
    recipient: id,
    type,
    title,
    message,
    link,
    createdBy,
    read: false,
  }));
  await Notification.insertMany(docs);
}

/**
 * Get all super_admin user IDs.
 */
export async function getSuperAdminIds(): Promise<string[]> {
  const admins = await User.find({ role: "super_admin", isActive: true }, "_id");
  return admins.map((a) => a._id.toString());
}
