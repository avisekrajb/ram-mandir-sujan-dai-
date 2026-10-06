// src/pages/DonateFailure.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { X, AlertCircle, Home, RefreshCw } from 'lucide-react';

const DonateFailure = () => {
  const navigate = useNavigate();
  useLocation();
  const { showToast } = useToast();

  useEffect(() => {
    // Clear pending donation data
    localStorage.removeItem('pendingDonationId');
    localStorage.removeItem('pendingDonationAmount');
    
    // Show error toast
    showToast('Payment was not completed. Please try again.', 'error');
    
    // Prevent form resubmission
    sessionStorage.setItem('paymentFailed', 'true');
  }, [showToast]);

  const handleTryAgain = () => {
    sessionStorage.removeItem('paymentFailed');
    navigate('/donate');
  };

  const handleGoHome = () => {
    sessionStorage.removeItem('paymentFailed');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#ffffff" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <X size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-ink mb-2">Payment Cancelled</h2>
        <p className="text-ink-soft">Your donation was not completed.</p>
        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2 text-left">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              If you were redirected here after a successful payment, please contact support with your transaction details.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleTryAgain}
            className="px-6 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonateFailure;