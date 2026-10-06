import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Printer, X } from 'lucide-react';

const DonationReceipt = ({ donation, onClose, settings }) => {
  const receiptRef = useRef(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generatePDF = async () => {
    const element = receiptRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Donation_Receipt_${donation._id.slice(-6)}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const logoUrl = settings?.logo?.photo || '/logo.png';
  const templeName = settings?.logo?.text?.en || 'Shree Ramchandra Temple';
  const templeAddress = settings?.footer?.contactInfo?.address?.en || 'Battisputali, Gaushala, Kathmandu, Nepal';
  const signature = settings?.signature || '/signature.png';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header Actions */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-serif font-bold text-[#A80808]">Donation Receipt</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all"
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl hover:bg-gray-100 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-8 md:p-12 bg-white" style={{ fontFamily: "'Times New Roman', serif" }}>
          {/* Watermark */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <div className="text-8xl font-bold text-[#A80808] transform -rotate-45">
                {templeName}
              </div>
            </div>

            {/* Header */}
            <div className="text-center border-b-2 border-[#A80808] pb-6 mb-6">
              {/* Logo */}
              <div className="flex items-center justify-center gap-4 mb-3">
                {logoUrl && (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-[#A80808]">{templeName}</h1>
                  <p className="text-sm text-gray-600">{templeAddress}</p>
                  <p className="text-xs text-gray-400 mt-1">Gaushala, Kathmandu, Nepal</p>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mt-2">OFFICIAL DONATION RECEIPT</h2>
              <p className="text-xs text-gray-400">Tax Exempt under Section 88 of Income Tax Act</p>
            </div>

            {/* Receipt Details */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">Receipt No.</p>
                <p className="font-bold text-gray-800">RCT-{String(donation._id).slice(-8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Date</p>
                <p className="font-bold text-gray-800">{formatDate(donation.date)}</p>
              </div>
            </div>

            {/* Donor Details */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Donor Information</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-400">Full Name</p>
                  <p className="font-semibold text-gray-800">{donation.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-semibold text-gray-800">{donation.email}</p>
                </div>
                {donation.phone && (
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-semibold text-gray-800">{donation.phone}</p>
                  </div>
                )}
                {donation.message && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Message</p>
                    <p className="font-semibold text-gray-800 italic">"{donation.message}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Donation Details */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#A80808] text-white">
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2">Donation to {templeName}</td>
                    <td className="px-4 py-2 text-right font-bold">Rs. {donation.amount?.toLocaleString() || 0}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2 text-xs text-gray-400">Payment Method</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-400 capitalize">{donation.paymentMethod || 'Cash'}</td>
                  </tr>
                  {donation.transactionId && (
                    <tr>
                      <td className="px-4 py-2 text-xs text-gray-400">Transaction ID</td>
                      <td className="px-4 py-2 text-right text-xs text-gray-400">{donation.transactionId}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 font-bold text-gray-800">Total Amount</td>
                    <td className="px-4 py-2 text-right font-bold text-[#A80808] text-lg">
                      Rs. {donation.amount?.toLocaleString() || 0}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-[#A80808] pt-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="w-40 h-16 border-b-2 border-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Authorized Signature</p>
                </div>
                <div className="text-center">
                  <div className="w-40 h-16 border-b-2 border-gray-300 mx-auto mb-1">
                    {signature && (
                      <img 
                        src={signature} 
                        alt="Signature" 
                        className="h-full mx-auto object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Temple Committee</p>
                </div>
                <div className="text-center">
                  <div className="w-24 h-16 border-b-2 border-gray-300 mx-auto mb-1">
                    {logoUrl && (
                      <img 
                        src={logoUrl} 
                        alt="Stamp" 
                        className="h-full mx-auto object-contain opacity-60"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Official Stamp</p>
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                This is a system generated receipt. No signature required.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {templeName} • Battisputali, Gaushala, Kathmandu, Nepal
              </p>
              <p className="text-xs text-gray-300 mt-2">
                Generated on: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            .fixed {
              position: relative !important;
              background: white !important;
              padding: 0 !important;
            }
            .sticky {
              position: relative !important;
            }
            .bg-black\\/60 {
              background: white !important;
            }
            .shadow-2xl {
              box-shadow: none !important;
            }
            button {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default DonationReceipt;