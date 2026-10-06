import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import OmLoader from '../components/common/OmLoader';
import { Check, X, Heart } from 'lucide-react';

const decodeData = (value) => {
  try {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const raw = typeof Buffer !== 'undefined' ? Buffer.from(normalized, 'base64').toString('utf8') : atob(normalized);
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const clearPending = () => {
  localStorage.removeItem('pendingDonationId');
  localStorage.removeItem('pendingDonationAmount');
  localStorage.removeItem('pendingMethod');
};

const DonateSuccess = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [amount, setAmount] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        const pidx = urlParams.get('pidx');
        const txnid = urlParams.get('TXNID') || urlParams.get('txnid');
        const transactionUuid = urlParams.get('transaction_uuid');
        const donationId = localStorage.getItem('pendingDonationId');
        const pendingAmount = localStorage.getItem('pendingDonationAmount');
        const pendingMethod = localStorage.getItem('pendingMethod') || 'esewa';

        let paymentMethod = pendingMethod;
        if (dataParam) paymentMethod = 'esewa';
        if (pidx) paymentMethod = 'khalti';
        if (txnid) paymentMethod = 'ips';
        if (transactionUuid && paymentMethod !== 'khalti' && paymentMethod !== 'ips') paymentMethod = 'esewa';

        if (!donationId) {
          setStatus('failed');
          showToast('No pending payment found. Please try again.', 'error');
          setLoading(false);
          return;
        }

        let payload = { donationId };
        let displayAmount = pendingAmount;

        if (paymentMethod === 'esewa') {
          if (dataParam) {
            const decoded = decodeData(dataParam);
            payload = { ...payload, data: dataParam };
            if (decoded && !displayAmount) displayAmount = decoded.total_amount;
          } else {
            payload = {
              ...payload,
              transaction_uuid: transactionUuid,
              product_code: urlParams.get('product_code'),
              total_amount: urlParams.get('total_amount'),
              status: urlParams.get('status'),
            };
            if (!displayAmount) displayAmount = urlParams.get('total_amount');
          }
        } else if (paymentMethod === 'khalti') {
          payload = { ...payload, pidx };
          if (!displayAmount) displayAmount = urlParams.get('amount');
        } else if (paymentMethod === 'ips') {
          payload = { ...payload, txnid };
        }

        setAmount(displayAmount || '0');

        const endpoint =
          paymentMethod === 'khalti'
            ? '/payment/khalti/verify'
            : paymentMethod === 'ips'
            ? '/payment/ips/verify'
            : '/payment/esewa/verify';

        const response = await api.post(endpoint, payload);

        if (response.data.success) {
          setStatus('success');
          showToast('Payment successful! Thank you for your donation.', 'success');
          clearPending();
        } else {
          setStatus('failed');
          showToast('Payment verification failed. Please contact support.', 'error');
          clearPending();
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('failed');
        showToast('Payment verification failed. Please contact support.', 'error');
        clearPending();
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [showToast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #FBF8F8 0%, #ffffff 50%, #FBF8F8 100%)" }}>
        <div className="text-center">
          <OmLoader size="lg" color="vermilion" className="mx-auto mb-4" />
          <p className="text-ink-soft">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #FBF8F8 0%, #ffffff 50%, #FBF8F8 100%)" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {status === 'success' ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Check size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-ink mb-2">Payment Successful!</h2>
            <p className="text-ink-soft">Thank you for your generous donation.</p>
            <p className="text-sm text-mute mt-1">
              Amount: NPR {amount || '0'}
            </p>
            <div className="mt-4 p-3 bg-vermilion/5 rounded-lg border border-vermilion/10">
              <p className="text-xs text-mute flex items-center justify-center gap-1">
                <Heart size={14} className="text-vermilion" />
                May Lord Ram bless you with peace and prosperity.
              </p>
            </div>
            <button
              onClick={() => navigate('/donate')}
              className="mt-6 px-6 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
            >
              Back to Donate
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <X size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-ink mb-2">Payment Failed</h2>
            <p className="text-ink-soft">Your payment could not be processed.</p>
            <p className="text-sm text-mute mt-1">Please try again or contact support.</p>
            <button
              onClick={() => navigate('/donate')}
              className="mt-6 px-6 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DonateSuccess;