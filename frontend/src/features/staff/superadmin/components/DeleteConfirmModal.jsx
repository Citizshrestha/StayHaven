import React from 'react';
import { createPortal } from 'react-dom';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Warning Icon */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6 bg-gradient-to-br from-rose-50 to-red-50 rounded-t-2xl border-b border-rose-100">
          <div className="relative flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-rose-500 to-red-600 rounded-full shadow-lg animate-pulse">
            <div className="absolute inset-0 bg-rose-500 rounded-full opacity-30 animate-ping" />
            <span className="relative text-white text-4xl material-symbols-outlined select-none">
              warning
            </span>
          </div>
          <h2
            id="delete-modal-title"
            className="text-2xl font-bold text-gray-900 text-center"
          >
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {itemName && (
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-xl">
              <span className="text-rose-600 material-symbols-outlined text-xl">
                label
              </span>
              <span className="font-semibold text-gray-900 truncate">
                {itemName}
              </span>
            </div>
          )}

          <p className="text-gray-700 text-center leading-relaxed">
            {message}
          </p>

          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-amber-600 material-symbols-outlined text-xl flex-shrink-0 mt-0.5">
              info
            </span>
            <p className="text-sm text-amber-900">
              This action is permanent and cannot be undone. Please make sure you want to proceed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 text-gray-700 font-semibold bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 text-white font-semibold bg-gradient-to-r from-rose-500 to-red-600 rounded-xl hover:from-rose-600 hover:to-red-700 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">delete</span>
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;
