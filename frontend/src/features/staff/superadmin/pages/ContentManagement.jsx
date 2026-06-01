import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import SuperAdminLayout from './SuperAdminLayout';
import {
  getAdminContent,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  unpublishContent,
  reorderContent,
  getApprovedHotels,
} from '../../../../core/api/services/content.service';
import './ContentManagement.css';

/* ─────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────── */
const normalizeList = (res) => {
  const payload = res?.data?.data ?? res?.data ?? res;
  return Array.isArray(payload) ? payload : payload ? [payload] : [];
};

const normalizeSingleton = (res) => {
  const list = normalizeList(res);
  return list[0] ?? null;
};

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
const StatusBadge = ({ status }) => (
  <span className={`cm-status ${status === 'published' ? 'published' : 'draft'}`}>
    {status === 'published' ? 'Published' : 'Draft'}
  </span>
);

/* ─────────────────────────────────────────────
   IMAGE PREVIEW
───────────────────────────────────────────── */
const ImagePreview = ({ src }) => {
  if (!src) return null;
  return (
    <div className="cm-img-preview">
      <img
        src={src}
        alt="preview"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────
   REPEATER (dynamic add/remove rows)
───────────────────────────────────────────── */
const Repeater = ({ label, items, onChange, fields }) => {
  const addRow = () => {
    const blank = {};
    fields.forEach((f) => { blank[f.key] = ''; });
    onChange([...(items || []), blank]);
  };
  const removeRow = (idx) => onChange((items || []).filter((_, i) => i !== idx));
  const updateRow = (idx, key, val) => {
    const next = (items || []).map((row, i) =>
      i === idx ? { ...row, [key]: val } : row
    );
    onChange(next);
  };

  return (
    <div className="cm-repeater">
      <div className="cm-repeater-header">
        <span className="cm-field-label">{label}</span>
        <button type="button" className="cm-btn cm-btn-soft cm-btn-sm" onClick={addRow}>
          + Add
        </button>
      </div>
      {(items || []).map((row, idx) => (
        <div key={idx} className="cm-repeater-row">
          {fields.map((f) => (
            f.type === 'textarea' ? (
              <textarea
                key={f.key}
                className="cm-input"
                placeholder={f.placeholder || f.label}
                value={row[f.key] || ''}
                rows={2}
                onChange={(e) => updateRow(idx, f.key, e.target.value)}
              />
            ) : (
              <input
                key={f.key}
                type={f.type || 'text'}
                className="cm-input"
                placeholder={f.placeholder || f.label}
                value={row[f.key] || ''}
                onChange={(e) => updateRow(idx, f.key, e.target.value)}
              />
            )
          ))}
          <button
            type="button"
            className="cm-icon-btn delete"
            onClick={() => removeRow(idx)}
            title="Remove row"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ))}
      {(!items || items.length === 0) && (
        <p className="cm-repeater-empty">No entries yet. Click &ldquo;+ Add&rdquo; to begin.</p>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   STRING LIST (tags)
───────────────────────────────────────────── */
const StringList = ({ label, items, onChange, placeholder }) => {
  const [inputVal, setInputVal] = useState('');
  const addItem = () => {
    const val = inputVal.trim();
    if (!val) return;
    onChange([...(items || []), val]);
    setInputVal('');
  };
  const removeItem = (idx) => onChange((items || []).filter((_, i) => i !== idx));
  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } };

  return (
    <div className="cm-string-list">
      <span className="cm-field-label">{label}</span>
      <div className="cm-string-list-input">
        <input
          type="text"
          className="cm-input"
          placeholder={placeholder || 'Type and press Enter'}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="cm-btn cm-btn-soft cm-btn-sm" onClick={addItem}>
          Add
        </button>
      </div>
      <div className="cm-tags">
        {(items || []).map((item, idx) => (
          <span key={idx} className="cm-tag">
            {item}
            <button type="button" onClick={() => removeItem(idx)} className="cm-tag-remove">
              &times;
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   CONFIRM DELETE MODAL
───────────────────────────────────────────── */
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="cm-modal-backdrop" onClick={onCancel}>
    <div className="cm-confirm-modal" onClick={(e) => e.stopPropagation()}>
      <p className="cm-confirm-msg">{message}</p>
      <div className="cm-confirm-actions">
        <button type="button" className="cm-btn cm-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="cm-btn cm-btn-danger" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   GENERIC FIELD RENDERER
───────────────────────────────────────────── */
const FieldRenderer = ({ field, value, onChange }) => {
  const { key, label, type, placeholder, options, fields: subFields } = field;

  if (type === 'textarea') {
    return (
      <label className="cm-field-group">
        <span className="cm-field-label">{label}</span>
        <textarea
          className="cm-input"
          rows={4}
          placeholder={placeholder || ''}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  if (type === 'color') {
    return (
      <label className="cm-field-group">
        <span className="cm-field-label">{label}</span>
        <div className="cm-color-row">
          <input
            type="color"
            className="cm-color-swatch"
            value={value || '#0ea5a0'}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            className="cm-input cm-color-text"
            value={value || ''}
            placeholder="#000000"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </label>
    );
  }

  if (type === 'checkbox') {
    return (
      <label className="cm-field-group cm-field-checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="cm-field-label">{label}</span>
      </label>
    );
  }

  if (type === 'select') {
    return (
      <label className="cm-field-group">
        <span className="cm-field-label">{label}</span>
        <select
          className="cm-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- Select --</option>
          {(options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (type === 'image') {
    return (
      <div className="cm-field-group">
        <span className="cm-field-label">{label}</span>
        <input
          type="text"
          className="cm-input"
          placeholder={placeholder || 'https://...'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <ImagePreview src={value} />
      </div>
    );
  }

  if (type === 'string-list') {
    return (
      <StringList
        label={label}
        items={value || []}
        onChange={onChange}
        placeholder={placeholder}
      />
    );
  }

  if (type === 'repeater') {
    return (
      <Repeater
        label={label}
        items={value || []}
        onChange={onChange}
        fields={subFields || []}
      />
    );
  }

  if (type === 'number') {
    return (
      <label className="cm-field-group">
        <span className="cm-field-label">{label}</span>
        <input
          type="number"
          className="cm-input"
          placeholder={placeholder || ''}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </label>
    );
  }

  if (type === 'date') {
    return (
      <label className="cm-field-group">
        <span className="cm-field-label">{label}</span>
        <input
          type="date"
          className="cm-input"
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      </label>
    );
  }

  return (
    <label className="cm-field-group">
      <span className="cm-field-label">{label}</span>
      <input
        type={type || 'text'}
        className="cm-input"
        placeholder={placeholder || ''}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
};

/* ─────────────────────────────────────────────
   FORM MODAL (slide-in drawer)
───────────────────────────────────────────── */
const FormModal = ({ title, fields, formData, onChange, onSave, onPublish, onClose, saving }) => (
  <div className="cm-modal-backdrop" onClick={onClose}>
    <section
      className="cm-editor-modal"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cm-modal-header">
        <div>
          <span className="cm-eyebrow">Content editor</span>
          <h2>{title}</h2>
        </div>
        <button className="cm-close-btn" type="button" onClick={onClose} aria-label="Close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="cm-editor-form">
        {fields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={formData[field.key]}
            onChange={(val) => onChange(field.key, val)}
          />
        ))}
      </div>

      <div className="cm-modal-actions">
        <button
          type="button"
          className="cm-btn cm-btn-ghost"
          onClick={() => onSave('draft')}
          disabled={saving}
        >
          Save Draft
        </button>
        <button
          type="button"
          className="cm-btn cm-btn-primary"
          onClick={() => onPublish()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Publish'}
        </button>
      </div>
    </section>
  </div>
);

/* ─────────────────────────────────────────────
   CONTENT LIST TAB (multi-document types)
───────────────────────────────────────────── */
const ContentListTab = ({ contentType, fields, cardTitle, cardSubtitle, accent }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminContent(contentType);
      setItems(normalizeList(res));
    } catch {
      toast.error(`Failed to load ${contentType}`);
    } finally {
      setLoading(false);
    }
  }, [contentType]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    const blank = {};
    fields.forEach((f) => {
      if (f.type === 'checkbox') blank[f.key] = false;
      else if (f.type === 'repeater' || f.type === 'string-list') blank[f.key] = [];
      else blank[f.key] = '';
    });
    setFormData(blank);
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    const prefilled = {};
    fields.forEach((f) => {
      prefilled[f.key] = item[f.key] ?? (f.type === 'checkbox' ? false : f.type === 'repeater' || f.type === 'string-list' ? [] : '');
    });
    setFormData(prefilled);
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFieldChange = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (status) => {
    setSaving(true);
    try {
      const payload = { ...formData, status };
      if (editingItem) {
        await updateContent(contentType, editingItem._id, payload);
        toast.success('Updated successfully');
      } else {
        await createContent(contentType, payload);
        toast.success('Created successfully');
      }
      setFormOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const payload = { ...formData, status: 'published' };
      if (editingItem) {
        await updateContent(contentType, editingItem._id, payload);
        await publishContent(contentType, editingItem._id);
      } else {
        const res = await createContent(contentType, payload);
        const created = res?.data?.data;
        if (created?._id) await publishContent(contentType, created._id);
      }
      toast.success('Published successfully');
      setFormOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item) => {
    try {
      if (item.status === 'published') {
        await unpublishContent(contentType, item._id);
        toast.success('Unpublished');
      } else {
        await publishContent(contentType, item._id);
        toast.success('Published');
      }
      fetchItems();
    } catch {
      toast.error('Status change failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteContent(contentType, id);
      toast.success('Deleted');
      setConfirmDelete(null);
      fetchItems();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleReorder = async (fromIdx, toIdx) => {
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const reordered = next.map((item, idx) => ({ ...item, displayOrder: idx }));
    setItems(reordered);
    try {
      await reorderContent(contentType, reordered.map((it, idx) => ({ id: it._id, displayOrder: idx })));
    } catch {
      toast.error('Reorder failed');
      fetchItems();
    }
  };

  if (loading) {
    return (
      <div className="cm-loading-grid">
        {[1, 2, 3].map((n) => (
          <div key={n} className="cm-skeleton-card">
            <div className="cm-skeleton-line w-3/4" />
            <div className="cm-skeleton-line w-full" />
            <div className="cm-skeleton-line w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="cm-tab-toolbar">
        <button className="cm-btn cm-btn-soft" type="button" onClick={openCreate}>
          <span className="material-symbols-outlined">add</span>
          Create New
        </button>
      </div>

      {items.length === 0 ? (
        <div className="cm-empty-state">
          <div className="cm-empty-illustration">
            <span className="material-symbols-outlined">article</span>
          </div>
          <h2>No {contentType} yet</h2>
          <p>Create the first entry to get started.</p>
          <button className="cm-btn cm-btn-primary" type="button" onClick={openCreate}>
            <span className="material-symbols-outlined">add</span>
            Create First
          </button>
        </div>
      ) : (
        <div className="cm-card-grid">
          {items.map((item, idx) => (
            <article
              key={item._id}
              className="cm-content-card"
              style={{ '--cm-accent': accent || '#00BFA6', animationDelay: `${idx * 0.05}s` }}
            >
              {/* Image thumbnail */}
              {(item.image || item.backgroundImage || (item.images && item.images[0])) && (
                <div className="cm-card-thumb">
                  <img
                    src={item.image || item.backgroundImage || item.images[0]}
                    alt=""
                    onError={(e) => { e.currentTarget.parentNode.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="cm-card-visual" aria-hidden="true">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>

              <div className="cm-card-body">
                <div className="cm-card-heading">
                  <h2>{cardTitle(item)}</h2>
                  <StatusBadge status={item.status} />
                </div>
                {cardSubtitle && (
                  <p className="cm-card-subtitle">{cardSubtitle(item)}</p>
                )}
              </div>

              <div className="cm-card-footer">
                <span className="cm-updated">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                </span>
                <div className="cm-card-actions">
                  {/* Reorder */}
                  {idx > 0 && (
                    <button
                      type="button"
                      className="cm-icon-btn reorder"
                      onClick={() => handleReorder(idx, idx - 1)}
                      title="Move up"
                    >
                      <span className="material-symbols-outlined">arrow_upward</span>
                    </button>
                  )}
                  {idx < items.length - 1 && (
                    <button
                      type="button"
                      className="cm-icon-btn reorder"
                      onClick={() => handleReorder(idx, idx + 1)}
                      title="Move down"
                    >
                      <span className="material-symbols-outlined">arrow_downward</span>
                    </button>
                  )}
                  {/* Toggle publish */}
                  <button
                    type="button"
                    className={`cm-icon-btn ${item.status === 'published' ? 'unpublish' : 'publish'}`}
                    onClick={() => handleTogglePublish(item)}
                    title={item.status === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    <span className="material-symbols-outlined">
                      {item.status === 'published' ? 'visibility_off' : 'publish'}
                    </span>
                  </button>
                  {/* Edit */}
                  <button
                    type="button"
                    className="cm-icon-btn edit"
                    onClick={() => openEdit(item)}
                    title="Edit"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    className="cm-icon-btn delete"
                    onClick={() => setConfirmDelete(item._id)}
                    title="Delete"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <FormModal
          title={editingItem ? `Edit ${contentType}` : `New ${contentType}`}
          fields={fields}
          formData={formData}
          onChange={handleFieldChange}
          onSave={handleSave}
          onPublish={handlePublish}
          onClose={() => setFormOpen(false)}
          saving={saving}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message="Are you sure you want to delete this item? This action cannot be undone."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
};

/* ─────────────────────────────────────────────
   SINGLETON TAB (About, Footer, SiteSettings)
───────────────────────────────────────────── */
const SingletonTab = ({ contentType, fields, autoPublish }) => {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminContent(contentType);
      const data = normalizeSingleton(res);
      setDoc(data);
      const prefilled = {};
      fields.forEach((f) => {
        prefilled[f.key] = data?.[f.key] ?? (f.type === 'checkbox' ? false : f.type === 'repeater' || f.type === 'string-list' ? [] : '');
      });
      setFormData(prefilled);
    } catch {
      toast.error(`Failed to load ${contentType}`);
    } finally {
      setLoading(false);
    }
  }, [contentType, fields]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleFieldChange = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (status) => {
    setSaving(true);
    try {
      const payload = { ...formData, status: autoPublish ? 'published' : status };
      if (doc?._id) {
        await updateContent(contentType, doc._id, payload);
        if (autoPublish || status === 'published') {
          await publishContent(contentType, doc._id);
        }
      } else {
        const res = await createContent(contentType, payload);
        const created = res?.data?.data;
        if ((autoPublish || status === 'published') && created?._id) {
          await publishContent(contentType, created._id);
        }
      }
      toast.success(autoPublish ? 'Settings saved and published' : status === 'published' ? 'Published' : 'Draft saved');
      fetchDoc();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cm-singleton-loading">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="cm-skeleton-group">
            <div className="cm-skeleton-line w-1/4" />
            <div className="cm-skeleton-input" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cm-singleton-form">
      <div className="cm-singleton-header">
        <div>
          <h3 className="cm-singleton-title">
            {doc ? 'Edit content' : 'Create content'}
          </h3>
          {doc && (
            <p className="cm-singleton-meta">
              Last updated: {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : '—'}
              {' '}&middot;{' '}
              <StatusBadge status={doc.status || 'draft'} />
            </p>
          )}
        </div>
      </div>

      <div className="cm-singleton-fields">
        {fields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={formData[field.key]}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        ))}
      </div>

      <div className="cm-singleton-actions">
        {!autoPublish && (
          <button
            type="button"
            className="cm-btn cm-btn-ghost"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            Save Draft
          </button>
        )}
        <button
          type="button"
          className="cm-btn cm-btn-primary"
          onClick={() => handleSave('published')}
          disabled={saving}
        >
          {saving ? 'Saving…' : autoPublish ? 'Save & Publish' : 'Publish'}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   FEATURED HOTELS TAB  (custom hotel-picker UI)
───────────────────────────────────────────── */
const FeaturedHotelsTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ hotelId: '', badge: '', displayOrder: 0, featuredUntil: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminContent('featured-hotels');
      const payload = res?.data?.data ?? res?.data ?? res;
      setItems(Array.isArray(payload) ? payload : []);
    } catch {
      toast.error('Failed to load featured hotels');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHotels = useCallback(async () => {
    setHotelsLoading(true);
    try {
      const res = await getApprovedHotels();
      const payload = res?.data?.data ?? res?.data ?? [];
      setHotels(Array.isArray(payload) ? payload : []);
    } catch {
      toast.error('Failed to load approved hotels');
    } finally {
      setHotelsLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); fetchHotels(); }, [fetchItems, fetchHotels]);

  const blankForm = () => ({ hotelId: '', badge: '', displayOrder: items.length, featuredUntil: '', status: 'draft' });

  const openCreate = () => {
    setFormData(blankForm());
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setFormData({
      hotelId: item.hotelId?._id || item.hotelId || '',
      badge: item.badge || '',
      displayOrder: item.displayOrder ?? 0,
      featuredUntil: item.featuredUntil ? new Date(item.featuredUntil).toISOString().split('T')[0] : '',
      status: item.status || 'draft',
    });
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleSave = async (status) => {
    if (!formData.hotelId) { toast.error('Please select a hotel'); return; }
    setSaving(true);
    try {
      const payload = {
        hotelId: formData.hotelId,
        badge: formData.badge || undefined,
        displayOrder: Number(formData.displayOrder) || 0,
        featuredUntil: formData.featuredUntil || undefined,
        status,
      };
      if (editingItem) {
        await updateContent('featured-hotels', editingItem._id, payload);
        toast.success('Updated');
      } else {
        await createContent('featured-hotels', payload);
        toast.success('Created');
      }
      setFormOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.hotelId) { toast.error('Please select a hotel'); return; }
    setSaving(true);
    try {
      const payload = {
        hotelId: formData.hotelId,
        badge: formData.badge || undefined,
        displayOrder: Number(formData.displayOrder) || 0,
        featuredUntil: formData.featuredUntil || undefined,
        status: 'published',
      };
      if (editingItem) {
        await updateContent('featured-hotels', editingItem._id, payload);
        await publishContent('featured-hotels', editingItem._id);
      } else {
        const res = await createContent('featured-hotels', payload);
        const created = res?.data?.data;
        if (created?._id) await publishContent('featured-hotels', created._id);
      }
      toast.success('Published');
      setFormOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item) => {
    try {
      if (item.status === 'published') {
        await unpublishContent('featured-hotels', item._id);
        toast.success('Unpublished');
      } else {
        await publishContent('featured-hotels', item._id);
        toast.success('Published');
      }
      fetchItems();
    } catch {
      toast.error('Status change failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteContent('featured-hotels', id);
      toast.success('Deleted');
      setConfirmDelete(null);
      fetchItems();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleReorder = async (fromIdx, toIdx) => {
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const reordered = next.map((item, idx) => ({ ...item, displayOrder: idx }));
    setItems(reordered);
    try {
      await reorderContent('featured-hotels', reordered.map((it, idx) => ({ id: it._id, displayOrder: idx })));
    } catch {
      toast.error('Reorder failed');
      fetchItems();
    }
  };

  const selectedHotelName = (hotelId) => {
    const h = hotels.find((h) => h._id === hotelId);
    return h ? `${h.name} — ${h.location?.city || ''}` : 'Unknown hotel';
  };

  if (loading) {
    return (
      <div className="cm-loading-grid">
        {[1, 2, 3].map((n) => <div key={n} className="cm-skeleton-card"><div className="cm-skeleton-line w-3/4" /><div className="cm-skeleton-line w-full" /></div>)}
      </div>
    );
  }

  return (
    <>
      <div className="cm-tab-toolbar">
        <button className="cm-btn cm-btn-soft" type="button" onClick={openCreate}>
          <span className="material-symbols-outlined">add</span>
          Add Featured Hotel
        </button>
      </div>

      {items.length === 0 ? (
        <div className="cm-empty-state">
          <div className="cm-empty-illustration">
            <span className="material-symbols-outlined">hotel</span>
          </div>
          <h2>No featured hotels yet</h2>
          <p>Pick hotels from your approved listings to feature on the home page.</p>
          <button className="cm-btn cm-btn-primary" type="button" onClick={openCreate}>
            <span className="material-symbols-outlined">add</span>
            Add First
          </button>
        </div>
      ) : (
        <div className="cm-card-grid">
          {items.map((item, idx) => {
            const hotel = item.hotelId || {};
            const name = hotel.name || selectedHotelName(item.hotelId);
            const city = hotel.location?.city || hotel.location?.address || '';
            const img = hotel.images?.[0];
            return (
              <article
                key={item._id}
                className="cm-content-card"
                style={{ '--cm-accent': '#14B8A6', animationDelay: `${idx * 0.05}s` }}
              >
                {img && (
                  <div className="cm-card-thumb">
                    <img src={img} alt={name} onError={(e) => { e.currentTarget.parentNode.style.display = 'none'; }} />
                  </div>
                )}
                {!img && (
                  <div className="cm-card-visual" aria-hidden="true">
                    <span className="material-symbols-outlined">hotel</span>
                  </div>
                )}
                <div className="cm-card-body">
                  <div className="cm-card-heading">
                    <h2>{name}</h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="cm-card-subtitle">
                    {city && <span>{city}</span>}
                    {item.badge && <span className="cm-fh-badge">{item.badge}</span>}
                    {item.featuredUntil && (
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        {' · Until '}{new Date(item.featuredUntil).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                  <p className="cm-card-meta">Order: {item.displayOrder ?? idx}</p>
                </div>
                <div className="cm-card-footer">
                  <span className="cm-updated">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                  </span>
                  <div className="cm-card-actions">
                    {idx > 0 && (
                      <button type="button" className="cm-icon-btn reorder" onClick={() => handleReorder(idx, idx - 1)} title="Move up">
                        <span className="material-symbols-outlined">arrow_upward</span>
                      </button>
                    )}
                    {idx < items.length - 1 && (
                      <button type="button" className="cm-icon-btn reorder" onClick={() => handleReorder(idx, idx + 1)} title="Move down">
                        <span className="material-symbols-outlined">arrow_downward</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={`cm-icon-btn ${item.status === 'published' ? 'unpublish' : 'publish'}`}
                      onClick={() => handleTogglePublish(item)}
                      title={item.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      <span className="material-symbols-outlined">
                        {item.status === 'published' ? 'visibility_off' : 'publish'}
                      </span>
                    </button>
                    <button type="button" className="cm-icon-btn edit" onClick={() => openEdit(item)} title="Edit">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button type="button" className="cm-icon-btn delete" onClick={() => setConfirmDelete(item._id)} title="Delete">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit drawer */}
      {formOpen && (
        <div className="cm-modal-backdrop" onClick={() => setFormOpen(false)}>
          <section
            className="cm-editor-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cm-modal-header">
              <div>
                <span className="cm-eyebrow">Content editor</span>
                <h2>{editingItem ? 'Edit Featured Hotel' : 'Add Featured Hotel'}</h2>
              </div>
              <button className="cm-close-btn" type="button" onClick={() => setFormOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="cm-editor-form">
              {/* Hotel picker */}
              <label className="cm-field-group">
                <span className="cm-field-label">Hotel *</span>
                {hotelsLoading ? (
                  <div className="cm-input" style={{ color: '#9CA3AF' }}>Loading hotels…</div>
                ) : (
                  <select
                    className="cm-input"
                    value={formData.hotelId}
                    onChange={(e) => setFormData((p) => ({ ...p, hotelId: e.target.value }))}
                    required
                  >
                    <option value="">-- Select an approved hotel --</option>
                    {hotels.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name}{h.location?.city ? ` — ${h.location.city}` : ''}{h.category ? ` (${h.category})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {hotels.length === 0 && !hotelsLoading && (
                  <p style={{ fontSize: '0.8rem', color: '#EF4444', marginTop: 4 }}>
                    No approved hotels found. Approve hotels in Hotel Management first.
                  </p>
                )}
              </label>

              {/* Badge */}
              <label className="cm-field-group">
                <span className="cm-field-label">Badge text</span>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="e.g. Top Pick, Popular, New"
                  value={formData.badge}
                  onChange={(e) => setFormData((p) => ({ ...p, badge: e.target.value }))}
                />
              </label>

              {/* Display order */}
              <label className="cm-field-group">
                <span className="cm-field-label">Display order</span>
                <input
                  type="number"
                  className="cm-input"
                  placeholder="0"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData((p) => ({ ...p, displayOrder: e.target.value }))}
                />
              </label>

              {/* Featured until */}
              <label className="cm-field-group">
                <span className="cm-field-label">Featured until (optional)</span>
                <input
                  type="date"
                  className="cm-input"
                  value={formData.featuredUntil}
                  onChange={(e) => setFormData((p) => ({ ...p, featuredUntil: e.target.value }))}
                />
              </label>
            </div>

            <div className="cm-modal-actions">
              <button type="button" className="cm-btn cm-btn-ghost" onClick={() => handleSave('draft')} disabled={saving}>
                Save Draft
              </button>
              <button type="button" className="cm-btn cm-btn-primary" onClick={handlePublish} disabled={saving}>
                {saving ? 'Saving…' : 'Publish'}
              </button>
            </div>
          </section>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          message="Remove this hotel from the featured list?"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
};

/* ─────────────────────────────────────────────
   TAB DEFINITIONS — fields per content type
───────────────────────────────────────────── */
const HERO_BANNER_FIELDS = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Discover Nepal' },
  { key: 'subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Short tagline below the title' },
  { key: 'eyebrowText', label: 'Eyebrow Text', type: 'text', placeholder: 'e.g. Limited Time Offer' },
  { key: 'ctaText', label: 'CTA Button Text', type: 'text', placeholder: 'e.g. Explore Hotels' },
  { key: 'ctaLink', label: 'CTA Link', type: 'text', placeholder: '/hotels' },
  { key: 'backgroundImage', label: 'Background Image URL', type: 'image', placeholder: 'https://...' },
  { key: 'displayOrder', label: 'Display Order', type: 'number', placeholder: '0' },
];

const DESTINATION_FIELDS = [
  { key: 'name', label: 'Destination Name', type: 'text', placeholder: 'e.g. Pokhara' },
  { key: 'province', label: 'Province / Region', type: 'text', placeholder: 'e.g. Gandaki Province' },
  { key: 'type', label: 'Type', type: 'select', options: [
    { value: 'cultural', label: 'Cultural' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'nature', label: 'Nature' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'spiritual', label: 'Spiritual' },
  ]},
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of the destination' },
  { key: 'images', label: 'Image URLs', type: 'string-list', placeholder: 'https://...' },
  { key: 'bestTime', label: 'Best Time to Visit', type: 'text', placeholder: 'e.g. Oct – Dec' },
  { key: 'weather', label: 'Weather', type: 'text', placeholder: 'e.g. Mild, 18°C – 28°C' },
  { key: 'hotelsCount', label: 'Hotels Count', type: 'number', placeholder: '12' },
  { key: 'activities', label: 'Activities', type: 'string-list', placeholder: 'e.g. Trekking' },
  { key: 'isPopular', label: 'Mark as Popular', type: 'checkbox' },
  { key: 'displayOrder', label: 'Display Order', type: 'number', placeholder: '0' },
];

const OFFER_FIELDS = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Weekend Getaway' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Offer details…' },
  { key: 'image', label: 'Image URL', type: 'image', placeholder: 'https://...' },
  { key: 'discountPercent', label: 'Discount %', type: 'number', placeholder: '20' },
  { key: 'discountFlat', label: 'Flat Discount (Rs)', type: 'number', placeholder: '500' },
  { key: 'code', label: 'Promo Code', type: 'text', placeholder: 'SUMMER20' },
  { key: 'applicableTo', label: 'Applicable To', type: 'select', options: [
    { value: 'rooms', label: 'Rooms' },
    { value: 'food', label: 'Food' },
    { value: 'all', label: 'All' },
  ]},
  { key: 'validFrom', label: 'Valid From', type: 'date' },
  { key: 'validUntil', label: 'Valid Until', type: 'date' },
  { key: 'displayOrder', label: 'Display Order', type: 'number', placeholder: '0' },
];

const MEMBERSHIP_FIELDS = [
  { key: 'tierName', label: 'Tier Name', type: 'text', placeholder: 'e.g. Gold Member' },
  { key: 'price', label: 'Price (Rs)', type: 'number', placeholder: '5999' },
  { key: 'billingCycle', label: 'Billing Cycle', type: 'select', options: [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ]},
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Short description of this tier' },
  { key: 'features', label: 'Features / Benefits', type: 'string-list', placeholder: 'e.g. 10% discount on all bookings' },
  { key: 'highlightFeature', label: 'Highlight Feature', type: 'text', placeholder: 'e.g. Free room upgrades' },
  { key: 'color', label: 'Tier Color', type: 'color' },
  { key: 'isPopular', label: 'Most Popular', type: 'checkbox' },
  { key: 'displayOrder', label: 'Display Order', type: 'number', placeholder: '0' },
];

const ABOUT_FIELDS = [
  { key: 'companyStory', label: 'Company Story', type: 'textarea', placeholder: 'The story behind StayHaven…' },
  { key: 'mission', label: 'Mission Statement', type: 'textarea', placeholder: 'Our mission is to…' },
  { key: 'vision', label: 'Vision Statement', type: 'textarea', placeholder: 'We envision…' },
  { key: 'stats', label: 'Stats', type: 'repeater', fields: [
    { key: 'label', label: 'Label', placeholder: 'e.g. Luxury Properties' },
    { key: 'value', label: 'Value', placeholder: 'e.g. 500+' },
  ]},
  { key: 'teamMembers', label: 'Team Members', type: 'repeater', fields: [
    { key: 'name', label: 'Name', placeholder: 'Full name' },
    { key: 'role', label: 'Role', placeholder: 'e.g. CEO' },
    { key: 'image', label: 'Photo URL', placeholder: 'https://...' },
    { key: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Short bio…' },
  ]},
  { key: 'testimonials', label: 'Testimonials', type: 'repeater', fields: [
    { key: 'guestName', label: 'Guest Name', placeholder: 'John Doe' },
    { key: 'location', label: 'Location', placeholder: 'Kathmandu' },
    { key: 'rating', label: 'Rating (1-5)', placeholder: '5' },
    { key: 'review', label: 'Review', type: 'textarea', placeholder: 'Amazing stay…' },
    { key: 'avatar', label: 'Avatar URL', placeholder: 'https://...' },
  ]},
];

const FOOTER_FIELDS = [
  { key: 'quickLinks', label: 'Quick Links', type: 'repeater', fields: [
    { key: 'label', label: 'Label', placeholder: 'e.g. Home' },
    { key: 'href', label: 'URL', placeholder: '/' },
  ]},
  { key: 'exploreLinks', label: 'Explore Links', type: 'repeater', fields: [
    { key: 'label', label: 'Label', placeholder: 'e.g. Pokhara' },
    { key: 'href', label: 'URL', placeholder: '/hotels' },
  ]},
  { key: 'contactInfo', label: 'Contact Info', type: 'repeater', fields: [
    { key: 'address', label: 'Address', placeholder: 'Thamel, Kathmandu' },
    { key: 'phone', label: 'Phone', placeholder: '+977 01-2136 567' },
    { key: 'email', label: 'Email', placeholder: 'support@stayhaven.com.np' },
  ]},
  { key: 'socialLinks', label: 'Social Links', type: 'repeater', fields: [
    { key: 'platform', label: 'Platform', placeholder: 'Facebook' },
    { key: 'url', label: 'URL', placeholder: 'https://facebook.com/...' },
  ]},
  { key: 'copyrightText', label: 'Copyright Text', type: 'text', placeholder: '© 2025 StayHaven. All rights reserved.' },
  { key: 'newsletterEnabled', label: 'Show Newsletter Section', type: 'checkbox' },
];

const SITE_SETTINGS_FIELDS = [
  { key: 'totalTravelers', label: 'Total Travelers (display)', type: 'text', placeholder: '50,000+' },
  { key: 'avgRating', label: 'Average Rating (display)', type: 'text', placeholder: '4.8' },
  { key: 'liveViewers', label: 'Live Viewers (number)', type: 'number', placeholder: '23' },
  { key: 'secureBooking', label: 'Show Secure Booking Badge', type: 'checkbox' },
  { key: 'trustBadges', label: 'Trust Badges', type: 'repeater', fields: [
    { key: 'icon', label: 'Icon (emoji or symbol)', placeholder: '🔒' },
    { key: 'text', label: 'Badge Text', placeholder: 'Secure Booking' },
  ]},
];

/* ─────────────────────────────────────────────
   TAB CONFIG
───────────────────────────────────────────── */
const TABS = [
  {
    id: 'hero-banners',
    label: 'Hero Banners',
    icon: 'image',
    type: 'list',
    contentType: 'hero-banners',
    accent: '#0ea5a0',
    fields: HERO_BANNER_FIELDS,
    cardTitle: (item) => item.title || 'Untitled Banner',
    cardSubtitle: (item) => item.subtitle || item.eyebrowText || '',
  },
  {
    id: 'featured-hotels',
    label: 'Featured Hotels',
    icon: 'hotel',
    type: 'featured-hotels',
  },
  {
    id: 'destinations',
    label: 'Destinations',
    icon: 'map',
    type: 'list',
    contentType: 'destinations',
    accent: '#06B6D4',
    fields: DESTINATION_FIELDS,
    cardTitle: (item) => item.name || 'Untitled Destination',
    cardSubtitle: (item) => `${item.province || ''} — ${item.type || ''}`.replace(/^—\s/, '').replace(/\s—$/, ''),
  },
  {
    id: 'offers',
    label: 'Offers',
    icon: 'sell',
    type: 'list',
    contentType: 'offers',
    accent: '#F59E0B',
    fields: OFFER_FIELDS,
    cardTitle: (item) => item.title || 'Untitled Offer',
    cardSubtitle: (item) => {
      if (item.discountPercent) return `${item.discountPercent}% OFF`;
      if (item.discountFlat) return `Rs ${item.discountFlat} OFF`;
      return item.code || '';
    },
  },
  {
    id: 'memberships',
    label: 'Memberships',
    icon: 'workspace_premium',
    type: 'list',
    contentType: 'memberships',
    accent: '#8B5CF6',
    fields: MEMBERSHIP_FIELDS,
    cardTitle: (item) => item.tierName || 'Untitled Tier',
    cardSubtitle: (item) => item.price != null ? `Rs ${Number(item.price).toLocaleString()} / ${item.billingCycle || 'year'}` : '',
  },
  {
    id: 'about',
    label: 'About Us',
    icon: 'info',
    type: 'singleton',
    contentType: 'about',
    fields: ABOUT_FIELDS,
  },
  {
    id: 'footer',
    label: 'Footer',
    icon: 'link',
    type: 'singleton',
    contentType: 'footer',
    fields: FOOTER_FIELDS,
  },
  {
    id: 'site-settings',
    label: 'Site Settings',
    icon: 'tune',
    type: 'singleton',
    contentType: 'site-settings',
    autoPublish: true,
    fields: SITE_SETTINGS_FIELDS,
  },
];

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
const ContentManagement = ({ embedded = false }) => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  const content = (
    <div className="cm-page-shell">
      {/* Hero header */}
      <section className="cm-hero-card" aria-labelledby="content-management-title">
        <div className="cm-hero-copy">
          <span className="cm-eyebrow">StayHaven content studio</span>
          <h1 id="content-management-title">Content Management</h1>
          <p>Manage every customer-facing section of the website from one place.</p>
        </div>
      </section>

      {/* Tabs */}
      <nav className="cm-tabs" aria-label="Content sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`cm-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            <span className="material-symbols-outlined">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab body */}
      <div className="cm-tab-body">
        {currentTab.type === 'featured-hotels' ? (
          <FeaturedHotelsTab key={currentTab.id} />
        ) : currentTab.type === 'list' ? (
          <ContentListTab
            key={currentTab.id}
            contentType={currentTab.contentType}
            fields={currentTab.fields}
            cardTitle={currentTab.cardTitle}
            cardSubtitle={currentTab.cardSubtitle}
            accent={currentTab.accent}
          />
        ) : (
          <SingletonTab
            key={currentTab.id}
            contentType={currentTab.contentType}
            fields={currentTab.fields}
            autoPublish={currentTab.autoPublish || false}
          />
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <SuperAdminLayout pageTitle="Content Management">
      {content}
    </SuperAdminLayout>
  );
};

export default ContentManagement;
