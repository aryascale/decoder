import { useState, useEffect } from "react";
import { DEFAULT_CATEGORIES } from "../lib/config";

interface CategoryItem {
  name: string;
  isHidden?: boolean;
  isClosed?: boolean;
}

interface CategoryManagerProps {
  eventId: string;
  onCategoriesChange?: (categories: string[]) => void;
}

export default function CategoryManager({
  eventId,
  onCategoriesChange,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(
    DEFAULT_CATEGORIES.map((c) => ({ name: c, isHidden: false, isClosed: false })),
  );
  const [newCategory, setNewCategory] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    loadCategories();
  }, [eventId]);

  async function loadCategories() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/categories?eventId=${encodeURIComponent(eventId)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.categories && data.categories.length > 0) {
          const mapped = data.categories.map((c: any) =>
            typeof c === "string" ? { name: c, isHidden: false, isClosed: false } : c,
          );
          setCategories(mapped);
        } else {
          setCategories(
            DEFAULT_CATEGORIES.map((c) => ({ name: c, isHidden: false, isClosed: false })),
          );
        }
      } else {
        setCategories(
          DEFAULT_CATEGORIES.map((c) => ({ name: c, isHidden: false, isClosed: false })),
        );
      }
    } catch (error) {
      setCategories(
        DEFAULT_CATEGORIES.map((c) => ({ name: c, isHidden: false, isClosed: false })),
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveCategories() {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/categories?eventId=${encodeURIComponent(eventId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ categories }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save categories");
      }

      setMessageType("success");
      setMessageText("Categories saved successfully!");
      setShowMessage(true);
      onCategoriesChange?.(categories.map((c) => c.name));

      setTimeout(() => setShowMessage(false), 3000);
    } catch (error: any) {
      setMessageType("error");
      setMessageText(error.message || "Failed to save categories");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (categories.some((c) => c.name === trimmed)) {
      setMessageType("error");
      setMessageText("Category already exists");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
      return;
    }

    const updated = [...categories, { name: trimmed, isHidden: false, isClosed: false }];
    setCategories(updated);
    setNewCategory("");
    onCategoriesChange?.(updated.map((c) => c.name));
  }

  function handleStartEdit(index: number) {
    setEditingIndex(index);
    setEditValue(categories[index].name);
  }

  function handleSaveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    const existsIndex = categories.findIndex((c) => c.name === trimmed);
    if (existsIndex !== -1 && existsIndex !== editingIndex) {
      setMessageType("error");
      setMessageText("Category already exists");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
      return;
    }

    const updated = [...categories];
    updated[editingIndex!] = { ...updated[editingIndex!], name: trimmed };
    setCategories(updated);
    setEditingIndex(null);
    setEditValue("");
    onCategoriesChange?.(updated.map((c) => c.name));
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditValue("");
  }

  function handleDeleteCategory(index: number) {
    if (
      confirm(
        `Are you sure you want to delete category "${categories[index].name}"?`,
      )
    ) {
      const updated = categories.filter((_, i) => i !== index);
      setCategories(updated);
      onCategoriesChange?.(updated.map((c) => c.name));
    }
  }

  function handleToggleHide(index: number) {
    const updated = [...categories];
    updated[index] = { ...updated[index], isHidden: !updated[index].isHidden };
    setCategories(updated);
  }

  function handleToggleClose(index: number) {
    const updated = [...categories];
    updated[index] = { ...updated[index], isClosed: !updated[index].isClosed };
    setCategories(updated);
  }

  function handleMoveToTop(index: number) {
    if (index === 0) return;
    const updated = [...categories];
    const item = updated.splice(index, 1)[0];
    updated.unshift(item);
    setCategories(updated);
    onCategoriesChange?.(updated.map((c) => c.name));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...categories];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setCategories(updated);
    onCategoriesChange?.(updated.map((c) => c.name));
  }

  function handleMoveDown(index: number) {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setCategories(updated);
    onCategoriesChange?.(updated.map((c) => c.name));
  }

  if (loading) {
    return (
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Category Management</h2>
            <div className="subtle">Loading categories...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="section-title">Category Management</h2>
          <div className="subtle text-sm">
            {eventId === "default"
              ? "Select or create an event first to save categories to database."
              : "Add, edit, reorder race categories. Changes will be saved to database."}
          </div>
        </div>
        <button
          className="btn w-full sm:w-auto"
          onClick={saveCategories}
          disabled={saving || eventId === "default"}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {showMessage && (
        <div
          className={`p-3 rounded-lg mb-4 text-sm font-medium ${
            messageType === "success"
              ? "bg-green-100 text-green-800 border border-green-500"
              : "bg-red-100 text-red-800 border border-red-500"
          }`}
        >
          {messageText}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
          placeholder="e.g., 10K Laki-laki"
          className="search flex-1"
        />
        <button
          onClick={handleAddCategory}
          className="btn w-full sm:w-auto"
          disabled={!newCategory.trim()}
        >
          + Add Category
        </button>
      </div>

      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block table-wrap">
        <table className="f1-table compact">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>Order</th>
              <th>Category Name</th>
              <th style={{ width: "200px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty">
                  No categories yet. Add your first category above.
                </td>
              </tr>
            ) : (
              categories.map((category, index) => (
                <tr
                  key={index}
                  className={`row-hover ${category.isHidden ? "opacity-60 bg-gray-50" : ""}`}
                >
                  <td className="mono">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        style={{
                          width: "24px",
                          height: "24px",
                          border: "none",
                          background: index === 0 ? "#f3f4f6" : "#667eea",
                          color: index === 0 ? "#9ca3af" : "white",
                          borderRadius: "4px",
                          cursor: index === 0 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                        }}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === categories.length - 1}
                        style={{
                          width: "24px",
                          height: "24px",
                          border: "none",
                          background:
                            index === categories.length - 1
                              ? "#f3f4f6"
                              : "#667eea",
                          color:
                            index === categories.length - 1
                              ? "#9ca3af"
                              : "white",
                          borderRadius: "4px",
                          cursor:
                            index === categories.length - 1
                              ? "not-allowed"
                              : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                        }}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="name-cell">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleSaveEdit()
                        }
                        className="search"
                        autoFocus
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            category.isHidden
                              ? "line-through text-gray-500"
                              : ""
                          }
                        >
                          {category.name}
                        </span>
                        {category.isHidden && (
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-sm font-semibold tracking-wide uppercase">
                            Hidden
                          </span>
                        )}
                        {category.isClosed && !category.isHidden && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-sm font-semibold tracking-wide uppercase">
                            Closed
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {editingIndex === index ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="btn ghost"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn ghost"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleMoveToTop(index)}
                            className="btn ghost px-1.5"
                            title="Move to Top"
                            disabled={index === 0}
                            style={{ color: index === 0 ? "#d1d5db" : "#3b82f6" }}
                          >
                            ⏫
                          </button>
                          <button
                            onClick={() => handleToggleClose(index)}
                            className="btn ghost px-1.5"
                            title={
                              category.isClosed
                                ? "Open Registration"
                                : "Close Registration"
                            }
                            style={{
                              color: category.isClosed ? "#9ca3af" : "#d97706",
                            }}
                          >
                            {category.isClosed ? "🔒" : "🔓"}
                          </button>
                          <button
                            onClick={() => handleToggleHide(index)}
                            className="btn ghost px-1.5"
                            title={
                              category.isHidden
                                ? "Unhide Category"
                                : "Hide Category"
                            }
                            style={{
                              color: category.isHidden ? "#9ca3af" : "#4b5563",
                            }}
                          >
                            {category.isHidden ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                <line x1="2" x2="22" y1="2" y2="22" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleStartEdit(index)}
                            className="btn ghost px-1.5"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(index)}
                            className="btn ghost px-1.5"
                            title="Delete"
                            style={{ color: "#dc2626" }}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - visible only on mobile */}
      <div className="md:hidden space-y-2">
        {categories.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No categories yet. Add your first category above.
          </div>
        ) : (
          categories.map((category, index) => (
            <div
              key={index}
              className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm ${category.isHidden ? "opacity-60 bg-gray-50" : ""}`}
            >
              {editingIndex === index ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                    className="search w-full"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="btn flex-1 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="btn ghost flex-1 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                          index === 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-indigo-500 text-white"
                        }`}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === categories.length - 1}
                        className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                          index === categories.length - 1
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-indigo-500 text-white"
                        }`}
                      >
                        ↓
                      </button>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-medium ${category.isHidden ? "text-gray-500 line-through" : "text-gray-900"}`}
                        >
                          {category.name}
                        </span>
                        {category.isHidden && (
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-sm font-semibold tracking-wide uppercase">
                            Hidden
                          </span>
                        )}
                        {category.isClosed && !category.isHidden && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-sm font-semibold tracking-wide uppercase">
                            Closed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">#{index + 1}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1 mt-2">
                    <button
                      onClick={() => handleMoveToTop(index)}
                      className="btn ghost text-sm px-1.5"
                      title="Move to Top"
                      disabled={index === 0}
                    >
                      ⏫
                    </button>
                    <button
                      onClick={() => handleToggleClose(index)}
                      className="btn ghost text-sm px-1.5"
                      title={
                        category.isClosed
                          ? "Open Registration"
                          : "Close Registration"
                      }
                    >
                      {category.isClosed ? "🔒" : "🔓"}
                    </button>
                    <button
                      onClick={() => handleToggleHide(index)}
                      className="btn ghost text-sm px-1.5"
                      title={
                        category.isHidden
                          ? "Unhide Category"
                          : "Hide Category"
                      }
                    >
                      {category.isHidden ? "👁️‍🗨️" : "👁️"}
                    </button>
                    <button
                      onClick={() => handleStartEdit(index)}
                      className="btn ghost text-sm px-1.5"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(index)}
                      className="btn ghost text-sm px-1.5"
                      style={{ color: "#dc2626" }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
