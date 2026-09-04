import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createOrder,
  deleteOrder,
  getMenuItems,
  getOrders,
  sendOrderBill,
  updateOrder,
  updateOrderStatus,
} from '../../../../core/api/services/staff.service';
import {
  Plus,
  RefreshCcw,
  Search,
  Loader2,
  CheckCircle2,
  Clock3,
  XCircle,
  Pencil,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  X,
  User,
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  CheckCircle,
  Info,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '../../../../core/context/SocketContext';
import BillPreviewModal from '../../../../shared/components/BillPreviewModal';
import { useStaffAuth } from '../../../../context/StaffAuthContext';

const EMPTY_ITEM = { name: '', quantity: 1, price: 0 };

/* ─────────────────────────────────────────────────────────────────
   CSS — all styles scoped with .ro- prefix, zero Tailwind
───────────────────────────────────────────────────────────────── */
const ORDERS_CSS = `
  :root {
    --order-pending:   #F59E0B;
    --order-preparing: #3B82F6;
    --order-ready:     #8B5CF6;
    --order-delivered: #10B981;
    --order-cancelled: #EF4444;
    --order-confirmed: #06B6D4;
  }

  /* ── Container ── */
  .ro-wrap { padding: 20px; }

  /* ── Error banner ── */
  .ro-error {
    margin-bottom: 16px; padding: 12px 16px; border-radius: 10px;
    border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; font-size: 13px; font-weight: 500;
  }

  /* ── Stat grid ── */
  .ro-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px; margin-bottom: 20px;
  }
  @media (max-width: 768px) { .ro-stat-grid { grid-template-columns: repeat(2,1fr); } }

  /* ── Stat card ── */
  .ro-stat {
    border-radius: 14px; padding: 16px 18px;
    background: var(--bg-surface, #fff);
    border: 1px solid var(--border-primary, #e2e8f0);
    border-left: 4px solid transparent;
    position: relative; overflow: hidden;
    transition: transform .2s ease, box-shadow .2s ease;
    cursor: default;
  }
  .ro-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
  .ro-stat--total     { border-left-color: #4f46e5; }
  .ro-stat--pending   { border-left-color: var(--order-pending); }
  .ro-stat--preparing { border-left-color: var(--order-preparing); }
  .ro-stat--delivered { border-left-color: var(--order-delivered); }

  .ro-stat-hd {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; font-weight: 500;
    color: var(--text-secondary, #64748b); margin-bottom: 8px;
  }
  .ro-stat-ico {
    width: 28px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .ro-stat-ico--total     { background: #eef2ff; color: #4f46e5; }
  .ro-stat-ico--pending   { background: #fffbeb; color: var(--order-pending); }
  .ro-stat-ico--preparing { background: #eff6ff; color: var(--order-preparing); }
  .ro-stat-ico--delivered { background: #f0fdf4; color: var(--order-delivered); }

  .ro-stat-val { font-size: 28px; font-weight: 800; color: var(--text-primary,#1e293b); line-height:1; margin-bottom:6px; }
  .ro-stat-trend { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--text-secondary,#64748b); }
  .ro-stat-trend--up   { color: #10b981; }
  .ro-stat-trend--flat { color: var(--text-secondary,#64748b); }

  @keyframes ro-pulse-out {
    0%   { transform: scale(1); opacity: .7; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  .ro-live-dot {
    width:8px; height:8px; border-radius:50%;
    background: var(--order-preparing); display:inline-block; position:relative;
  }
  .ro-live-dot::after {
    content:''; position:absolute; inset:-2px; border-radius:50%;
    background: var(--order-preparing); opacity:.4;
    animation: ro-pulse-out 1.6s ease-out infinite;
  }

  /* ── Search ── */
  .ro-search-wrap { position:relative; flex:1; min-width:260px; }
  .ro-search-bar {
    display:flex; align-items:center; gap:10px;
    background: var(--bg-surface,#fff);
    border: 1.5px solid var(--border-primary,#e2e8f0);
    border-radius: 28px; padding: 10px 16px;
    transition: border-color .2s ease, box-shadow .2s ease;
  }
  .ro-search-bar:focus-within {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79,70,229,.10);
  }
  .ro-search-bar input {
    border:none; outline:none; width:100%;
    background:transparent; font-size:14px;
    color: var(--text-primary,#1e293b);
    font-family: inherit;
  }
  .ro-search-bar input::placeholder { color: var(--text-secondary,#94a3b8); }
  .ro-kbd {
    padding: 2px 7px; border-radius:5px;
    border: 1px solid var(--border-primary,#e2e8f0);
    background: var(--bg-muted,#f8fafc);
    font-size:11px; font-weight:700; color:var(--text-secondary,#94a3b8);
    white-space:nowrap; flex-shrink:0;
  }
  .ro-search-clear {
    width:20px; height:20px; border-radius:50%; border:none;
    background: var(--border-primary,#e2e8f0); color:var(--text-secondary,#64748b);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; flex-shrink:0; transition:background .15s ease;
  }
  .ro-search-clear:hover { background:#cbd5e1; }
  .ro-search-count {
    font-size:12px; color:var(--text-secondary,#64748b);
    margin-top:6px; padding-left:16px;
  }

  /* ── Toolbar row ── */
  .ro-toolbar { display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; margin-bottom:14px; }

  /* ── Filter rows ── */
  .ro-filters { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
  .ro-filter-row-wrap { display:flex; align-items:center; gap:8px; }
  .ro-filter-row {
    display:flex; gap:6px; flex-wrap:nowrap;
    overflow-x:auto; scrollbar-width:none; flex:1;
  }
  .ro-filter-row::-webkit-scrollbar { display:none; }

  /* ── Pill tabs ── */
  .ro-pill {
    display:inline-flex; align-items:center; gap:5px;
    padding:6px 13px; border-radius:20px;
    border: 1.5px solid var(--border-primary,#e2e8f0);
    font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;
    transition:all .15s ease;
    background: var(--bg-surface,#fff); color:var(--text-secondary,#64748b);
  }
  .ro-pill:hover { border-color:#4f46e5; color:#4f46e5; }
  .ro-pill--sm { font-size:12px; padding:4px 10px; font-weight:500; }
  .ro-pill--active { background:#4f46e5; border-color:#4f46e5; color:#fff; }
  .ro-pill--active.ro-pill--pending   { background:var(--order-pending);   border-color:var(--order-pending); }
  .ro-pill--active.ro-pill--preparing { background:var(--order-preparing); border-color:var(--order-preparing); }
  .ro-pill--active.ro-pill--ready     { background:var(--order-ready);     border-color:var(--order-ready); }
  .ro-pill--active.ro-pill--delivered { background:var(--order-delivered); border-color:var(--order-delivered); }
  .ro-pill--active.ro-pill--cancelled { background:var(--order-cancelled); border-color:var(--order-cancelled); }
  .ro-pill-badge {
    min-width:18px; height:18px; padding:0 5px; border-radius:99px;
    font-size:10px; font-weight:700; background:rgba(0,0,0,.10);
    display:inline-flex; align-items:center; justify-content:center;
  }
  .ro-pill--active .ro-pill-badge { background:rgba(255,255,255,.25); }

  /* ── Live indicator ── */
  .ro-live {
    display:inline-flex; align-items:center; gap:5px;
    font-size:11px; font-weight:600; color:var(--order-delivered);
    padding:3px 9px; border-radius:99px;
    background:rgba(16,185,129,.08);
    white-space:nowrap; flex-shrink:0;
  }
  @keyframes ro-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
  .ro-live-blink {
    width:6px; height:6px; border-radius:50%;
    background:var(--order-delivered);
    animation: ro-blink 1.5s ease-in-out infinite;
  }

  /* ── Action bar ── */
  .ro-action-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
  .ro-last-upd { font-size:11px; color:var(--text-secondary,#94a3b8); }
  .ro-sort-sel {
    padding:8px 12px; border-radius:10px;
    border: 1.5px solid var(--border-primary,#e2e8f0);
    background:var(--bg-surface,#fff); color:var(--text-primary,#1e293b);
    font-size:13px; font-weight:500; cursor:pointer; outline:none;
    font-family:inherit;
  }

  /* ── Buttons ── */
  .ro-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 14px; border-radius:10px; border:none;
    font-size:13px; font-weight:600; cursor:pointer;
    transition:all .2s ease; white-space:nowrap; outline:none;
    font-family:inherit;
  }
  .ro-btn:disabled { opacity:.6; cursor:not-allowed; }
  .ro-btn--primary {
    background: linear-gradient(135deg,#4f46e5,#7c3aed);
    color:#fff; border:none;
    box-shadow: 0 2px 8px rgba(79,70,229,.30);
  }
  .ro-btn--primary:hover:not(:disabled) {
    transform:translateY(-1px);
    box-shadow: 0 4px 16px rgba(79,70,229,.40);
  }
  @keyframes ro-new-pulse {
    0%,100% { box-shadow: 0 2px 8px rgba(79,70,229,.30); }
    50%      { box-shadow: 0 0 0 8px rgba(79,70,229,.12), 0 2px 8px rgba(79,70,229,.30); }
  }
  .ro-btn--pulse { animation: ro-new-pulse 8s ease-in-out infinite; }
  .ro-btn--secondary {
    background: var(--bg-surface,#fff); color:var(--text-primary,#1e293b);
    border: 1.5px solid var(--border-primary,#e2e8f0);
  }
  .ro-btn--secondary:hover:not(:disabled) { border-color:#4f46e5; color:#4f46e5; }
  .ro-btn--danger { background:#fff1f2; color:#b91c1c; border:1.5px solid #fecaca; }
  .ro-btn--danger:hover:not(:disabled) { background:#fee2e2; }
  .ro-btn--sm { padding:7px 11px; font-size:12px; }
  .ro-btn--icon-only {
    padding:6px; width:32px; height:32px; justify-content:center;
    border: 1.5px solid var(--border-primary,#e2e8f0);
    background:var(--bg-surface,#fff); color:var(--text-primary,#1e293b);
  }
  .ro-btn--start-prep { background:#eff6ff; color:var(--order-preparing); border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; }
  .ro-btn--start-prep:hover  { background:#dbeafe; }
  .ro-btn--mark-ready { background:#f5f3ff; color:var(--order-ready);     border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; }
  .ro-btn--mark-ready:hover  { background:#ede9fe; }
  .ro-btn--mark-del   { background:#f0fdf4; color:var(--order-delivered); border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; }
  .ro-btn--mark-del:hover    { background:#dcfce7; }

  @keyframes ro-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  .ro-spin { animation: ro-spin .7s linear infinite; }

  /* ── Cards list ── */
  .ro-cards { display:grid; gap:12px; }

  /* ── Order card ── */
  @keyframes ro-slide-in {
    from { opacity:0; transform:translateY(-14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ro-new-flash {
    0%   { background: #fef9c3; }
    100% { background: var(--bg-surface,#fff); }
  }
  .ro-card {
    border-radius:14px; background:var(--bg-surface,#fff);
    border: 1px solid var(--border-primary,#e2e8f0);
    border-left: 4px solid #e2e8f0; padding:20px;
    transition: box-shadow .2s ease, border-left-color .3s ease;
    animation: ro-slide-in .35s ease both;
  }
  .ro-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.07); }
  .ro-card--pending   { border-left-color: var(--order-pending); }
  .ro-card--confirmed { border-left-color: var(--order-confirmed); }
  .ro-card--preparing { border-left-color: var(--order-preparing); }
  .ro-card--ready     { border-left-color: var(--order-ready); }
  .ro-card--delivered { border-left-color: var(--order-delivered); }
  .ro-card--cancelled { border-left-color: var(--order-cancelled); }
  .ro-card--new-arrival {
    animation: ro-slide-in .4s ease both, ro-new-flash 1.2s ease .4s both;
  }

  /* card header */
  .ro-card-hd {
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:12px; margin-bottom:12px; flex-wrap:wrap;
  }
  .ro-card-num  { font-size:16px; font-weight:700; color:var(--text-primary,#1e293b); margin-bottom:4px; }
  .ro-card-loc  { font-size:13px; font-weight:500; color:var(--text-secondary,#64748b); display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
  .ro-card-hd-r { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }
  .ro-card-time      { font-size:12px; color:var(--text-secondary,#94a3b8); }
  .ro-card-time--old { color:var(--order-cancelled); font-weight:600; }

  /* status badge */
  .ro-badge {
    display:inline-flex; align-items:center;
    padding:3px 10px; border-radius:8px;
    font-size:11px; font-weight:700;
    letter-spacing:.3px; text-transform:uppercase;
    transition: background .3s ease, color .3s ease;
  }
  .ro-badge--pending   { background:#fef3c7; color:#92400e; }
  .ro-badge--confirmed { background:#cffafe; color:#164e63; }
  .ro-badge--preparing { background:#dbeafe; color:#1e40af; }
  .ro-badge--ready     { background:#ede9fe; color:#5b21b6; }
  .ro-badge--delivered { background:#dcfce7; color:#166534; }
  .ro-badge--cancelled { background:#fee2e2; color:#991b1b; }

  /* divider */
  .ro-divider { height:1px; background:var(--border-primary,#e2e8f0); margin:12px -20px; }

  /* items */
  .ro-items { display:flex; flex-direction:column; gap:3px; }
  .ro-item-row { display:flex; justify-content:space-between; font-size:14px; }
  .ro-item-name { color:var(--text-secondary,#475569); }
  .ro-expand-btn {
    font-size:12px; color:#4f46e5; cursor:pointer; font-weight:600;
    background:none; border:none; padding:4px 0; margin-top:2px;
    display:inline-flex; align-items:center; gap:4px; font-family:inherit;
  }
  .ro-expand-btn:hover { text-decoration:underline; }

  /* card footer */
  .ro-card-ft {
    display:flex; align-items:center; justify-content:space-between;
    gap:12px; flex-wrap:wrap; margin-top:12px;
  }
  .ro-total-wrap { display:flex; align-items:center; gap:8px; }
  .ro-total { font-size:16px; font-weight:700; color:var(--text-primary,#1e293b); }
  .ro-pay-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; }
  .ro-pay-badge--paid   { background:#dcfce7; color:#166534; }
  .ro-pay-badge--unpaid { background:#fee2e2; color:#991b1b; }
  .ro-card-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }

  /* ── Skeleton ── */
  @keyframes ro-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  .ro-skel {
    border-radius:6px;
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size:200% 100%;
    animation: ro-shimmer 1.5s infinite;
  }
  .ro-skel-card {
    border-radius:14px; background:var(--bg-surface,#fff);
    border:1px solid var(--border-primary,#e2e8f0);
    border-left:4px solid #e2e8f0; padding:20px;
    display:flex; flex-direction:column; gap:12px;
  }

  /* ── Empty state ── */
  .ro-empty {
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:60px 20px;
    border:2px dashed var(--border-primary,#e2e8f0);
    border-radius:14px; text-align:center;
  }
  .ro-empty-icon  { font-size:48px; margin-bottom:12px; opacity:.55; }
  .ro-empty-title { font-size:17px; font-weight:700; color:var(--text-primary,#1e293b); margin:0 0 6px; }
  .ro-empty-sub   { font-size:13px; color:var(--text-secondary,#94a3b8); margin:0 0 16px; }

  /* ── Modal ── */
  .ro-modal-overlay {
    position:fixed; inset:0; background:rgba(15,23,42,.55);
    backdrop-filter: blur(4px);
    display:flex; align-items:center; justify-content:center;
    padding:16px; z-index:1000;
    animation: ro-fade-in .2s ease;
  }
  @keyframes ro-fade-in {
    from { opacity:0; }
    to { opacity:1; }
  }
  .ro-modal {
    width:100%; max-width:760px; border-radius:14px;
    background:var(--bg-card,#fff);
    border:1px solid var(--border-primary,#e2e8f0);
    padding:20px; max-height:90vh; overflow-y:auto;
    animation: ro-modal-slide-up .3s ease;
    box-shadow: 0 20px 60px rgba(0,0,0,.25);
  }
  @keyframes ro-modal-slide-up {
    from { opacity:0; transform:translateY(20px) scale(.96); }
    to { opacity:1; transform:translateY(0) scale(1); }
  }
  .ro-modal-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .ro-modal-title { margin:0; font-size:16px; font-weight:800; color:var(--text-primary,#1e293b); }
  .ro-form-grid { display:grid; gap:10px; }
  .ro-form-2col { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .ro-form-4col { display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:8px; align-items:center; }
  .ro-form-label { font-size:12px; font-weight:700; color:var(--text-primary,#1e293b); margin-top:4px; }
  .ro-input {
    width:100%; padding:10px 12px; border-radius:10px;
    border:1.5px solid var(--border-primary,#e2e8f0);
    outline:none; background:var(--bg-surface,#fff);
    font-size:13px; color:var(--text-primary,#1e293b);
    box-sizing:border-box; transition:border-color .2s ease;
    font-family:inherit;
  }
  .ro-input:focus { border-color:#4f46e5; }
  .ro-modal-footer { display:flex; justify-content:flex-end; gap:8px; margin-top:6px; }

  /* ── Delete Confirmation Modal ── */
  .ro-delete-modal {
    width:100%; max-width:420px; border-radius:16px;
    background:linear-gradient(145deg, var(--bg-card,#fff), #f8fafc);
    border:1px solid var(--border-primary,#e2e8f0);
    padding:32px 28px; animation: ro-modal-slide-up .35s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 25px 80px rgba(0,0,0,.28), 0 8px 24px rgba(220,38,38,.12);
  }
  .ro-delete-icon {
    width:64px; height:64px; border-radius:50%;
    background:linear-gradient(135deg,#fee2e2,#fecaca);
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 20px; color:#dc2626;
    animation: ro-delete-icon-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 4px 16px rgba(220,38,38,.2);
  }
  @keyframes ro-delete-icon-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .ro-delete-icon svg {
    filter: drop-shadow(0 2px 4px rgba(220,38,38,.2));
  }
  .ro-delete-title {
    font-size:20px; font-weight:800; color:var(--text-primary,#1e293b);
    text-align:center; margin:0 0 10px;
    letter-spacing: -0.02em;
  }
  .ro-delete-msg {
    font-size:14px; color:var(--text-secondary,#64748b);
    text-align:center; margin:0 0 28px; line-height:1.6;
    padding: 0 12px;
  }
  .ro-delete-actions {
    display:flex; gap:12px;
  }
  .ro-delete-actions button { flex:1; padding:12px 20px; font-size:14px; }
  .ro-delete-actions .ro-btn--danger {
    background: linear-gradient(135deg,#dc2626,#ef4444);
    color: #fff;
    border: none;
    box-shadow: 0 4px 14px rgba(220,38,38,.35);
    transition: all 0.2s ease;
  }
  .ro-delete-actions .ro-btn--danger:hover:not(:disabled) {
    background: linear-gradient(135deg,#b91c1c,#dc2626);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(220,38,38,.45);
  }
  .ro-delete-actions .ro-btn--secondary {
    border: 1.5px solid var(--border-primary,#e2e8f0);
    background: var(--bg-surface,#fff);
    transition: all 0.2s ease;
  }
  .ro-delete-actions .ro-btn--secondary:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
    background: rgba(79,70,229,.04);
  }

  /* ── Send Bill Modal ── */
  .ro-bill-modal {
    width:100%; max-width:480px; border-radius:14px;
    background:var(--bg-card,#fff);
    border:1px solid var(--border-primary,#e2e8f0);
    padding:24px; animation: ro-modal-slide-up .3s ease;
    box-shadow: 0 20px 60px rgba(0,0,0,.25);
  }
  .ro-bill-methods {
    display:grid; gap:10px; margin-bottom:16px;
  }
  .ro-method-btn {
    display:flex; align-items:center; gap:12px;
    padding:14px 16px; border-radius:10px;
    border:2px solid var(--border-primary,#e2e8f0);
    background:var(--bg-surface,#fff);
    cursor:pointer; transition:all .2s ease;
    font-family:inherit; font-size:14px; font-weight:600;
    color:var(--text-primary,#1e293b);
  }
  .ro-method-btn:hover {
    border-color:#4f46e5;
    background:rgba(79,70,229,.04);
  }
  .ro-method-btn--selected {
    border-color:#4f46e5;
    background:rgba(79,70,229,.08);
    color:#4f46e5;
  }
  .ro-method-icon {
    width:36px; height:36px; border-radius:8px;
    display:flex; align-items:center; justify-content:center;
    background:rgba(79,70,229,.10); color:#4f46e5;
  }
  .ro-method-info { flex:1; text-align:left; }
  .ro-method-label { display:block; font-weight:700; margin-bottom:2px; }
  .ro-method-desc { display:block; font-size:12px; color:var(--text-secondary,#94a3b8); font-weight:400; }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .ro-wrap { padding:12px; }
    .ro-toolbar { flex-direction:column; }
    .ro-search-wrap { min-width:100%; width:100%; }
    .ro-card-ft { flex-direction:column; align-items:flex-start; }
    .ro-card-actions { width:100%; }
    .ro-form-2col { grid-template-columns:1fr; }
    .ro-form-4col { grid-template-columns:1fr 1fr; }
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
const getTimeAgo = (dateString) => {
  if (!dateString) return null;
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const isOldOrder = (dateString) => {
  if (!dateString) return false;
  return Date.now() - new Date(dateString).getTime() > 30 * 60 * 1000;
};

/* ─────────────────────────────────────────────────────────────────
   Count-up hook
───────────────────────────────────────────────────────────────── */
const useCountUp = (target, duration = 700) => {
  const [count, setCount] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.round(from + (target - from) * p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
};

/* ─────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────── */
const StatCard = ({ label, variant, value, trend, trendUp, showPulse }) => {
  const animated = useCountUp(value);
  return (
    <div className={`ro-stat ro-stat--${variant}`}>
      <div className="ro-stat-hd">
        <span>{label}</span>
        <span className={`ro-stat-ico ro-stat-ico--${variant}`}>
          {variant === 'delivered' ? <CheckCircle2 size={14} /> :
           variant === 'preparing' ? <Loader2 size={14} /> :
           <Clock3 size={14} />}
        </span>
      </div>
      <div className="ro-stat-val">{animated}</div>
      <div className={`ro-stat-trend ro-stat-trend--${trendUp ? 'up' : 'flat'}`}>
        {trendUp ? <TrendingUp size={11} /> : '→'}
        <span>{trend}</span>
        {showPulse && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, marginLeft:4 }}>
            <span className="ro-live-dot" />
            <span style={{ fontSize:10, color:'var(--order-preparing)', fontWeight:700 }}>LIVE</span>
          </span>
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span className={`ro-badge ro-badge--${status || 'pending'}`}>{status}</span>
);

const SkeletonCard = () => (
  <div className="ro-skel-card">
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
        <div className="ro-skel" style={{ width:'32%', height:16 }} />
        <div className="ro-skel" style={{ width:'52%', height:12 }} />
      </div>
      <div className="ro-skel" style={{ width:72, height:22, borderRadius:8 }} />
    </div>
    <div style={{ height:1, background:'var(--border-primary,#e2e8f0)', margin:'0 -20px' }} />
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div className="ro-skel" style={{ width:'78%', height:12 }} />
      <div className="ro-skel" style={{ width:'55%', height:12 }} />
    </div>
    <div style={{ height:1, background:'var(--border-primary,#e2e8f0)', margin:'0 -20px' }} />
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div className="ro-skel" style={{ width:60, height:16 }} />
      <div style={{ display:'flex', gap:6 }}>
        {[62,52,58].map((w,i) => (
          <div key={i} className="ro-skel" style={{ width:w, height:28, borderRadius:8 }} />
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = ({ statusFilter, searchInput, onClear }) => {
  const isSearch = !!searchInput;
  const icon  = isSearch ? '🔍' : statusFilter === 'delivered' ? '✅' : statusFilter === 'cancelled' ? '🚫' : '🍽️';
  const title = isSearch
    ? `No orders match "${searchInput}"`
    : statusFilter !== 'all'
    ? `No ${statusFilter} orders`
    : 'No orders found';
  const sub = isSearch
    ? 'Try a different search term'
    : 'Try changing or clearing the active filters';
  return (
    <div className="ro-empty">
      <div className="ro-empty-icon">{icon}</div>
      <h3 className="ro-empty-title">{title}</h3>
      <p className="ro-empty-sub">{sub}</p>
      <button onClick={onClear} className="ro-btn ro-btn--primary"
        style={{ fontSize:13, padding:'8px 18px' }}>
        Clear Filters
      </button>
    </div>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="ro-modal-overlay" onClick={onClose}>
    <div className="ro-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ro-modal-hd">
        <h3 className="ro-modal-title">{title}</h3>
        <button onClick={onClose} className="ro-btn ro-btn--icon-only">
          <XCircle size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const OrderCard = ({
  order: o, expanded, animDelay, isNewArrival,
  onToggleExpand, onStatusUpdate, onEdit, onSendBill, onDeleteClick, isUpdating,
}) => {
  const PREVIEW = 2;
  const timeAgo  = getTimeAgo(o.createdAt);
  const tooOld   = isOldOrder(o.createdAt);
  const hasMore  = (o.items?.length || 0) > PREVIEW;
  const visible  = expanded ? o.items : o.items?.slice(0, PREVIEW);

  const location = o.orderType === 'roomService'
    ? `Room ${o.roomNumber || 'N/A'}`
    : o.orderType === 'dineIn'
    ? `Table ${o.tableNumber || 'N/A'}`
    : 'Takeaway';
  const locIcon  = o.orderType === 'roomService' ? '📍' : o.orderType === 'dineIn' ? '🍽️' : '🛍️';

  const advanceMap = {
    pending:   { label: '▶ Start Preparing', cls: 'ro-btn--start-prep', next: 'preparing' },
    confirmed: { label: '▶ Start Preparing', cls: 'ro-btn--start-prep', next: 'preparing' },
    preparing: { label: '✓ Mark Ready',      cls: 'ro-btn--mark-ready', next: 'ready'     },
    ready:     { label: '✓ Mark Delivered',  cls: 'ro-btn--mark-del',   next: 'delivered' },
  };
  const advance = advanceMap[o.status];
  const isPaid  = o.paymentStatus === 'paid' || o.status === 'delivered';

  return (
    <div
      className={`ro-card ro-card--${o.status}${isNewArrival ? ' ro-card--new-arrival' : ''}`}
      style={{ animationDelay: animDelay }}
    >
      {/* Header */}
      <div className="ro-card-hd">
        <div>
          <div className="ro-card-num">Order #{o.orderNumber}</div>
          <div className="ro-card-loc">
            <span>{locIcon}</span>
            <span>{location}</span>
            {o.customerName && (
              <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                ·&nbsp;<User size={11} style={{ opacity:.6 }} /> {o.customerName}
              </span>
            )}
          </div>
          {o.priority === 'high' && (
            <span style={{
              fontSize:11, fontWeight:700, color:'#b91c1c',
              background:'#fee2e2', padding:'2px 7px', borderRadius:6,
              marginTop:4, display:'inline-block',
            }}>🔥 HIGH PRIORITY</span>
          )}
        </div>
        <div className="ro-card-hd-r">
          <StatusBadge status={o.status} />
          {timeAgo && (
            <span className={`ro-card-time${tooOld ? ' ro-card-time--old' : ''}`}>
              {tooOld ? '⚠ ' : ''}{timeAgo}
            </span>
          )}
        </div>
      </div>

      <div className="ro-divider" />

      {/* Items */}
      <div className="ro-items">
        {visible?.map((it, idx) => (
          <div key={idx} className="ro-item-row">
            <span className="ro-item-name">{it.quantity}× {it.name}</span>
            {it.price > 0 && (
              <span style={{ fontWeight:600, color:'var(--text-primary,#1e293b)' }}>
                ₹{Number(it.price * it.quantity).toLocaleString()}
              </span>
            )}
          </div>
        ))}
        {hasMore && (
          <button className="ro-expand-btn" onClick={onToggleExpand}>
            {expanded
              ? <><ChevronUp size={13} /> Show less</>
              : <><ChevronDown size={13} /> +{o.items.length - PREVIEW} more items</>}
          </button>
        )}
      </div>

      <div className="ro-divider" />

      {/* Footer */}
      <div className="ro-card-ft">
        <div className="ro-total-wrap">
          <span className="ro-total">₹{Number(o.totalPrice || 0).toLocaleString()}</span>
          <span className={`ro-pay-badge ro-pay-badge--${isPaid ? 'paid' : 'unpaid'}`}>
            {isPaid ? '✓ Paid' : 'Unpaid'}
          </span>
        </div>
        <div className="ro-card-actions">
          {/* Receptionists can only VIEW orders, not change status */}
          {/* Status changes are handled by waiters and chiefs only */}
          <button className="ro-btn ro-btn--secondary ro-btn--sm" onClick={() => onEdit(o)}>
            <Pencil size={12} /> Edit
          </button>
          <button className="ro-btn ro-btn--secondary ro-btn--sm" onClick={() => onSendBill(o)}>
            <Send size={12} /> Bill
          </button>
          <button className="ro-btn ro-btn--danger ro-btn--sm" onClick={() => onDeleteClick(o)}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────── */
const ReceptionOrdersView = () => {
  /* ── Existing state (unchanged) ── */
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [menuItems, setMenuItems] = useState([]);

  const [newOrder, setNewOrder] = useState({
    orderType: 'roomService',
    roomNumber: '',
    tableNumber: '',
    customerName: '',
    customerPhone: '',
    notes: '',
    priority: 'normal',
    items: [{ ...EMPTY_ITEM }],
  });

  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    priority: 'normal',
    notes: '',
  });

  /* ── New UI state ── */
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [sortOrder, setSortOrder] = useState('newest');
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [newArrivalIds, setNewArrivalIds] = useState(new Set());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { orderId, orderNumber }
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);

  const debounceRef    = useRef(null);
  const prevIdsRef     = useRef(new Set());

  /* ── Socket.io for real-time updates ── */
  const { subscribe } = useSocket();

  /* ── Staff auth for hotel info ── */
  const { staffUser } = useStaffAuth();

  /* ── Existing memos / callbacks (unchanged) ── */
  const hotelId = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('activeProperty');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      return parsed?._id || null;
    } catch {
      return null;
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!hotelId) {
      setError('No active hotel property found for your account.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await getOrders({
        hotelId,
        status: statusFilter,
        orderType: typeFilter,
        search,
        limit: 150,
      });
      setOrders(res.orders || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hotelId, search, statusFilter, typeFilter]);

  const loadMenu = useCallback(async () => {
    if (!hotelId) return;
    try {
      const res = await getMenuItems(hotelId, '', 'all');
      setMenuItems(res.menuItems || []);
    } catch {
      setMenuItems([]);
    }
  }, [hotelId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadMenu();   }, [loadMenu]);

  /* ── Socket.io real-time subscriptions ── */
  useEffect(() => {
    if (!subscribe || !hotelId) return;

    // Refresh orders silently (without loading state)
    const silentRefresh = async () => {
      try {
        const res = await getOrders({
          hotelId,
          status: statusFilter,
          orderType: typeFilter,
          search,
          limit: 150,
        });
        setOrders(res.orders || []);
      } catch (err) {
        console.error('Silent refresh failed:', err);
      }
    };

    // Refresh orders when status changes (waiter/chief updates status)
    const unsubscribeStatusUpdate = subscribe('order-status-updated', (data) => {
      console.log('📡 Order status updated:', data);
      // Silently refresh orders without showing loading state
      silentRefresh();
      
      // Show toast notification for status changes
      if (data.orderNumber && data.status) {
        toast.info(`Order #${data.orderNumber} is now ${data.status}`, {
          position: 'top-right',
          autoClose: 3000,
          style: { 
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
            color: '#fff', 
            fontWeight: 600 
          },
        });
      }
    });

    // Refresh orders when new order arrives
    const unsubscribeNewOrder = subscribe('new-order', (data) => {
      console.log('📡 New order received:', data);
      // Silently refresh orders
      silentRefresh();
      
      // Show toast notification for new orders
      if (data.order?.orderNumber) {
        toast.success(`New order #${data.order.orderNumber} received!`, {
          position: 'top-right',
          autoClose: 3000,
          style: { 
            background: 'linear-gradient(135deg, #059669, #10b981)', 
            color: '#fff', 
            fontWeight: 600 
          },
        });
      }
    });

    // Refresh orders when order details are updated (price, items, etc.)
    const unsubscribeOrderUpdate = subscribe('order-updated', (data) => {
      console.log('📡 Order updated:', data);
      // Silently refresh orders
      silentRefresh();
      
      // Show toast notification for order updates
      if (data.orderNumber) {
        toast.info(`Order #${data.orderNumber} was updated`, {
          position: 'top-right',
          autoClose: 3000,
          style: { 
            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', 
            color: '#fff', 
            fontWeight: 600 
          },
        });
      }
    });

    // Refresh orders when bill is sent
    const unsubscribeBill = subscribe('bill-sent', (data) => {
      console.log('📡 Bill sent:', data);
      silentRefresh();
      
      if (data.orderNumber) {
        toast.success(`📄 Bill sent for Order #${data.orderNumber}. Guest will make payment.`, {
          position: 'top-right',
          autoClose: 3000,
          style: { 
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
            color: '#fff', 
            fontWeight: 600 
          },
        });
      }
    });

    return () => {
      unsubscribeStatusUpdate();
      unsubscribeNewOrder();
      unsubscribeOrderUpdate();
      unsubscribeBill();
    };
  }, [subscribe, hotelId, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    const total     = orders.length;
    const pending   = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    return { total, pending, preparing, delivered };
  }, [orders]);

  const resetCreateForm = () => {
    setNewOrder({
      orderType: 'roomService', roomNumber: '', tableNumber: '',
      customerName: '', customerPhone: '', notes: '', priority: 'normal',
      items: [{ ...EMPTY_ITEM }],
    });
  };

  const handleCreateOrder = async () => {
    if (!hotelId) return;
    const hasItems = newOrder.items.some(i => i.name && Number(i.quantity) > 0 && Number(i.price) >= 0);
    if (!hasItems) {
      toast.error('Add at least one valid item before creating an order.', {
        position: 'top-right',
        autoClose: 4000,
        style: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontWeight: 600 },
      });
      return;
    }
    if (newOrder.orderType === 'roomService' && !newOrder.roomNumber.trim()) {
      toast.error('Room number is required for room service.', {
        position: 'top-right',
        autoClose: 4000,
        style: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontWeight: 600 },
      });
      return;
    }
    if (newOrder.orderType === 'dineIn' && !newOrder.tableNumber.trim()) {
      toast.error('Table number is required for dine-in orders.', {
        position: 'top-right',
        autoClose: 4000,
        style: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontWeight: 600 },
      });
      return;
    }
    setSubmitting(true); setError('');
    try {
      await createOrder({
        hotelId,
        orderType: newOrder.orderType,
        roomNumber:    newOrder.orderType === 'roomService' ? newOrder.roomNumber    : undefined,
        tableNumber:   newOrder.orderType === 'dineIn'      ? newOrder.tableNumber   : undefined,
        customerName:  newOrder.customerName  || undefined,
        customerPhone: newOrder.customerPhone || undefined,
        notes:    newOrder.notes,
        priority: newOrder.priority,
        items: newOrder.items
          .filter(i => i.name && Number(i.quantity) > 0)
          .map(i => ({ name: i.name, quantity: Number(i.quantity), price: Number(i.price) })),
      });
      setShowCreate(false);
      resetCreateForm();
      await loadOrders();
      toast.success('Order created successfully!', {
        position: 'top-right',
        autoClose: 3000,
        style: { background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 600 },
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to create order.';
      setError(msg);
      toast.error(msg, {
        position: 'top-right',
        autoClose: 4000,
        style: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontWeight: 600 },
      });
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      await loadOrders();
      const statusLabels = {
        preparing: 'Preparing',
        ready: 'Ready',
        delivered: 'Delivered',
      };
      toast.success(`Order marked as ${statusLabels[status] || status}!`, {
        position: 'top-right',
        autoClose: 3000,
        style: { background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 600 },
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update order status.';
      setError(msg);
      toast.error(msg, {
        position: 'top-right',
        autoClose: 4000,
        style: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontWeight: 600 },
      });
    } finally { setUpdatingId(null); }
  };

  const handleOpenEdit = (order) => {
    setSelectedOrder(order);
    setEditForm({
      customerName:  order.customerName  || '',
      customerPhone: order.customerPhone || '',
      priority: order.priority || 'normal',
      notes:    order.notes    || '',
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await updateOrder(selectedOrder._id, editForm);
      setShowEdit(false); setSelectedOrder(null);
      await loadOrders();
      toast.success('Order updated successfully!', {
        position: 'top-right',
        autoClose: 3000,
        style: { background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 600 },
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update order details.';
      setError(msg);
      toast.error(msg, {
        position: 'top-right',
        autoClose: 4000,
        style: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontWeight: 600 },
      });
    } finally { setSubmitting(false); }
  };

  const handleDeleteClick = (order) => {
    setDeleteConfirm({ orderId: order._id, orderNumber: order.orderNumber });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteOrder(deleteConfirm.orderId);
      setDeleteConfirm(null);
      await loadOrders();
      toast.success('Order deleted successfully!', {
        position: 'top-right',
        autoClose: 3000,
        style: { background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 600 },
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete order.';
      setError(msg);
      toast.error(msg, {
        position: 'top-right',
        autoClose: 4000,
        style: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontWeight: 600 },
      });
      setDeleteConfirm(null);
    }
  };

  const handleSendBillClick = (order) => {
    setSelectedBillOrder(order);
    setShowBillModal(true);
  };

  const handleSendBill = async (orderId, billData) => {
    try {
      const response = await sendOrderBill(orderId, billData);
      if (response.success) {
        await loadOrders();
        return response;
      }
    } catch (error) {
      console.error('Send bill error:', error);
      throw error;
    }
  };

  const addItem    = () => setNewOrder(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx) => setNewOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, key, value) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)),
    }));
  };

  /* ── New handlers ── */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setLastRefreshed(Date.now());
    setSecondsAgo(0);
    setIsRefreshing(false);
  };

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const handleClearSearch = () => {
    clearTimeout(debounceRef.current);
    setSearchInput(''); setSearch('');
  };

  const handleClearFilters = () => {
    clearTimeout(debounceRef.current);
    setStatusFilter('all'); setTypeFilter('all');
    setSearchInput(''); setSearch('');
  };

  const toggleExpand = (id) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* ── Track new-arrival orders ── */
  useEffect(() => {
    const currentIds = new Set(orders.map(o => o._id));
    if (prevIdsRef.current.size > 0) {
      const incoming = new Set([...currentIds].filter(id => !prevIdsRef.current.has(id)));
      if (incoming.size > 0) {
        setNewArrivalIds(incoming);
        setTimeout(() => setNewArrivalIds(new Set()), 2000);
      }
    }
    prevIdsRef.current = currentIds;
  }, [orders]);

  /* ── Seconds-since-refresh counter ── */
  useEffect(() => {
    const id = setInterval(() =>
      setSecondsAgo(Math.floor((Date.now() - lastRefreshed) / 1000)), 1000
    );
    return () => clearInterval(id);
  }, [lastRefreshed]);

  /* ── Keyboard shortcut: / to focus search ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.target.closest('input,textarea,select')) {
        e.preventDefault();
        document.getElementById('ro-search')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  /* ── Computed ── */
  const statusCounts = useMemo(() => ({
    all:       orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready:     orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }), [orders]);

  const sortedOrders = useMemo(() => {
    const arr = [...orders];
    switch (sortOrder) {
      case 'oldest':      return arr.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'amount-high': return arr.sort((a,b) => (b.totalPrice||0) - (a.totalPrice||0));
      case 'amount-low':  return arr.sort((a,b) => (a.totalPrice||0) - (b.totalPrice||0));
      default:            return arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [orders, sortOrder]);

  const lastUpdText = secondsAgo < 5
    ? 'Just now'
    : secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo/60)}m ago`;

  const STATUS_TABS = [
    { key:'all',       label:'All'       },
    { key:'pending',   label:'Pending'   },
    { key:'preparing', label:'Preparing' },
    { key:'ready',     label:'Ready'     },
    { key:'delivered', label:'Delivered' },
    { key:'cancelled', label:'Cancelled' },
  ];

  const TYPE_TABS = [
    { key:'all',         label:'All Types'    },
    { key:'roomService', label:'Room Service' },
    { key:'dineIn',      label:'Table Order'  },
    { key:'takeaway',    label:'Takeaway'     },
  ];

  /* ── Render ── */
  return (
    <>
      <style>{ORDERS_CSS}</style>
      <div className="ro-wrap">

        {/* Error banner */}
        {!!error && (
          <div className="ro-error">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ro-btn ro-btn--secondary ro-btn--sm"
            >Dismiss</button>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="ro-stat-grid">
          <StatCard
            label="Total" variant="total" value={stats.total}
            trend="All orders today" trendUp />
          <StatCard
            label="Pending" variant="pending" value={stats.pending}
            trend={stats.pending > 0 ? 'Needs attention' : 'All clear'}
            trendUp={stats.pending === 0} />
          <StatCard
            label="Preparing" variant="preparing" value={stats.preparing}
            trend="In kitchen" trendUp
            showPulse={stats.preparing > 0} />
          <StatCard
            label="Delivered" variant="delivered" value={stats.delivered}
            trend="Completed today" trendUp />
        </div>

        {/* ── Smart search ── */}
        <div className="ro-toolbar">
          <div className="ro-search-wrap">
            <div className="ro-search-bar">
              <Search size={16} style={{ color:'var(--text-secondary,#94a3b8)', flexShrink:0 }} />
              <input
                id="ro-search"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by customer / location / order #"
                autoComplete="off"
              />
              {searchInput && (
                <button className="ro-search-clear" onClick={handleClearSearch}>
                  <X size={11} />
                </button>
              )}
              <span className="ro-kbd">/</span>
            </div>
            {searchInput && !loading && (
              <div className="ro-search-count">
                {sortedOrders.length} result{sortedOrders.length !== 1 ? 's' : ''} for &ldquo;{searchInput}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* ── Filter pill tabs ── */}
        <div className="ro-filters">
          {/* Status row */}
          <div className="ro-filter-row-wrap">
            <div className="ro-filter-row">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`ro-pill${statusFilter === tab.key ? ` ro-pill--active ro-pill--${tab.key}` : ''}`}
                >
                  {tab.label}
                  <span className="ro-pill-badge">{statusCounts[tab.key] ?? 0}</span>
                </button>
              ))}
            </div>
            <span className="ro-live">
              <span className="ro-live-blink" /> Live
            </span>
          </div>
          {/* Type row */}
          <div className="ro-filter-row">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`ro-pill ro-pill--sm${typeFilter === tab.key ? ' ro-pill--active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="ro-action-bar">
          <button
            onClick={handleRefresh}
            className="ro-btn ro-btn--secondary"
            disabled={isRefreshing || loading}
          >
            <RefreshCcw size={14} className={isRefreshing || loading ? 'ro-spin' : ''} />
            Refresh
          </button>
          <span className="ro-last-upd">Updated {lastUpdText}</span>

          <button
            onClick={() => setShowCreate(true)}
            className="ro-btn ro-btn--primary ro-btn--pulse"
          >
            <Plus size={15} /> New Order
          </button>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="ro-sort-sel"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount: High → Low</option>
            <option value="amount-low">Amount: Low → High</option>
          </select>
        </div>

        {/* ── Orders list ── */}
        {loading ? (
          <div className="ro-cards">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : sortedOrders.length === 0 ? (
          <EmptyState
            statusFilter={statusFilter}
            searchInput={searchInput}
            onClear={handleClearFilters}
          />
        ) : (
          <div className="ro-cards">
            {sortedOrders.map((o, idx) => (
              <OrderCard
                key={o._id}
                order={o}
                expanded={expandedCards.has(o._id)}
                animDelay={newArrivalIds.has(o._id) ? '0ms' : `${Math.min(idx * 50, 400)}ms`}
                isNewArrival={newArrivalIds.has(o._id)}
                onToggleExpand={() => toggleExpand(o._id)}
                onStatusUpdate={handleStatusUpdate}
                onEdit={handleOpenEdit}
                onSendBill={handleSendBillClick}
                onDeleteClick={handleDeleteClick}
                isUpdating={updatingId === o._id}
              />
            ))}
          </div>
        )}

        {/* ── Create Order Modal ── */}
        {showCreate && (
          <Modal
            title="Create New Order"
            onClose={() => { setShowCreate(false); resetCreateForm(); }}
          >
            <div className="ro-form-grid">
              <div className="ro-form-2col">
                <select
                  value={newOrder.orderType}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, orderType: e.target.value }))}
                  className="ro-input"
                >
                  <option value="roomService">Room Service</option>
                  <option value="dineIn">Dine In</option>
                  <option value="takeaway">Takeaway</option>
                </select>
                <select
                  value={newOrder.priority}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, priority: e.target.value }))}
                  className="ro-input"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              {newOrder.orderType === 'roomService' && (
                <input
                  className="ro-input" placeholder="Room Number"
                  value={newOrder.roomNumber}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, roomNumber: e.target.value }))}
                />
              )}
              {newOrder.orderType === 'dineIn' && (
                <input
                  className="ro-input" placeholder="Table Number"
                  value={newOrder.tableNumber}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, tableNumber: e.target.value }))}
                />
              )}

              <input
                className="ro-input" placeholder="Customer Name (optional)"
                value={newOrder.customerName}
                onChange={(e) => setNewOrder(prev => ({ ...prev, customerName: e.target.value }))}
              />
              <input
                className="ro-input" placeholder="Customer Phone (optional)"
                value={newOrder.customerPhone}
                onChange={(e) => setNewOrder(prev => ({ ...prev, customerPhone: e.target.value }))}
              />

              <div className="ro-form-label">Items</div>
              {newOrder.items.map((it, idx) => (
                <div key={idx} className="ro-form-4col">
                  <input
                    list="menu-items-list" className="ro-input"
                    placeholder="Item name" value={it.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  />
                  <input
                    type="number" min="1" className="ro-input"
                    placeholder="Qty" value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  />
                  <input
                    type="number" min="0" className="ro-input"
                    placeholder="Price" value={it.price}
                    onChange={(e) => updateItem(idx, 'price', e.target.value)}
                  />
                  <button onClick={() => removeItem(idx)} className="ro-btn ro-btn--icon-only">
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
              <datalist id="menu-items-list">
                {menuItems.map(m => <option key={m._id} value={m.name} />)}
              </datalist>

              <button onClick={addItem} className="ro-btn ro-btn--secondary">
                <Plus size={14} /> Add Item
              </button>
              <textarea
                className="ro-input" placeholder="Notes"
                value={newOrder.notes}
                onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                style={{ minHeight:80, resize:'vertical' }}
              />
              <div className="ro-modal-footer">
                <button
                  onClick={() => { setShowCreate(false); resetCreateForm(); }}
                  className="ro-btn ro-btn--secondary"
                >Cancel</button>
                <button
                  onClick={handleCreateOrder}
                  className="ro-btn ro-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 size={14} className="ro-spin" /> : <Plus size={14} />}
                  Create Order
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── Edit Order Modal ── */}
        {showEdit && selectedOrder && (
          <Modal
            title={`Edit Order #${selectedOrder.orderNumber}`}
            onClose={() => { setShowEdit(false); setSelectedOrder(null); }}
          >
            <div className="ro-form-grid">
              <input
                className="ro-input" placeholder="Customer Name"
                value={editForm.customerName}
                onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
              />
              <input
                className="ro-input" placeholder="Customer Phone"
                value={editForm.customerPhone}
                onChange={(e) => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))}
              />
              <select
                className="ro-input" value={editForm.priority}
                onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
              </select>
              <textarea
                className="ro-input" placeholder="Notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                style={{ minHeight:100, resize:'vertical' }}
              />
              <div className="ro-modal-footer">
                <button
                  onClick={() => { setShowEdit(false); setSelectedOrder(null); }}
                  className="ro-btn ro-btn--secondary"
                >Cancel</button>
                <button
                  onClick={handleSaveEdit}
                  className="ro-btn ro-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 size={14} className="ro-spin" /> : <CheckCircle2 size={14} />}
                  Save Changes
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── Delete Confirmation Modal ── */}
        {deleteConfirm && (
          <div className="ro-modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="ro-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ro-delete-icon">
                <AlertTriangle size={28} />
              </div>
              <h3 className="ro-delete-title">Delete Order #{deleteConfirm.orderNumber}?</h3>
              <p className="ro-delete-msg">
                This action cannot be undone. The order will be permanently removed from the system.
              </p>
              <div className="ro-delete-actions">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="ro-btn ro-btn--secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="ro-btn ro-btn--danger"
                >
                  <Trash2 size={14} /> Delete Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bill Preview Modal ── */}
        {showBillModal && selectedBillOrder && (
          <BillPreviewModal
            order={selectedBillOrder}
            hotel={{
              name: staffUser?.activeProperty?.name || 'Hotel',
              location: { address: staffUser?.activeProperty?.address || '' },
              contact: { phone: staffUser?.activeProperty?.phone || '' },
            }}
            onClose={() => {
              setShowBillModal(false);
              setSelectedBillOrder(null);
            }}
            onSendBill={handleSendBill}
            isOpen={showBillModal}
          />
        )}

      </div>
    </>
  );
};

export default ReceptionOrdersView;
