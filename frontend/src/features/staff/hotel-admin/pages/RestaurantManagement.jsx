import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  Moon,
  Sun,
  Clock,
  ChefHat,
  ArrowRight,
  ImagePlus,
  X,
} from 'lucide-react';
import useHotelId from '../hooks/useHotelId';
import {
  getMenuItems, getMenuCategories, createMenuItem, updateMenuItem, deleteMenuItem, bulkToggleAvailability,
} from '../services/menuApi';
import ConfirmDialog from '../components/ui/ConfirmModal';
import {
  PageHeader,
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  Badge,
  SearchInput,
  Segmented,
  EmptyState,
  ErrorState,
  Skeleton,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import TableManagement from './TableManagement';
import '../styles/hotel-admin-tokens.css';

const TABS = [
  { value: 'tables', label: 'Tables', icon: <UtensilsCrossed size={15} aria-hidden="true" /> },
  { value: 'menu', label: 'Menu', icon: <ChefHat size={15} aria-hidden="true" /> },
  { value: 'kitchen', label: 'Kitchen', icon: <Clock size={15} aria-hidden="true" /> },
];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EMPTY_MENU = { name: '', category: '', price: '', description: '', isAvailable: true, preparationTime: '' };

// Mirrors menuController validation (name ≤100, description ≤500, price 0–1,000,000 with
// 2 decimals, preparation time 5–120 whole minutes or empty).
function validateMenuForm(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Item name is required';
  else if (form.name.trim().length > 100) errs.name = 'Use 100 characters or fewer';
  if (!form.category) errs.category = 'Category is required';
  const price = String(form.price).trim();
  if (price === '') errs.price = 'Price is required';
  else if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) > 1000000) errs.price = 'Enter 0 to 1,000,000 (max 2 decimals)';
  const prep = String(form.preparationTime).trim();
  if (prep !== '' && (!/^\d+$/.test(prep) || Number(prep) < 5 || Number(prep) > 120)) errs.preparationTime = 'Enter 5 to 120 minutes, or leave empty';
  if (form.description.length > 500) errs.description = 'Use 500 characters or fewer';
  return errs;
}

const RestaurantManagement = ({ onNavigate }) => {
  const hotelId = useHotelId();

  const [tab, setTab] = useState('tables');
  const [actionLoading, setActionLoading] = useState({});
  const setAct = (key, val) => setActionLoading((p) => ({ ...p, [key]: val }));

  /* menu */
  const [menuItems, setMenuItems] = useState([]);
  const [menuCats, setMenuCats] = useState([]);
  const [mLoading, setMLoading] = useState(false);
  const [mError, setMError] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const dMenuSearch = useDebouncedValue(menuSearch, 250);
  const [menuCat, setMenuCat] = useState('all');
  const [menuAvail, setMenuAvail] = useState('all');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selMenu, setSelMenu] = useState(null);
  const [menuForm, setMenuForm] = useState(EMPTY_MENU);
  const [menuFormErr, setMenuFormErr] = useState({});
  const [menuAlert, setMenuAlert] = useState('');
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [deleteMenu_, setDeleteMenu_] = useState(null);
  const [bulkToggle_, setBulkToggle_] = useState(null); // { isAvailable }

  /* ── Menu API ── */
  const fetchMenu = useCallback(async ({ silent = false } = {}) => {
    if (!hotelId) return;
    if (!silent) setMLoading(true);
    setMError(null);
    try {
      const [mRes, cRes] = await Promise.all([getMenuItems({ hotelId, available: 'all' }), getMenuCategories()]);
      setMenuItems(mRes.data.menuItems || []);
      setMenuCats(cRes.data.categories || []);
    } catch (err) {
      setMError(err.response?.data?.message || 'Failed to load the menu');
    } finally {
      setMLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (tab === 'menu') fetchMenu();
  }, [tab, fetchMenu]);

  // Revoke blob previews so repeated picks don't leak memory
  useEffect(() => () => {
    if (menuImagePreview?.startsWith('blob:')) URL.revokeObjectURL(menuImagePreview);
  }, [menuImagePreview]);

  const setMenuField = (name, value) => {
    setMenuForm((p) => ({ ...p, [name]: value }));
    setMenuFormErr((p) => ({ ...p, [name]: undefined }));
  };

  const handleMenuSubmit = async (e) => {
    e?.preventDefault();
    if (actionLoading.msubmit) return;
    const errs = validateMenuForm(menuForm);
    if (Object.keys(errs).length) {
      setMenuFormErr(errs);
      return;
    }
    setAct('msubmit', true);
    setMenuAlert('');
    try {
      const payload = {
        name: menuForm.name.trim(),
        category: menuForm.category,
        description: menuForm.description.trim(),
        isAvailable: menuForm.isAvailable,
        price: Number(menuForm.price),
        preparationTime: String(menuForm.preparationTime).trim() === '' ? '' : Number(menuForm.preparationTime),
        hotelId,
        imageFile: menuImageFile,
        ...(removeImage && !menuImageFile ? { image: '' } : {}),
      };
      if (selMenu) {
        await updateMenuItem(selMenu._id, payload);
        toast.success(`${payload.name} updated`);
      } else {
        await createMenuItem(payload);
        toast.success(`${payload.name} added to the menu`);
      }
      setShowMenuModal(false);
      setSelMenu(null);
      setMenuImageFile(null);
      setMenuImagePreview(null);
      fetchMenu({ silent: true });
    } catch (err) {
      setMenuAlert(err.response?.data?.message || 'Could not save the menu item. Please try again.');
    } finally {
      setAct('msubmit', false);
    }
  };

  const handleMenuImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setMenuFormErr((p) => ({ ...p, image: 'Use a JPG, PNG or WEBP image' }));
      return;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      setMenuFormErr((p) => ({ ...p, image: 'Images must be between 1 byte and 5 MB' }));
      return;
    }
    setMenuFormErr((p) => ({ ...p, image: undefined }));
    setMenuImageFile(file);
    setRemoveImage(false);
    setMenuImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setMenuImageFile(null);
    setMenuImagePreview(null);
    setRemoveImage(true);
  };

  const confirmDelMenu = async () => {
    if (!deleteMenu_) return;
    setAct('delMenu', true);
    try {
      await deleteMenuItem(deleteMenu_._id);
      toast.success(`${deleteMenu_.name} deleted`);
      setDeleteMenu_(null);
      fetchMenu({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setAct('delMenu', false);
    }
  };

  const confirmBulkToggle = async () => {
    if (!bulkToggle_) return;
    setAct('bulkToggle', true);
    try {
      const res = await bulkToggleAvailability({ hotelId, isAvailable: bulkToggle_.isAvailable });
      toast.success(res.data.message || 'Availability updated');
      setBulkToggle_(null);
      fetchMenu({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
    } finally {
      setAct('bulkToggle', false);
    }
  };

  const openMenuEdit = (item) => {
    setSelMenu(item);
    setMenuForm({
      name: item.name || '',
      category: item.category || '',
      price: item.price ?? '',
      description: item.description || '',
      isAvailable: item.isAvailable !== false,
      preparationTime: item.preparationTime ?? '',
    });
    setMenuFormErr({});
    setMenuAlert('');
    setMenuImageFile(null);
    setRemoveImage(false);
    setMenuImagePreview(item.image || null);
    setShowMenuModal(true);
  };
  const openMenuCreate = () => {
    setSelMenu(null);
    setMenuForm(EMPTY_MENU);
    setMenuFormErr({});
    setMenuAlert('');
    setMenuImageFile(null);
    setRemoveImage(false);
    setMenuImagePreview(null);
    setShowMenuModal(true);
  };

  /* ── Derived ── */
  const filteredMenu = useMemo(() => {
    const q = dMenuSearch.trim().toLowerCase();
    return menuItems.filter((m) => {
      const matchS = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
      const matchC = menuCat === 'all' || m.category === menuCat;
      const matchA = menuAvail === 'all' || (menuAvail === 'available' ? m.isAvailable : !m.isAvailable);
      return matchS && matchC && matchA;
    });
  }, [menuItems, dMenuSearch, menuCat, menuAvail]);

  const menuFiltersActive = !!(dMenuSearch || menuCat !== 'all' || menuAvail !== 'all');
  const clearMenuFilters = () => { setMenuSearch(''); setMenuCat('all'); setMenuAvail('all'); };

  return (
    <div className="ha-page">
      <PageHeader
        title="Restaurant"
        subtitle="Tables, menu items, and kitchen overview."
        toolbar={<Segmented options={TABS} value={tab} onChange={setTab} ariaLabel="Restaurant view" />}
      />

      {/* ══ TABLES TAB (same component as Table QR Codes) ══ */}
      {tab === 'tables' && <TableManagement embedded />}

      {/* ══ MENU TAB ══ */}
      {tab === 'menu' && (
        <>
          <div className="ha-toolbar" style={{ marginBottom: 20 }}>
            <div className="ha-toolbar__group">
              <SearchInput value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search menu…" ariaLabel="Search menu" />
              <Select value={menuCat} onChange={(e) => setMenuCat(e.target.value)} aria-label="Filter by category">
                <option value="all">All Categories</option>
                {menuCats.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Select value={menuAvail} onChange={(e) => setMenuAvail(e.target.value)} aria-label="Filter by availability">
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </Select>
            </div>
            <div className="ha-toolbar__group">
              <Button variant="secondary" onClick={() => setBulkToggle_({ isAvailable: false })} disabled={actionLoading.bulkToggle || menuItems.length === 0}><Moon size={16} aria-hidden="true" /> Close Kitchen</Button>
              <Button variant="secondary" onClick={() => setBulkToggle_({ isAvailable: true })} disabled={actionLoading.bulkToggle || menuItems.length === 0}><Sun size={16} aria-hidden="true" /> Mark All Available</Button>
              <Button variant="primary" onClick={openMenuCreate}><Plus size={16} aria-hidden="true" /> Add Item</Button>
            </div>
          </div>

          {mError ? (
            <ErrorState description={mError} onRetry={() => fetchMenu()} />
          ) : mLoading ? (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))' }} aria-busy="true" aria-label="Loading menu">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="ha-card ha-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="30%" height={12} />
                  <Skeleton width="90%" height={12} />
                  <Skeleton width="40%" height={18} />
                </div>
              ))}
            </div>
          ) : filteredMenu.length === 0 ? (
            menuItems.length === 0 ? (
              <EmptyState icon={<ChefHat size={26} />} title="No menu items yet" description="Add your first menu item so guests can order." action={<Button variant="primary" size="sm" onClick={openMenuCreate}><Plus size={15} aria-hidden="true" /> Add Item</Button>} />
            ) : (
              <EmptyState icon={<ChefHat size={26} />} title="No items match" description="Try a different search or clear the filters." action={menuFiltersActive ? <Button variant="secondary" size="sm" onClick={clearMenuFilters}>Clear filters</Button> : null} />
            )
          ) : (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))' }}>
              {filteredMenu.map((item) => (
                <div key={item._id} className="ha-card" style={{ opacity: item.isAvailable ? 1 : 0.75, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {item.image && (
                    <img src={item.image} alt="" loading="lazy" width={400} height={300} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', height: 'auto', display: 'block' }} />
                  )}
                  <div className="ha-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="ha-body-strong" style={{ color: 'var(--ha-text)', overflowWrap: 'anywhere' }}>{item.name}</div>
                        <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{item.category}</div>
                      </div>
                      <Badge tone={item.isAvailable ? 'success' : 'danger'}>{item.isAvailable ? 'Available' : 'Unavailable'}</Badge>
                    </div>
                    {item.description && <p className="ha-small" style={{ color: 'var(--ha-text-muted)', overflowWrap: 'anywhere' }}>{item.description}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: 8 }}>
                      <span className="ha-money haNum" style={{ color: 'var(--ha-text)' }}>Rs. {Number(item.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      {item.preparationTime ? <span className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)' }}><Clock size={12} aria-hidden="true" /> {item.preparationTime} min</span> : null}
                      <div className="ha-table__row-actions">
                        <IconButton aria-label={`Edit ${item.name}`} onClick={() => openMenuEdit(item)}><Pencil size={16} aria-hidden="true" /></IconButton>
                        <IconButton aria-label={`Delete ${item.name}`} onClick={() => setDeleteMenu_(item)} style={{ color: 'var(--ha-danger-text)' }}><Trash2 size={16} aria-hidden="true" /></IconButton>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ KITCHEN TAB ══ */}
      {tab === 'kitchen' && (
        <EmptyState
          icon={<ChefHat size={26} />}
          title="Kitchen Display"
          description="Live kitchen orders are managed in the Orders section. Switch to Orders for full kitchen controls."
          action={<Button variant="primary" size="sm" onClick={() => onNavigate?.('orders')}>Go to Orders <ArrowRight size={15} aria-hidden="true" /></Button>}
        />
      )}

      {/* Menu modal */}
      <Modal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        title={selMenu ? `Edit ${selMenu.name}` : 'Add Menu Item'}
        busy={!!actionLoading.msubmit}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMenuModal(false)} disabled={actionLoading.msubmit}>Cancel</Button>
            <Button variant="primary" type="submit" form="ha-menu-form" loading={actionLoading.msubmit}>{actionLoading.msubmit ? 'Saving…' : selMenu ? 'Update Item' : 'Add Item'}</Button>
          </>
        }
      >
        <form id="ha-menu-form" onSubmit={handleMenuSubmit} noValidate className="ha-form-grid">
          <div className="ha-form-grid__full">
            <Input label="Item Name" required maxLength={100} counter value={menuForm.name} onChange={(e) => setMenuField('name', e.target.value)} placeholder="e.g. Chicken Momo" error={menuFormErr.name} />
          </div>
          <Select label="Category" required value={menuForm.category} onChange={(e) => setMenuField('category', e.target.value)} error={menuFormErr.category}>
            <option value="" disabled>Select category…</option>
            {menuCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Price (NPR)" required inputMode="decimal" value={menuForm.price} onChange={(e) => setMenuField('price', e.target.value)} error={menuFormErr.price} hint="0 is allowed (complimentary)" />
          <Input label="Prep Time (min)" inputMode="numeric" value={menuForm.preparationTime} onChange={(e) => setMenuField('preparationTime', e.target.value)} error={menuFormErr.preparationTime} hint="5–120 minutes, optional" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--ha-text-muted)', alignSelf: 'end', minHeight: 44 }}>
            <input type="checkbox" checked={menuForm.isAvailable} onChange={(e) => setMenuField('isAvailable', e.target.checked)} style={{ width: 20, height: 20 }} />
            Available to order
          </label>
          <div className="ha-form-grid__full">
            <Textarea label="Description" rows="2" maxLength={500} counter value={menuForm.description} onChange={(e) => setMenuField('description', e.target.value)} placeholder="Describe the item" error={menuFormErr.description} />
          </div>
          <div className="ha-form-grid__full ha-field">
            <span className="ha-field__label" id="ha-menu-photo-label">Item Photo</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 12, border: '1px dashed var(--ha-border-strong)', borderRadius: 'var(--ha-radius-md)' }}>
              {menuImagePreview ? (
                <img src={menuImagePreview} alt="Selected menu item" width={120} height={90} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ha-border)' }} />
              ) : (
                <span aria-hidden="true" style={{ width: 120, height: 90, borderRadius: 8, background: 'var(--ha-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ha-text-subtle)' }}><ImagePlus size={22} /></span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="ha-btn ha-btn--secondary ha-btn--sm" style={{ cursor: 'pointer', position: 'relative' }}>
                  <ImagePlus size={14} aria-hidden="true" /> {menuImagePreview ? 'Replace photo' : 'Choose photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleMenuImageChange} aria-labelledby="ha-menu-photo-label" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
                </label>
                {menuImagePreview && (
                  <Button variant="ghost" size="sm" onClick={clearImage}><X size={14} aria-hidden="true" /> Remove</Button>
                )}
                <span className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>JPG, PNG or WEBP · max 5 MB</span>
              </div>
            </div>
            {menuFormErr.image && <span className="ha-field__error" role="alert">{menuFormErr.image}</span>}
          </div>
          {menuAlert && <div className="ha-alert ha-alert--danger ha-form-grid__full" role="alert">{menuAlert}</div>}
        </form>
      </Modal>

      {/* Confirmations */}
      <ConfirmDialog isOpen={!!deleteMenu_} onClose={() => setDeleteMenu_(null)} onConfirm={confirmDelMenu} variant="danger" title={deleteMenu_ ? `Delete ${deleteMenu_.name}?` : ''} message={deleteMenu_ ? `"${deleteMenu_.name}" is removed from the menu. Past orders keep their item names and prices.` : ''} confirmText="Delete Item" loading={actionLoading.delMenu} />
      <ConfirmDialog
        isOpen={!!bulkToggle_}
        onClose={() => setBulkToggle_(null)}
        onConfirm={confirmBulkToggle}
        variant={bulkToggle_?.isAvailable ? 'info' : 'warning'}
        title={bulkToggle_?.isAvailable ? 'Mark all items available?' : 'Close the kitchen?'}
        message={bulkToggle_?.isAvailable ? `All ${menuItems.length} menu items become orderable on the guest QR menu.` : `All ${menuItems.length} menu items are hidden from guest ordering until you reopen the kitchen.`}
        confirmText={bulkToggle_?.isAvailable ? 'Mark All Available' : 'Close Kitchen'}
        loading={actionLoading.bulkToggle}
      />
    </div>
  );
};

export default RestaurantManagement;
