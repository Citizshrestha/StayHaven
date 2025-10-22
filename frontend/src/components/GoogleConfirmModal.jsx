import React from "react";

const GoogleConfirmModal = ({
  open,
  onClose,
  onConfirm,
  name,
  email,
  picture,
}) => {
  if (!open) return null;
  
  return (
    <div className="fixed bg-transparent bg-opacity-60 inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="flex flex-col items-center">
          {picture ? (
            <img
              src={picture}
              alt="Google profile"
              className="w-20 h-20 rounded-full mb-4 border-4 border-blue-400 shadow-md"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full mb-4 border-4 border-blue-400 shadow-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div className="w-20 h-20 rounded-full mb-4 border-4 border-blue-400 shadow-md bg-gradient-to-br from-blue-500 to-purple-500 items-center justify-center" style={{display: 'none'}}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Continue with Google?</h2>
          <p className="text-lg text-gray-700 mb-4">You are signing up as:</p>
          <div className="mb-4">
            <span className="block font-semibold text-blue-700 text-lg">{name}</span>
            <span className="block text-gray-500">{email}</span>
          </div>
          <p className="text-gray-600 mb-6">StayHaven will use your Google account to create your profile. Do you want to continue?</p>
          <button
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold px-8 py-2 rounded-lg shadow-md hover:from-blue-600 hover:to-purple-600 transition-colors text-lg mb-2"
            onClick={onConfirm}
          >
            Yes, Continue
          </button>
          <button
            className="text-gray-500 hover:text-gray-700 text-sm underline"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleConfirmModal;
