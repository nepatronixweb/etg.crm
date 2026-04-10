"use client";

import { useMemo, useState, type DragEvent } from "react";
import { LayoutDashboard, GripVertical } from "lucide-react";
import {
  audienceSupportsOrderCustomization,
  DASHBOARD_WIDGET_DEFINITIONS,
  mergeDashboardWidgetOrderStates,
  mergeDashboardWidgetsWithUserOverrides,
  resolveWidgetIdsForSettingsEditor,
  roleSlugToDashboardAudience,
  type DashboardAudience,
  type DashboardWidgetOrderState,
} from "@/lib/dashboardLayout";

const ORDER_DND_MIME = "application/x-etg-user-dash-order";

function reorderStringArray(arr: string[], fromIndex: number, toIndex: number): string[] {
  const len = arr.length;
  if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len || fromIndex === toIndex) {
    return [...arr];
  }
  const next = [...arr];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

function UserDashboardOrderList({
  orderedIds,
  getLabel,
  onReorder,
}: {
  orderedIds: string[];
  getLabel: (id: string) => string;
  onReorder: (ids: string[]) => void;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.setData(ORDER_DND_MIME, String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOverRow = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };

  const onDropRow = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData(ORDER_DND_MIME);
    const fromIndex = parseInt(raw, 10);
    if (Number.isNaN(fromIndex) || fromIndex === dropIndex) {
      setDraggingIndex(null);
      setOverIndex(null);
      return;
    }
    onReorder(reorderStringArray(orderedIds, fromIndex, dropIndex));
    setDraggingIndex(null);
    setOverIndex(null);
  };

  const clearDrag = () => {
    setDraggingIndex(null);
    setOverIndex(null);
  };

  return (
    <div
      className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden mt-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {orderedIds.map((id, index) => (
        <div
          key={id}
          draggable
          onDragStart={(e) => onDragStart(e, index)}
          onDragOver={(e) => onDragOverRow(e, index)}
          onDragLeave={() => setOverIndex((o) => (o === index ? null : o))}
          onDrop={(e) => onDropRow(e, index)}
          onDragEnd={clearDrag}
          className={`flex items-center gap-3 px-3 py-2 bg-white text-xs cursor-grab active:cursor-grabbing select-none ${
            draggingIndex === index ? "opacity-50" : ""
          } ${
            overIndex === index && draggingIndex !== null && draggingIndex !== index
              ? "ring-2 ring-blue-200 ring-inset"
              : ""
          }`}
        >
          <GripVertical size={14} className="text-gray-400 shrink-0" aria-hidden />
          <span className="text-gray-800 font-medium truncate">{getLabel(id)}</span>
        </div>
      ))}
    </div>
  );
}

const AUDIENCE_LABEL: Record<DashboardAudience, string> = {
  super_admin: "admin / org admin",
  counsellor: "counsellor",
  front_desk: "front desk",
  admission_team: "admission team",
  telecaller: "telecaller",
  other: "other roles",
};

export function UserDashboardFormSection(props: {
  roleSlug: string;
  tenantWidgets: Record<string, boolean>;
  tenantOrder: DashboardWidgetOrderState;
  userWidgets: Record<string, boolean>;
  userOrder: DashboardWidgetOrderState;
  onChangeUserWidgets: (next: Record<string, boolean>) => void;
  onChangeUserOrder: (next: DashboardWidgetOrderState) => void;
}) {
  const {
    roleSlug,
    tenantWidgets,
    tenantOrder,
    userWidgets,
    userOrder,
    onChangeUserWidgets,
    onChangeUserOrder,
  } = props;

  const audience = useMemo(() => roleSlugToDashboardAudience(roleSlug), [roleSlug]);
  const widgetsForRole = useMemo(
    () => DASHBOARD_WIDGET_DEFINITIONS.filter((w) => w.audience === audience),
    [audience]
  );

  const mergedVisibility = useMemo(
    () => mergeDashboardWidgetsWithUserOverrides(tenantWidgets, userWidgets),
    [tenantWidgets, userWidgets]
  );

  const combinedOrder = useMemo(
    () => mergeDashboardWidgetOrderStates(tenantOrder, userOrder),
    [tenantOrder, userOrder]
  );

  const orderedIds = useMemo(
    () => resolveWidgetIdsForSettingsEditor(audience, combinedOrder),
    [audience, combinedOrder]
  );

  const resetAudienceOverrides = () => {
    const ids = new Set(widgetsForRole.map((w) => w.id));
    const nextW = { ...userWidgets };
    for (const id of ids) delete nextW[id];
    onChangeUserWidgets(nextW);
    const { [audience]: _removed, ...restOrder } = userOrder;
    onChangeUserOrder(restOrder);
  };

  if (widgetsForRole.length === 0) return null;

  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <LayoutDashboard size={18} className="text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Dashboard layout</h3>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              Optional overrides for this member&apos;s home dashboard ({AUDIENCE_LABEL[audience]} view). Organization defaults
              from Settings apply unless you change something here. They take effect after the next session refresh (about a
              minute) or the next login.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetAudienceOverrides}
          className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 shrink-0"
        >
          Reset to org defaults
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Sections</p>
        {widgetsForRole.map((w) => {
          const on = mergedVisibility[w.id] !== false;
          return (
            <div
              key={w.id}
              className="flex items-start justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{w.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{w.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeUserWidgets({ ...userWidgets, [w.id]: !on });
                }}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none shrink-0 mt-0.5 ${
                  on ? "bg-gray-900" : "bg-gray-300"
                }`}
                aria-pressed={on}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    on ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {audienceSupportsOrderCustomization(audience) && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Section order</p>
          <p className="text-[11px] text-gray-500 mt-1">Drag to reorder. Saved with this team member.</p>
          <UserDashboardOrderList
            orderedIds={orderedIds}
            getLabel={(id) => widgetsForRole.find((x) => x.id === id)?.label ?? id}
            onReorder={(ids) => onChangeUserOrder({ ...userOrder, [audience]: ids })}
          />
        </div>
      )}

      {!audienceSupportsOrderCustomization(audience) && (
        <p className="text-[11px] text-gray-500">Order for this role is fixed (summary, then leads and sidebar).</p>
      )}
    </section>
  );
}
