import { useState, useEffect } from 'react';
import { DEFAULT_CATEGORIES } from '../lib/config';

interface CategoryManagerProps {
  eventId: string;
  onCategoriesChange?: (categories: string[]) => void;
}

export default function CategoryManager({ eventId, onCategoriesChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    loadCategories();
  }, [eventId]);

  async function loadCategories() {
    setLoading(true);
    try {
      const response = await fetch(`/api/categories?eventId=${encodeURIComponent(eventId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        } else {
          setCategories([...DEFAULT_CATEGORIES]);
        }
      } else {
        setCategories([...DEFAULT_CATEGORIES]);
      }
    } catch (error) {
      setCategories([...DEFAULT_CATEGORIES]);
    } finally {
      setLoading(false);
    }
  }

  async function saveCategories() {
    setSaving(true);
    try {
      const response = await fetch(`/api/categories?eventId=${encodeURIComponent(eventId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save categories');
      }

      setMessageType('success');
      setMessageText('Categories saved successfully!');
      setShowMessage(true);
      onCategoriesChange?.(categories);

      setTimeout(() => setShowMessage(false), 3000);
    } catch (error: any) {
      setMessageType('error');
      setMessageText(error.message || 'Failed to save categories');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      setMessageType('error');
      setMessageText('Category already exists');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
      return;
    }

    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCategory('');
    onCategoriesChange?.(updated);
  }

  function handleStartEdit(index: number) {
    setEditingIndex(index);
    setEditValue(categories[index]);
  }

  function handleSaveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed) && categories.indexOf(trimmed) !== editingIndex) {
      setMessageType('error');
      setMessageText('Category already exists');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
      return;
    }

    const updated = [...categories];
    updated[editingIndex!] = trimmed;
    setCategories(updated);
    setEditingIndex(null);
    setEditValue('');
    onCategoriesChange?.(updated);
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditValue('');
  }

  function handleDeleteCategory(index: number) {
    if (confirm(`Are you sure you want to delete category "${categories[index]}"?`)) {
      const updated = categories.filter((_, i) => i !== index);
      setCategories(updated);
      onCategoriesChange?.(updated);
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...categories];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setCategories(updated);
    onCategoriesChange?.(updated);
  }

  function handleMoveDown(index: number) {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setCategories(updated);
    onCategoriesChange?.(updated);
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
            {eventId === 'default' 
              ? 'Select or create an event first to save categories to database.' 
              : 'Add, edit, reorder race categories. Changes will be saved to database.'}
          </div>
        </div>
        <button className="btn w-full sm:w-auto" onClick={saveCategories} disabled={saving || eventId === 'default'}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {showMessage && (
        <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
          messageType === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-500' 
            : 'bg-red-100 text-red-800 border border-red-500'
        }`}>
          {messageText}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
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
              <th style={{ width: '60px' }}>Order</th>
              <th>Category Name</th>
              <th style={{ width: '150px' }}>Actions</th>
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
                <tr key={index} className="row-hover">
                  <td className="mono">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        style={{
                          width: '24px',
                          height: '24px',
                          border: 'none',
                          background: index === 0 ? '#f3f4f6' : '#667eea',
                          color: index === 0 ? '#9ca3af' : 'white',
                          borderRadius: '4px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                        }}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === categories.length - 1}
                        style={{
                          width: '24px',
                          height: '24px',
                          border: 'none',
                          background: index === categories.length - 1 ? '#f3f4f6' : '#667eea',
                          color: index === categories.length - 1 ? '#9ca3af' : 'white',
                          borderRadius: '4px',
                          cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
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
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="search"
                        autoFocus
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <span>{category}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                            onClick={() => handleStartEdit(index)}
                            className="btn ghost"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(index)}
                            className="btn ghost"
                            title="Delete"
                            style={{ color: '#dc2626' }}
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
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              {editingIndex === index ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="search w-full"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="btn flex-1 text-sm">
                      Save
                    </button>
                    <button onClick={handleCancelEdit} className="btn ghost flex-1 text-sm">
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
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-indigo-500 text-white'
                        }`}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === categories.length - 1}
                        className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                          index === categories.length - 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-indigo-500 text-white'
                        }`}
                      >
                        ↓
                      </button>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{category}</span>
                      <div className="text-xs text-gray-400">#{index + 1}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(index)}
                      className="btn ghost text-sm px-3"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(index)}
                      className="btn ghost text-sm px-3"
                      style={{ color: '#dc2626' }}
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
