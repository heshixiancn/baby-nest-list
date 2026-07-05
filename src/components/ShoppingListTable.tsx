"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ITEM_GROUPS,
  PAYMENT_METHODS,
  PURCHASE_PLATFORMS,
  SHOPPING_STATUSES,
  type ShoppingItem
} from "@/types";

interface ShoppingListTableProps {
  items: ShoppingItem[];
  groupOptions: string[];
}

interface NewItemFormState {
  name: string;
  group: string;
  brandModel: string;
  unitPrice: string;
  quantity: string;
  unit: string;
  platform: string;
  paymentMethod: string;
  productUrl: string;
  note: string;
}

interface EditItemFormState extends NewItemFormState {
  status: string;
}

interface StatusMenuPosition {
  top: number;
  left: number;
  width: number;
}

interface ItemGestureState {
  itemId: string;
  startX: number;
  startY: number;
  longPressTimer: number | null;
  moved: boolean;
}

type HapticFeedback = "light" | "medium" | "success" | "warning" | "error";

const statusTone: Record<string, string> = {
  待购买: "bg-amber-100 text-amber-800",
  已下单: "bg-sky-100 text-sky-800",
  已到货: "bg-green-100 text-green-800",
  暂缓: "bg-slate-100 text-slate-700",
  已放弃: "bg-rose-100 text-rose-800"
};

const chartTones = [
  { bar: "bg-amber-500", track: "bg-amber-50", text: "text-amber-700" },
  { bar: "bg-emerald-500", track: "bg-emerald-50", text: "text-emerald-700" },
  { bar: "bg-sky-500", track: "bg-sky-50", text: "text-sky-700" },
  { bar: "bg-rose-500", track: "bg-rose-50", text: "text-rose-700" },
  { bar: "bg-indigo-500", track: "bg-indigo-50", text: "text-indigo-700" },
  { bar: "bg-slate-500", track: "bg-slate-50", text: "text-slate-700" }
];

const statusChartTone: Record<string, { bar: string; track: string; text: string }> = {
  待购买: { bar: "bg-amber-500", track: "bg-amber-50", text: "text-amber-700" },
  已下单: { bar: "bg-sky-500", track: "bg-sky-50", text: "text-sky-700" },
  已到货: { bar: "bg-green-500", track: "bg-green-50", text: "text-green-700" },
  暂缓: { bar: "bg-slate-500", track: "bg-slate-50", text: "text-slate-700" },
  已放弃: { bar: "bg-rose-500", track: "bg-rose-50", text: "text-rose-700" }
};

const emptyForm: NewItemFormState = {
  name: "",
  group: ITEM_GROUPS[0],
  brandModel: "",
  unitPrice: "",
  quantity: "1",
  unit: "件",
  platform: "",
  paymentMethod: "现金",
  productUrl: "",
  note: ""
};

const emptyEditForm: EditItemFormState = {
  ...emptyForm,
  status: "待购买"
};

const hiddenGroupsStorageKey = "happy-list-hidden-shopping-groups";
const longPressDelayMs = 520;
const hapticPatterns: Record<HapticFeedback, number | number[]> = {
  light: 8,
  medium: 16,
  success: [12, 24, 12],
  warning: [18, 36, 18],
  error: [28, 40, 28]
};

function triggerHapticFeedback(type: HapticFeedback = "light") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  try {
    navigator.vibrate(hapticPatterns[type]);
  } catch {
    // Browsers without vibration support should quietly ignore haptic feedback.
  }
}

function blurActiveElement() {
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

export function ShoppingListTable({ items, groupOptions }: ShoppingListTableProps) {
  const router = useRouter();
  const baseGroups = useMemo(() => (groupOptions.length > 0 ? groupOptions : [...ITEM_GROUPS]), [groupOptions]);
  const [localGroups, setLocalGroups] = useState<string[]>(baseGroups);
  const groups = localGroups.length > 0 ? localGroups : baseGroups;
  const initialGroup = getInitialGroup(items, groups);
  const [activeGroup, setActiveGroup] = useState(initialGroup);
  const [localItems, setLocalItems] = useState(items);
  const [form, setForm] = useState<NewItemFormState>({ ...emptyForm, group: initialGroup });
  const [editForm, setEditForm] = useState<EditItemFormState>({ ...emptyEditForm, group: initialGroup });
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [deleteTargetItem, setDeleteTargetItem] = useState<ShoppingItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [quantityPendingId, setQuantityPendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [savingGroupOrder, setSavingGroupOrder] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [linkDialogItem, setLinkDialogItem] = useState<ShoppingItem | null>(null);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [statusMenuPosition, setStatusMenuPosition] = useState<StatusMenuPosition | null>(null);
  const [openActionsItemId, setOpenActionsItemId] = useState<string | null>(null);
  const [printDate, setPrintDate] = useState("");
  const gestureRef = useRef<ItemGestureState | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleGroups = useMemo(() => {
    const nextGroups = groups.filter((groupName) => !hiddenGroups.includes(groupName));
    return nextGroups.length > 0 ? nextGroups : groups;
  }, [groups, hiddenGroups]);

  const groupCounts = useMemo(() => {
    return visibleGroups.map((groupName) => {
      const itemsInGroup = localItems.filter((item) => item.group === groupName);
      return {
        group: groupName,
        total: itemsInGroup.length,
        pending: itemsInGroup.filter((item) => item.status === "待购买").length
      };
    });
  }, [localItems, visibleGroups]);

  const filteredItems = useMemo(() => {
    return localItems.filter((item) => item.group === activeGroup);
  }, [activeGroup, localItems]);

  const printItems = useMemo(() => filteredItems.filter((item) => item.status !== "已放弃"), [filteredItems]);

  const statisticsItems = useMemo(() => {
    return localItems.filter((item) => visibleGroups.includes(item.group));
  }, [localItems, visibleGroups]);

  const statisticsTotal = statisticsItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const groupStatistics = visibleGroups.map((groupName) => {
    const itemsInGroup = statisticsItems.filter((item) => item.group === groupName);
    return {
      group: groupName,
      count: itemsInGroup.length,
      total: itemsInGroup.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    };
  }).filter((item) => item.count > 0);

  const statusStatistics = SHOPPING_STATUSES.map((statusName) => {
    const itemsInStatus = statisticsItems.filter((item) => item.status === statusName);
    return {
      status: statusName,
      count: itemsInStatus.length,
      total: itemsInStatus.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    };
  }).filter((item) => item.count > 0);
  const paymentMethodStatistics = PAYMENT_METHODS.map((methodName, index) => {
    const itemsInMethod = statisticsItems.filter((item) => item.paymentMethod === methodName);
    return {
      method: methodName,
      count: itemsInMethod.length,
      total: itemsInMethod.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      tone: chartTones[index % chartTones.length]
    };
  });
  const billRanking = statisticsItems
    .map((item) => ({ ...item, billAmount: item.unitPrice * item.quantity }))
    .filter((item) => item.billAmount > 0)
    .sort((left, right) => right.billAmount - left.billAmount)
    .slice(0, 6);
  const maxBillAmount = billRanking[0]?.billAmount ?? 0;

  useEffect(() => {
    setLocalGroups((current) => Array.from(new Set([...baseGroups, ...current])));
  }, [baseGroups]);

  useEffect(() => {
    const rawValue = window.localStorage.getItem(hiddenGroupsStorageKey);
    if (!rawValue) return;

    try {
      const storedGroups = JSON.parse(rawValue) as unknown;
      if (Array.isArray(storedGroups)) {
        setHiddenGroups(storedGroups.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      window.localStorage.removeItem(hiddenGroupsStorageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(hiddenGroupsStorageKey, JSON.stringify(hiddenGroups));
  }, [hiddenGroups]);

  useEffect(() => {
    if (visibleGroups.includes(activeGroup)) return;

    const nextGroup = visibleGroups[0] || groups[0] || ITEM_GROUPS[0];
    setActiveGroup(nextGroup);
    setForm((current) => ({ ...current, group: nextGroup }));
  }, [activeGroup, groups, visibleGroups]);

  useEffect(() => {
    if (!openStatusMenuId) return;

    function closeOnViewportChange() {
      setOpenStatusMenuId(null);
      setStatusMenuPosition(null);
    }

    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);

    return () => {
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [openStatusMenuId]);

  useEffect(() => {
    setPrintDate(formatPrintDate(new Date()));
  }, []);

  useEffect(() => {
    return () => {
      if (gestureRef.current?.longPressTimer) {
        window.clearTimeout(gestureRef.current.longPressTimer);
      }
    };
  }, []);

  function handleTabChange(nextGroup: string) {
    triggerHapticFeedback("light");
    setActiveGroup(nextGroup);
    setOpenActionsItemId(null);
    closeStatusMenu();
    if (groups.includes(nextGroup)) {
      setForm((current) => ({ ...current, group: nextGroup }));
    }
  }

  function openCreateDialog() {
    triggerHapticFeedback("light");
    setError("");
    setForm((current) => ({
      ...current,
      group: groups.includes(activeGroup) ? activeGroup : groups[0]
    }));
    setShowCreateDialog(true);
  }

  function closeCreateDialog() {
    if (!creating) {
      triggerHapticFeedback("light");
      blurActiveElement();
      setShowCreateDialog(false);
    }
  }

  function openEditDialog(item: ShoppingItem) {
    triggerHapticFeedback("medium");
    setError("");
    setEditingItem(item);
    setEditForm(formFromItem(item));
    setOpenActionsItemId(null);
    closeStatusMenu();
  }

  function closeEditDialog() {
    if (!savingEdit) {
      triggerHapticFeedback("light");
      blurActiveElement();
      setEditingItem(null);
    }
  }

  function requestDeleteItem(item: ShoppingItem) {
    triggerHapticFeedback("warning");
    setDeleteTargetItem(item);
    setOpenActionsItemId(null);
    closeStatusMenu();
  }

  function cancelDeleteItem() {
    if (!deletingId) {
      triggerHapticFeedback("light");
      setDeleteTargetItem(null);
    }
  }

  function upsertLocalItem(item: ShoppingItem) {
    setLocalItems((current) => {
      const existingIndex = current.findIndex((currentItem) => currentItem.id === item.id);
      if (existingIndex < 0) return [item, ...current];

      const nextItems = [...current];
      nextItems[existingIndex] = item;
      return nextItems;
    });
  }

  function removeLocalItem(itemId: string) {
    setLocalItems((current) => current.filter((item) => item.id !== itemId));
  }

  function handleCardPointerDown(item: ShoppingItem, event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button,a,input,select,textarea")) return;

    if (gestureRef.current?.longPressTimer) {
      window.clearTimeout(gestureRef.current.longPressTimer);
    }

    const timer = window.setTimeout(() => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.itemId !== item.id || gesture.moved) return;
      openEditDialog(item);
      gestureRef.current = null;
    }, longPressDelayMs);

    gestureRef.current = {
      itemId: item.id,
      startX: event.clientX,
      startY: event.clientY,
      longPressTimer: timer,
      moved: false
    };
  }

  function handleCardPointerMove(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      gesture.moved = true;
      if (gesture.longPressTimer) {
        window.clearTimeout(gesture.longPressTimer);
        gesture.longPressTimer = null;
      }
    }
  }

  function handleCardPointerEnd(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (gesture.longPressTimer) {
      window.clearTimeout(gesture.longPressTimer);
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaX) > 44 && Math.abs(deltaY) < 40) {
      triggerHapticFeedback("light");
      setOpenActionsItemId(deltaX < 0 ? gesture.itemId : null);
    }

    gestureRef.current = null;
  }

  function toggleGroupVisibility(groupName: string) {
    triggerHapticFeedback("light");
    setHiddenGroups((current) => {
      if (current.includes(groupName)) {
        return current.filter((item) => item !== groupName);
      }

      const visibleCount = groups.filter((item) => !current.includes(item)).length;
      if (visibleCount <= 1) return current;
      return [...current, groupName];
    });
  }

  function showAllGroups() {
    triggerHapticFeedback("light");
    setHiddenGroups([]);
  }

  function handlePrintCurrentGroup() {
    triggerHapticFeedback("light");
    closeStatusMenu();
    setOpenActionsItemId(null);
    setPrintDate(formatPrintDate(new Date()));
    window.setTimeout(() => window.print(), 80);
  }

  async function handleCreateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextGroupName = newGroupName.trim();
    if (!nextGroupName) return;

    if (groups.includes(nextGroupName)) {
      triggerHapticFeedback("success");
      setHiddenGroups((current) => current.filter((groupName) => groupName !== nextGroupName));
      setActiveGroup(nextGroupName);
      setForm((current) => ({ ...current, group: nextGroupName }));
      setNewGroupName("");
      return;
    }

    setError("");
    setCreatingGroup(true);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextGroupName })
      });

      const payload = (await response.json()) as { error?: string; group?: string; groups?: string[] };
      if (!response.ok) {
        throw new Error(payload.error || "新增分组失败。");
      }

      const createdGroup = payload.group || nextGroupName;
      const nextGroups = payload.groups?.length ? payload.groups : [...groups, createdGroup];
      triggerHapticFeedback("success");
      setLocalGroups(Array.from(new Set(nextGroups)));
      setHiddenGroups((current) => current.filter((groupName) => groupName !== createdGroup));
      setActiveGroup(createdGroup);
      setForm((current) => ({ ...current, group: createdGroup }));
      setNewGroupName("");
      startTransition(() => router.refresh());
    } catch (createGroupError) {
      triggerHapticFeedback("error");
      setError(createGroupError instanceof Error ? createGroupError.message : "新增分组失败。");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleMoveGroup(groupName: string, direction: "up" | "down") {
    const nextGroups = moveGroup(groups, groupName, direction);
    if (nextGroups === groups) return;

    triggerHapticFeedback("light");
    setError("");
    setLocalGroups(nextGroups);
    setSavingGroupOrder(true);

    try {
      const response = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: nextGroups })
      });

      const payload = (await response.json()) as { error?: string; groups?: string[] };
      if (!response.ok) {
        throw new Error(payload.error || "保存分组顺序失败。");
      }

      if (payload.groups?.length) {
        triggerHapticFeedback("success");
        setLocalGroups(payload.groups);
      }
      startTransition(() => router.refresh());
    } catch (moveError) {
      triggerHapticFeedback("error");
      setError(moveError instanceof Error ? moveError.message : "保存分组顺序失败。");
      setLocalGroups(groups);
    } finally {
      setSavingGroupOrder(false);
    }
  }

  function closeStatusMenu() {
    setOpenStatusMenuId(null);
    setStatusMenuPosition(null);
  }

  function toggleStatusMenu(itemId: string, buttonElement: HTMLButtonElement) {
    if (openStatusMenuId === itemId) {
      closeStatusMenu();
      return;
    }

    triggerHapticFeedback("light");
    const rect = buttonElement.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = Math.min(Math.max(160, rect.width), window.innerWidth - viewportPadding * 2);
    const menuHeight = 236;
    const nextLeft = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - menuWidth - viewportPadding
    );
    const belowTop = rect.bottom + 8;
    const nextTop =
      belowTop + menuHeight > window.innerHeight - viewportPadding
        ? Math.max(viewportPadding, rect.top - menuHeight - 8)
        : belowTop;

    setStatusMenuPosition({
      top: nextTop,
      left: nextLeft,
      width: menuWidth
    });
    setOpenStatusMenuId(itemId);
  }

  async function handleStatusSelect(item: ShoppingItem, nextStatus: string) {
    closeStatusMenu();
    if (item.status === nextStatus) return;
    await handleStatusChange(item.id, nextStatus);
  }

  async function handleStatusChange(itemId: string, nextStatus: string) {
    triggerHapticFeedback("light");
    setError("");
    setPendingId(itemId);
    setOpenActionsItemId(null);
    const previousItems = localItems;
    setLocalItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, status: nextStatus } : item))
    );

    try {
      const response = await fetch(`/api/shopping-list/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "状态更新失败。");
      }

      triggerHapticFeedback("success");
      startTransition(() => router.refresh());
    } catch (updateError) {
      triggerHapticFeedback("error");
      setLocalItems(previousItems);
      setError(updateError instanceof Error ? updateError.message : "状态更新失败。");
    } finally {
      setPendingId(null);
    }
  }

  async function handleQuantityChange(item: ShoppingItem, nextQuantity: number) {
    const normalizedQuantity = Math.max(1, Math.round(nextQuantity));
    if (item.quantity === normalizedQuantity || quantityPendingId === item.id) return;

    triggerHapticFeedback("light");
    setError("");
    setQuantityPendingId(item.id);
    setOpenActionsItemId(null);
    const previousItems = localItems;
    setLocalItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, quantity: normalizedQuantity } : currentItem
      )
    );

    try {
      const response = await fetch(`/api/shopping-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: normalizedQuantity })
      });
      const payload = (await response.json()) as { error?: string; item?: ShoppingItem };

      if (!response.ok) {
        throw new Error(payload.error || "数量更新失败。");
      }

      if (payload.item) {
        upsertLocalItem(payload.item);
      }
      startTransition(() => router.refresh());
    } catch (quantityError) {
      triggerHapticFeedback("error");
      setLocalItems(previousItems);
      setError(quantityError instanceof Error ? quantityError.message : "数量更新失败。");
    } finally {
      setQuantityPendingId(null);
    }
  }

  async function handleEditItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) return;

    setError("");
    setSavingEdit(true);

    try {
      const response = await fetch(`/api/shopping-list/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          group: editForm.group,
          brandModel: editForm.brandModel,
          unitPrice: editForm.unitPrice.trim() ? Number(editForm.unitPrice) : 0,
          quantity: editForm.quantity.trim() ? Number(editForm.quantity) : 1,
          unit: editForm.unit,
          platform: editForm.platform,
          paymentMethod: editForm.paymentMethod,
          productUrl: editForm.productUrl,
          status: editForm.status,
          note: editForm.note
        })
      });
      const payload = (await response.json()) as { error?: string; item?: ShoppingItem };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "保存物品失败。");
      }

      upsertLocalItem(payload.item);
      setActiveGroup(payload.item.group);
      blurActiveElement();
      setEditingItem(null);
      triggerHapticFeedback("success");
      startTransition(() => router.refresh());
    } catch (editError) {
      triggerHapticFeedback("error");
      setError(editError instanceof Error ? editError.message : "保存物品失败。");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteItem() {
    if (!deleteTargetItem) return;

    triggerHapticFeedback("warning");
    setError("");
    setDeletingId(deleteTargetItem.id);
    const previousItems = localItems;
    removeLocalItem(deleteTargetItem.id);

    try {
      const response = await fetch(`/api/shopping-list/${deleteTargetItem.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "删除物品失败。");
      }

      setDeleteTargetItem(null);
      triggerHapticFeedback("success");
      startTransition(() => router.refresh());
    } catch (deleteError) {
      triggerHapticFeedback("error");
      setLocalItems(previousItems);
      setError(deleteError instanceof Error ? deleteError.message : "删除物品失败。");
    } finally {
      setDeletingId(null);
    }
  }

  function renderStatusControl(item: ShoppingItem) {
    const isUpdating = pendingId === item.id;
    const disabled = isUpdating || isPending;
    const isOpen = openStatusMenuId === item.id;

    return (
      <div className="w-full">
        <button
          className={cn(
            "badge min-h-10 w-full justify-center border border-transparent px-3 hover:ring-2 hover:ring-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60",
            statusTone[item.status] ?? "bg-slate-100 text-slate-700"
          )}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={(event) => toggleStatusMenu(item.id, event.currentTarget)}
        >
          {isUpdating ? "更新中..." : item.status || "-"}
        </button>
      </div>
    );
  }

  function renderQuantityControl(item: ShoppingItem) {
    const isUpdating = quantityPendingId === item.id;
    const canDecrease = item.quantity > 1 && !isUpdating;

    return (
      <div className="inline-flex h-10 w-full max-w-36 items-center rounded-full border border-slate-200 bg-white text-sm shadow-sm">
        <button
          className="tap-feedback flex h-10 w-10 shrink-0 items-center justify-center rounded-l-full text-lg leading-none text-slate-500 disabled:text-slate-300"
          type="button"
          disabled={!canDecrease}
          aria-label={`${item.name || "物品"}数量减一`}
          onClick={() => void handleQuantityChange(item, item.quantity - 1)}
        >
          -
        </button>
        <span
          className={cn(
            "min-w-0 flex-1 px-1 text-center font-semibold text-slate-900 transition",
            isUpdating ? "scale-95 text-amber-700" : ""
          )}
        >
          {item.quantity}
          {item.unit?.trim() ? item.unit.trim() : ""}
        </span>
        <button
          className="tap-feedback flex h-10 w-10 shrink-0 items-center justify-center rounded-r-full text-lg leading-none text-slate-500 disabled:text-slate-300"
          type="button"
          disabled={isUpdating}
          aria-label={`${item.name || "物品"}数量加一`}
          onClick={() => void handleQuantityChange(item, item.quantity + 1)}
        >
          +
        </button>
      </div>
    );
  }

  function renderStatusMenu() {
    const item = openStatusMenuId ? localItems.find((currentItem) => currentItem.id === openStatusMenuId) : undefined;
    if (!item || !statusMenuPosition) return null;

    return (
      <>
        <button
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          type="button"
          aria-label="关闭状态选择"
          onClick={() => {
            triggerHapticFeedback("light");
            closeStatusMenu();
          }}
        />
        <div
          className="soft-menu fixed z-50 grid gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
          role="listbox"
          aria-label={`${item.name || "物品"}状态`}
          style={{
            top: statusMenuPosition.top,
            left: statusMenuPosition.left,
            width: statusMenuPosition.width
          }}
        >
          {SHOPPING_STATUSES.map((option) => (
            <button
              key={option}
              className={cn(
                "badge min-h-9 w-full justify-center border hover:ring-2 hover:ring-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-100",
                statusTone[option] ?? "bg-slate-100 text-slate-700",
                item.status === option ? "border-amber-300 ring-1 ring-amber-100" : "border-transparent"
              )}
              type="button"
              role="option"
              aria-selected={item.status === option}
              onClick={() => void handleStatusSelect(item, option)}
            >
              {option}
            </button>
          ))}
        </div>
      </>
    );
  }

  function getChartWidth(value: number, total: number) {
    if (total <= 0 || value <= 0) return "0%";
    return `${Math.min(100, Math.max(4, (value / total) * 100))}%`;
  }

  function getPercentage(value: number, total: number) {
    if (total <= 0 || value <= 0) return 0;
    return Math.round((value / total) * 100);
  }

  async function handleCreateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreating(true);

    try {
      const response = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          group: form.group,
          brandModel: form.brandModel,
          unitPrice: form.unitPrice.trim() ? Number(form.unitPrice) : 0,
          quantity: form.quantity.trim() ? Number(form.quantity) : 1,
          unit: form.unit,
          platform: form.platform,
          paymentMethod: form.paymentMethod,
          productUrl: form.productUrl,
          status: "待购买",
          note: form.note
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "新增采购物品失败。");
      }

      const payload = (await response.json()) as { item?: ShoppingItem };
      if (payload.item) {
        upsertLocalItem(payload.item);
      }
      setActiveGroup(form.group);
      setForm({ ...emptyForm, group: form.group });
      blurActiveElement();
      setShowCreateDialog(false);
      triggerHapticFeedback("success");
      startTransition(() => router.refresh());
    } catch (createError) {
      triggerHapticFeedback("error");
      setError(createError instanceof Error ? createError.message : "新增采购物品失败。");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {renderStatusMenu()}

      <section className="print-export-sheet" aria-hidden="true">
        <div className="print-export-header">
          <div>
            <p className="print-export-kicker">开心の清单</p>
            <h1>{activeGroup}采购清单</h1>
          </div>
          <div className="print-export-meta">
            <p>共 {printItems.length} 项</p>
            {printDate ? <p>{printDate}</p> : null}
          </div>
        </div>

        {printItems.length === 0 ? (
          <div className="print-export-empty">当前分组暂无可打印物品。</div>
        ) : (
          <table className="print-export-table">
            <thead>
              <tr>
                <th>物品名称</th>
                <th>数量</th>
                <th>用途</th>
              </tr>
            </thead>
            <tbody>
              {printItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name || "未命名"}</td>
                  <td>{formatQuantity(item)}</td>
                  <td>{formatPurpose(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <button
              className="btn h-10 w-full px-2 sm:h-9 sm:w-auto sm:px-3"
              type="button"
              onClick={() => {
                triggerHapticFeedback("light");
                setShowStatsDialog(true);
              }}
            >
              支出统计
            </button>
            <button
              className="btn h-10 w-full px-2 sm:h-9 sm:w-auto sm:px-3"
              type="button"
              onClick={handlePrintCurrentGroup}
            >
              导出打印
            </button>
            <button className="btn btn-primary h-10 w-full px-2 sm:h-9 sm:w-auto sm:px-3" type="button" onClick={openCreateDialog}>
              新增物品
            </button>
            <button
              className="btn h-10 w-full px-2 sm:h-9 sm:w-auto sm:px-3"
              type="button"
              onClick={() => {
                triggerHapticFeedback("light");
                setShowGroupDialog(true);
              }}
            >
              显示分组
            </button>
          </div>
        </div>
        <div className="border-b border-slate-100 px-3 py-3 sm:px-4 sm:py-0">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-5 sm:pb-0" role="tablist" aria-label="采购清单分组">
            {groupCounts.map((item) => (
              <button
                key={item.group}
                type="button"
                className={cn(
                  "tap-feedback flex min-w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:px-1 sm:py-3",
                  activeGroup === item.group
                    ? "border-amber-300 bg-amber-50 font-semibold text-amber-800 sm:border-amber-500 sm:bg-transparent"
                    : "border-slate-200 bg-white font-medium text-slate-500 hover:border-amber-200 hover:text-amber-700 sm:border-transparent sm:bg-transparent"
                )}
                onClick={() => handleTabChange(item.group)}
                role="tab"
                aria-selected={activeGroup === item.group}
              >
                <span>{item.group}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    activeGroup === item.group ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {item.total}
                </span>
                {item.pending > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    待买 {item.pending}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">当前分组暂无符合条件的采购物品。</div>
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {filteredItems.map((item) => (
                <div key={item.id} className="relative overflow-hidden rounded-xl">
                  <div className="absolute inset-y-0 right-0 flex w-[112px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <button
                      className="tap-feedback flex flex-1 items-center justify-center bg-amber-50 text-sm font-semibold text-amber-800 active:bg-amber-100"
                      type="button"
                      onClick={() => openEditDialog(item)}
                    >
                      修改
                    </button>
                    <button
                      className="tap-feedback flex flex-1 items-center justify-center bg-rose-50 text-sm font-semibold text-rose-700 active:bg-rose-100 disabled:opacity-50"
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => requestDeleteItem(item)}
                    >
                      删除
                    </button>
                  </div>
                  <article
                    className={cn(
                      "relative rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_10px_rgba(15,23,42,0.03)] transition duration-200 ease-out active:scale-[0.99] active:bg-slate-50",
                      openActionsItemId === item.id ? "-translate-x-[112px] border-amber-200" : "translate-x-0"
                    )}
                    style={{ touchAction: "pan-y" }}
                    onPointerDown={(event) => handleCardPointerDown(item, event)}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={handleCardPointerEnd}
                    onPointerCancel={handleCardPointerEnd}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">{item.name || "未命名"}</h3>
                        {item.productUrl ? (
                          <button
                            type="button"
                            className="mt-1 block max-w-full truncate text-left text-sm font-medium text-amber-700 underline-offset-2 active:text-amber-800"
                            onClick={() => {
                              triggerHapticFeedback("light");
                              setLinkDialogItem(item);
                            }}
                          >
                            {item.brandModel || "查看商品链接"}
                          </button>
                        ) : (
                          <p className="mt-1 truncate text-sm text-slate-500">{item.brandModel || "未填写品牌型号"}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(7.25rem,0.8fr)] items-center gap-3">
                      <div className="min-w-0">
                        {renderQuantityControl(item)}
                      </div>
                      <div className="min-w-0">
                        {renderStatusControl(item)}
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto p-4 md:block">
              <table className="min-w-[760px] w-full divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">物品名称</th>
                    <th className="px-4 py-3">品牌型号</th>
                    <th className="px-4 py-3">数量</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="align-top transition-colors duration-150 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name || "未命名"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.brandModel || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{renderQuantityControl(item)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {renderStatusControl(item)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="btn h-8 px-2 text-xs" type="button" onClick={() => openEditDialog(item)}>
                          修改
                        </button>
                        <button
                          className="btn h-8 px-2 text-xs text-rose-700 hover:border-rose-200 hover:bg-rose-50"
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => requestDeleteItem(item)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {linkDialogItem ? (
        <div className="soft-backdrop fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-0 py-0 sm:items-center sm:px-4">
          <div className="soft-dialog panel w-full max-w-sm rounded-b-none sm:rounded-lg">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">{linkDialogItem.name || "商品链接"}</h2>
              <p className="mt-1 text-sm text-slate-500">{linkDialogItem.brandModel || "未填写品牌型号"}</p>
            </div>
            <div className="grid gap-2 p-5">
              <a
                className="btn btn-primary h-10 w-full"
                href={linkDialogItem.productUrl}
                target="_blank"
                rel="noreferrer"
              >
                打开商品页
              </a>
              <button
                className="btn h-10 w-full"
                type="button"
                onClick={() => {
                  triggerHapticFeedback("light");
                  setLinkDialogItem(null);
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div className="soft-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 px-0 py-0 sm:items-start sm:px-4 sm:py-8">
          <div className="soft-dialog panel max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-y-auto rounded-b-none sm:rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">修改物品</h2>
                <p className="mt-1 text-sm text-slate-500">{editingItem.name || "未命名"}</p>
              </div>
              <button
                className="btn h-9 px-3"
                type="button"
                onClick={closeEditDialog}
                disabled={savingEdit}
                aria-label="关闭修改物品弹窗"
              >
                关闭
              </button>
            </div>
            <form className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleEditItem}>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 lg:col-span-2">
                物品名称
                <input
                  className="field"
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                分组
                <select
                  className="field"
                  value={editForm.group}
                  onChange={(event) => setEditForm((current) => ({ ...current, group: event.target.value }))}
                >
                  {groups.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                状态
                <select
                  className="field"
                  value={editForm.status}
                  onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {SHOPPING_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 lg:col-span-2">
                品牌型号
                <input
                  className="field"
                  value={editForm.brandModel}
                  onChange={(event) => setEditForm((current) => ({ ...current, brandModel: event.target.value }))}
                  placeholder="可选"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                数量
                <input
                  className="field"
                  type="number"
                  min="1"
                  step="1"
                  value={editForm.quantity}
                  onChange={(event) => setEditForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                单位
                <input
                  className="field"
                  value={editForm.unit}
                  onChange={(event) => setEditForm((current) => ({ ...current, unit: event.target.value }))}
                  maxLength={10}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                单价
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.unitPrice}
                  onChange={(event) => setEditForm((current) => ({ ...current, unitPrice: event.target.value }))}
                  placeholder="0"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                购买平台
                <select
                  className="field"
                  value={editForm.platform}
                  onChange={(event) => setEditForm((current) => ({ ...current, platform: event.target.value }))}
                >
                  <option value="">未指定</option>
                  {PURCHASE_PLATFORMS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                支付方式
                <select
                  className="field"
                  value={editForm.paymentMethod}
                  onChange={(event) => setEditForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 sm:col-span-2">
                商品链接
                <input
                  className="field"
                  value={editForm.productUrl}
                  onChange={(event) => setEditForm((current) => ({ ...current, productUrl: event.target.value }))}
                  placeholder="https://"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 sm:col-span-2 lg:col-span-4">
                用途
                <input
                  className="field"
                  value={editForm.note}
                  onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="例如：住院待产、喂养、清洁护理"
                />
              </label>
              <div className="grid gap-2 sm:col-span-2 sm:flex sm:flex-wrap lg:col-span-4">
                <button className="btn btn-primary h-10 w-full sm:w-auto" type="submit" disabled={savingEdit || isPending}>
                  {savingEdit ? "正在保存..." : "保存修改"}
                </button>
                <button className="btn h-10 w-full sm:w-auto" type="button" onClick={closeEditDialog} disabled={savingEdit}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTargetItem ? (
        <div className="soft-backdrop fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-0 py-0 sm:items-center sm:px-4">
          <div className="soft-dialog panel w-full max-w-sm rounded-b-none sm:rounded-lg">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">删除物品</h2>
              <p className="mt-1 text-sm text-slate-500">{deleteTargetItem.name || "未命名"}</p>
            </div>
            <div className="grid gap-2 p-5">
              <button
                className="btn h-10 w-full border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                type="button"
                disabled={deletingId === deleteTargetItem.id}
                onClick={() => void handleDeleteItem()}
              >
                {deletingId === deleteTargetItem.id ? "正在删除..." : "确认删除"}
              </button>
              <button className="btn h-10 w-full" type="button" onClick={cancelDeleteItem} disabled={Boolean(deletingId)}>
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showStatsDialog ? (
        <div className="soft-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 px-0 py-0 sm:items-start sm:px-4 sm:py-8">
          <div className="soft-dialog panel max-h-[calc(100vh-1rem)] w-full max-w-5xl overflow-y-auto rounded-b-none sm:rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">支出统计</h2>
                <p className="mt-1 text-sm text-slate-500">按当前显示分组统计，不包含已隐藏 tab。</p>
              </div>
              <button
                className="btn h-9 px-3"
                type="button"
                onClick={() => {
                  triggerHapticFeedback("light");
                  setShowStatsDialog(false);
                }}
                aria-label="关闭支出统计弹窗"
              >
                关闭
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-700">总账单金额</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-800">{formatCurrency(statisticsTotal)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-600">统计物品数</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{statisticsItems.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-600">显示分组数</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{visibleGroups.length}</p>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                {paymentMethodStatistics.map((item) => (
                  <div key={item.method} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-600">{item.method}支出</p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {item.count} 项
                      </span>
                    </div>
                    <div className={cn("mt-4 h-2 overflow-hidden rounded-full", item.tone.track)}>
                      <div
                        className={cn("chart-bar h-full rounded-full", item.tone.bar)}
                        style={{ width: getChartWidth(item.total, statisticsTotal) }}
                      />
                    </div>
                    <p className={cn("mt-2 text-xs font-semibold", item.tone.text)}>
                      {getPercentage(item.total, statisticsTotal)}%
                    </p>
                  </div>
                ))}
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">分组金额占比</h3>
                      <p className="mt-1 text-sm text-slate-500">按当前显示 tab 统计。</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(statisticsTotal)}</span>
                  </div>

                  {statisticsTotal <= 0 || groupStatistics.length === 0 ? (
                    <div className="mt-5 rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      录入单价后会展示分组金额占比。
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {groupStatistics.map((item, index) => {
                        const tone = chartTones[index % chartTones.length];
                        return (
                          <div key={item.group} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate font-medium text-slate-800">{item.group}</span>
                              <span className="shrink-0 font-semibold text-slate-900">
                                {formatCurrency(item.total)}
                              </span>
                            </div>
                            <div className={cn("h-3 overflow-hidden rounded-full", tone.track)}>
                              <div
                                className={cn("chart-bar h-full rounded-full", tone.bar)}
                                style={{ width: getChartWidth(item.total, statisticsTotal) }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{item.count} 项</span>
                              <span className={cn("font-semibold", tone.text)}>
                                {getPercentage(item.total, statisticsTotal)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">状态金额分布</h3>
                      <p className="mt-1 text-sm text-slate-500">查看预算主要停留在哪些状态。</p>
                    </div>
                  </div>

                  {statisticsTotal <= 0 || statusStatistics.length === 0 ? (
                    <div className="mt-5 rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      暂无可展示的状态金额。
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100">
                        {statusStatistics.map((item) => {
                          const tone = statusChartTone[item.status] ?? chartTones[chartTones.length - 1];
                          return (
                            <div
                              key={item.status}
                              className={cn("chart-bar", tone.bar)}
                              style={{ width: `${(item.total / statisticsTotal) * 100}%` }}
                              title={`${item.status} ${formatCurrency(item.total)}`}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-5 space-y-3">
                        {statusStatistics.map((item) => {
                          const tone = statusChartTone[item.status] ?? chartTones[chartTones.length - 1];
                          return (
                            <div key={item.status} className="flex items-center justify-between gap-3 text-sm">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone.bar)} />
                                <span
                                  className={cn("badge shrink-0", statusTone[item.status] ?? "bg-slate-100 text-slate-700")}
                                >
                                  {item.status}
                                </span>
                              </span>
                              <span className="shrink-0 text-slate-500">{item.count} 项</span>
                              <span className="shrink-0 font-semibold text-slate-900">
                                {formatCurrency(item.total)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">单品账单排行</h3>
                    <p className="mt-1 text-sm text-slate-500">展示账单金额最高的前 6 项。</p>
                  </div>
                </div>

                {billRanking.length === 0 ? (
                  <div className="mt-5 rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    暂无单品金额排行。
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {billRanking.map((item, index) => {
                      const tone = chartTones[index % chartTones.length];
                      return (
                        <div key={item.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate font-medium text-slate-800">
                                {index + 1}. {item.name || "未命名"}
                              </span>
                              <span className="shrink-0 text-xs text-slate-500">{item.group || "未分组"}</span>
                            </div>
                            <div className={cn("mt-2 h-3 overflow-hidden rounded-full", tone.track)}>
                              <div
                                className={cn("chart-bar h-full rounded-full", tone.bar)}
                                style={{ width: getChartWidth(item.billAmount, maxBillAmount) }}
                              />
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-semibold text-slate-900">{formatCurrency(item.billAmount)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatCurrency(item.unitPrice)} x {formatQuantity(item)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">物品账单</h3>
                </div>
                {statisticsItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">暂无统计物品。</p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 md:hidden">
                      {statisticsItems.map((item) => (
                        <article key={item.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-medium text-slate-900">{item.name || "未命名"}</h4>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.group || "未分组"} · {item.status || "-"} · {item.paymentMethod || "现金"}
                              </p>
                            </div>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            {formatCurrency(item.unitPrice)} x {formatQuantity(item)}
                          </p>
                        </article>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-white text-left text-xs font-semibold uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">物品</th>
                            <th className="px-4 py-3">分组</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3">支付方式</th>
                            <th className="px-4 py-3">单价</th>
                            <th className="px-4 py-3">数量</th>
                            <th className="px-4 py-3">账单金额</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {statisticsItems.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-medium text-slate-900">{item.name || "未命名"}</td>
                              <td className="px-4 py-3 text-slate-600">{item.group || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{item.status || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{item.paymentMethod || "现金"}</td>
                              <td className="px-4 py-3 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-3 text-slate-600">{formatQuantity(item)}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {formatCurrency(item.unitPrice * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateDialog ? (
        <div className="soft-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 px-0 py-0 sm:items-start sm:px-4 sm:py-8">
          <div className="soft-dialog panel max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-y-auto rounded-b-none sm:rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">新增待购买物品</h2>
                <p className="mt-1 text-sm text-slate-500">录入后会写入 Notion 采购清单数据库。</p>
              </div>
              <button
                className="btn h-9 px-3"
                type="button"
                onClick={closeCreateDialog}
                disabled={creating}
                aria-label="关闭新增物品弹窗"
              >
                关闭
              </button>
            </div>
            <form className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleCreateItem}>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 lg:col-span-2">
                物品名称
                <input
                  className="field"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="例如：婴儿床、奶粉、产褥垫"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                分组
                <select
                  className="field"
                  value={form.group}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, group: event.target.value }));
                    setActiveGroup(event.target.value);
                  }}
                >
                  {groups.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                品牌型号
                <input
                  className="field"
                  value={form.brandModel}
                  onChange={(event) => setForm((current) => ({ ...current, brandModel: event.target.value }))}
                  placeholder="可选"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                单价
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))}
                  placeholder="0"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                数量
                <input
                  className="field"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                单位
                <input
                  className="field"
                  value={form.unit}
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                  placeholder="件/包/瓶"
                  maxLength={10}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                购买平台
                <select
                  className="field"
                  value={form.platform}
                  onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}
                >
                  <option value="">未指定</option>
                  {PURCHASE_PLATFORMS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                支付方式
                <select
                  className="field"
                  value={form.paymentMethod}
                  onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 sm:col-span-2">
                商品链接
                <input
                  className="field"
                  value={form.productUrl}
                  onChange={(event) => setForm((current) => ({ ...current, productUrl: event.target.value }))}
                  placeholder="https://"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 sm:col-span-2 lg:col-span-4">
                用途
                <input
                  className="field"
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="例如：住院待产、喂养、清洁护理"
                />
              </label>
              <div className="grid gap-2 sm:col-span-2 sm:flex sm:flex-wrap lg:col-span-4">
                <button className="btn btn-primary h-10 w-full sm:w-auto" type="submit" disabled={creating || isPending}>
                  {creating ? "正在保存..." : "保存物品"}
                </button>
                <button className="btn h-10 w-full sm:w-auto" type="button" onClick={closeCreateDialog} disabled={creating}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showGroupDialog ? (
        <div className="soft-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 px-0 py-0 sm:items-start sm:px-4 sm:py-8">
          <div className="soft-dialog panel max-h-[calc(100vh-1rem)] w-full max-w-lg overflow-y-auto rounded-b-none sm:rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">显示分组</h2>
                <p className="mt-1 text-sm text-slate-500">可隐藏或调整 tab 顺序，不会删除 Notion 数据。</p>
              </div>
              <button
                className="btn h-9 px-3"
                type="button"
                onClick={() => {
                  triggerHapticFeedback("light");
                  setShowGroupDialog(false);
                }}
                aria-label="关闭显示分组弹窗"
              >
                关闭
              </button>
            </div>
            <div className="space-y-3 p-5">
              <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleCreateGroup}>
                <label className="sr-only" htmlFor="new-shopping-group">
                  新增分组
                </label>
                <input
                  id="new-shopping-group"
                  className="field"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  placeholder="新增分组"
                  disabled={creatingGroup}
                  maxLength={30}
                />
                <button
                  className="btn btn-primary h-10 w-full sm:w-auto"
                  type="submit"
                  disabled={creatingGroup || !newGroupName.trim()}
                >
                  {creatingGroup ? "新增中..." : "新增"}
                </button>
              </form>
              {groups.map((groupName, index) => {
                const isVisible = !hiddenGroups.includes(groupName);
                const itemCount = localItems.filter((item) => item.group === groupName).length;
                const visibleCount = groups.filter((item) => !hiddenGroups.includes(item)).length;
                return (
                  <div
                    key={groupName}
                    className="tap-feedback flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm transition-colors duration-150 hover:border-amber-200 hover:bg-amber-50/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-3">
                      <input
                        className="h-4 w-4 accent-amber-500"
                        type="checkbox"
                        checked={isVisible}
                        disabled={isVisible && visibleCount <= 1}
                        onChange={() => toggleGroupVisibility(groupName)}
                      />
                      <span className="font-medium text-slate-800">{groupName}</span>
                    </label>
                    <span className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {itemCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          className="btn h-8 px-2 text-xs"
                          type="button"
                          disabled={index === 0 || savingGroupOrder || creatingGroup}
                          onClick={() => handleMoveGroup(groupName, "up")}
                        >
                          上移
                        </button>
                        <button
                          className="btn h-8 px-2 text-xs"
                          type="button"
                          disabled={index === groups.length - 1 || savingGroupOrder || creatingGroup}
                          onClick={() => handleMoveGroup(groupName, "down")}
                        >
                          下移
                        </button>
                      </span>
                    </span>
                  </div>
                );
              })}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <button className="btn h-10 w-full sm:w-auto" type="button" onClick={showAllGroups}>
                  全部显示
                </button>
                <button
                  className="btn btn-primary h-10 w-full sm:w-auto"
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback("light");
                    setShowGroupDialog(false);
                  }}
                  disabled={creatingGroup || savingGroupOrder}
                >
                  {savingGroupOrder ? "保存中..." : "完成"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getInitialGroup(items: ShoppingItem[], groups: string[]) {
  return items.find((item) => item.group)?.group || groups[0] || ITEM_GROUPS[0];
}

function formFromItem(item: ShoppingItem): EditItemFormState {
  return {
    name: item.name,
    group: item.group,
    brandModel: item.brandModel,
    unitPrice: item.unitPrice ? String(item.unitPrice) : "",
    quantity: item.quantity ? String(item.quantity) : "1",
    unit: item.unit || "件",
    platform: item.platform,
    paymentMethod: item.paymentMethod || "现金",
    productUrl: item.productUrl,
    status: item.status || "待购买",
    note: item.note
  };
}

function formatQuantity(item: Pick<ShoppingItem, "quantity" | "unit">) {
  const unit = item.unit.trim();
  return unit ? `${item.quantity} ${unit}` : String(item.quantity);
}

function formatPurpose(item: Pick<ShoppingItem, "note">) {
  return item.note.trim() || "-";
}

function formatPrintDate(date: Date) {
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function moveGroup(groups: string[], groupName: string, direction: "up" | "down") {
  const currentIndex = groups.indexOf(groupName);
  if (currentIndex < 0) return groups;

  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= groups.length) return groups;

  const nextGroups = [...groups];
  [nextGroups[currentIndex], nextGroups[nextIndex]] = [nextGroups[nextIndex], nextGroups[currentIndex]];
  return nextGroups;
}
