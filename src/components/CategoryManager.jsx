import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { Plus, Edit2, X, Trash2, Palette } from 'lucide-react';

// Common icons for categories
const availableIcons = [
  '🍔', '✈️', '💳', '🛍️', '🎬', '🏥', '📚', '📦', '☕', '🍕', '🚗', '🏠',
  '💊', '🎮', '🎵', '🏋️', '✈️', '🍽️', '👕', '💻', '📱', '🎨', '🎪', '🌴'
];

// Color palette
const availableColors = [
  '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#10b981',
  '#06b6d4', '#6b7280', '#f97316', '#84cc16', '#eab308', '#6366f1'
];

export default function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, transactions } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    icon: '📦',
    color: '#6b7280',
  });

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      await addCategory({ ...formData, name: formData.name.trim() });
      setFormData({ name: '', icon: '📦', color: '#6b7280' });
      setShowAddForm(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to add category');
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      await updateCategory(editingCategory.name, {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
      });
      setEditingCategory(null);
      setFormData({ name: '', icon: '📦', color: '#6b7280' });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to update category');
    }
  };

  const handleDelete = async (categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteCategory(categoryName);
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
    setShowAddForm(false);
    setError('');
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: '', icon: '📦', color: '#6b7280' });
    setError('');
  };

  const getCategoryUsage = (categoryName) => {
    return transactions.filter((t) => t.category === categoryName).length;
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Add Category Button */}
      {!showAddForm && !editingCategory && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add New Category
        </button>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingCategory) && (
        <div className="p-4 bg-white/50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-white">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <button
              onClick={editingCategory ? cancelEdit : () => setShowAddForm(false)}
              className="p-1 rounded-lg hover:bg-white/50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Category Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Groceries, Gas, Gym"
                maxLength={20}
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Icon
              </label>
              <div className="grid grid-cols-8 gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                {availableIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-2 rounded-lg text-2xl transition-all ${
                      formData.icon === icon
                        ? 'bg-teal-500/20 ring-2 ring-teal-500 scale-110'
                        : 'hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Color
              </label>
              <div className="grid grid-cols-6 gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      formData.color === color
                        ? 'ring-2 ring-slate-900 dark:ring-slate-100 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                <span className="text-2xl">{formData.icon}</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {formData.name || 'Category Name'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={editingCategory ? handleUpdate : handleAdd}
                className="btn-primary flex-1"
              >
                {editingCategory ? 'Update Category' : 'Add Category'}
              </button>
              <button
                onClick={editingCategory ? cancelEdit : () => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((category) => {
          const usageCount = getCategoryUsage(category.name);
          return (
            <div
              key={category.name}
              className="relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 group hover:shadow-lg transition-all"
              style={{ backgroundColor: `${category.color}10` }}
            >
              {/* Category Display */}
              <div className="flex flex-col items-center text-center mb-2">
                <div className="text-3xl mb-2">{category.icon}</div>
                <div className="font-medium text-sm text-slate-800 dark:text-white truncate w-full">
                  {category.name}
                </div>
                {usageCount > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {usageCount} {usageCount === 1 ? 'transaction' : 'transactions'}
                  </div>
                )}
              </div>

              {/* Edit/Delete Buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 shadow-sm"
                    title="Edit category"
                  >
                    <Edit2 size={14} />
                  </button>
                  {usageCount === 0 && (
                    <button
                      onClick={() => handleDelete(category.name)}
                      className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-red-500 text-red-500 hover:text-white shadow-sm transition-colors"
                      title="Delete category"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p>No categories yet. Add your first category above!</p>
        </div>
      )}
    </div>
  );
}

