"use client";

import { formatDateSeparator } from "@/lib/chatUtils";

export default function ChatDateSeparator({ dateStr }: { dateStr: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 shrink-0">
        {formatDateSeparator(dateStr)}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}
