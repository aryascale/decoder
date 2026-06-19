import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DEFAULT_CATEGORIES } from '../lib/config';

interface FormData {
  name: string;
  description: string;
  eventDate: string;
  location: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  categories: string[];
}

export default function CreateEventPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    eventDate: '',
    location: '',
    latitude: '',
    longitude: '',
    isActive: true,
    categories: [...DEFAULT_CATEGORIES] as string[],
  });

  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (formData.categories.includes(trimmed)) {
      setError('Category already exists');
      return;
    }
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, trimmed],
    }));
    setNewCategory('');
    setError('');
  };

  const handleRemoveCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Event name is required');
      return;
    }
    if (!formData.eventDate) {
      setError('Event date is required');
      return;
    }
    if (formData.categories.length === 0) {
      setError('At least one category is required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create event' }));
        throw new Error(errorData.error || 'Failed to create event');
      }

      const event = await response.json();

      alert(`Event "${event.name}" berhasil dibuat dengan ${event.categories.length} kategori!`);
      navigate(`/event/${event.slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      <div className="container">
        <div className="header">
          <Link to="/" className="back-link">← Back to Events</Link>
          <h1>Create New Event</h1>
          <p className="subtitle">Set up a new race event with custom categories</p>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="name">Event Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Jakarta Marathon 2025"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the event..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="eventDate">Event Date *</label>
                <input
                  type="date"
                  id="eventDate"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Jakarta, Indonesia"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="latitude">Latitude</label>
                <input
                  type="number"
                  step="any"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g., -8.4095"
                />
                <small>Koordinat lintang untuk posisi marker di peta</small>
              </div>

              <div className="form-group">
                <label htmlFor="longitude">Longitude</label>
                <input
                  type="number"
                  step="any"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g., 115.1889"
                />
                <small>Koordinat bujur untuk posisi marker di peta</small>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>Event is active</span>
              </label>
              <small>Uncheck to mark event as completed/upcoming</small>
            </div>
          </div>

          <div className="form-section">
            <h2>Categories</h2>
            <p className="section-description">
              Define race categories for this event. Participants will be grouped by these categories.
            </p>

            <div className="category-input">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                placeholder="e.g., 10K Laki-laki"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="btn-add"
              >
                + Add Category
              </button>
            </div>

            <div className="categories-list">
              {formData.categories.map((category) => (
                <div key={category} className="category-item">
                  <span className="category-name">{category}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="btn-remove"
                  >
                    ×
                  </button>
                </div>
              ))}

              {formData.categories.length === 0 && (
                <div className="empty-categories">
                  No categories added yet. Add at least one category.
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating Event...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .create-event-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 1rem;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          background: white;
          border-radius: 10px 10px 0 0;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .back-link {
          display: inline-block;
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 1rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #5568d3;
          text-decoration: underline;
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          color: #1f2937;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
        }

        .event-form {
          background: white;
          border-radius: 0 0 10px 10px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 1rem;
          border-radius: 8px;
          border: 2px solid #dc2626;
          margin-bottom: 1.5rem;
        }

        .form-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-section:last-of-type {
          border-bottom: none;
          margin-bottom: 1rem;
        }

        .form-section h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .section-description {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }

        input[type="text"],
        input[type="date"],
        input[type="number"],
        textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group small {
          display: block;
          margin-top: 0.25rem;
          color: #6b7280;
          font-size: 0.8rem;
        }

        input:focus,
        textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label small {
          display: block;
          margin-top: 0.25rem;
          color: #6b7280;
          font-weight: normal;
        }

        .category-input {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .category-input input {
          flex: 1;
        }

        .btn-add {
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-add:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .categories-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .category-name {
          font-weight: 500;
          color: #1f2937;
        }

        .btn-remove {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background: #fef2f2;
          color: #dc2626;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-remove:hover {
          background: #dc2626;
          color: white;
        }

        .empty-categories {
          padding: 2rem;
          text-align: center;
          color: #9ca3af;
          font-style: italic;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .category-input {
            flex-direction: column;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
