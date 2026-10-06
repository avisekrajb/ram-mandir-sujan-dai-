// jsPDF >= 4 (the installed version is 4.x) exports a namespace object whose
// callable constructor lives on `.jsPDF`. `require('jspdf')` itself is no longer
// a function, so `new jsPDF(...)` threw "jsPDF is not a constructor" and every
// server-side receipt silently failed to generate. Take `.jsPDF` and fall back
// to `.default` so both old and new shapes work.
const jsPDFModule = require('jspdf');
const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default || jsPDFModule;

const generateReceiptPDF = async (donation, user, options = {}) => {
  // Callers pass the new status vocabulary; keep the original receipt wording as
  // the default so existing callers are unaffected.
  const {
    title = 'OFFICIAL DONATION RECEIPT',
    watermarkText = 'Shree Ramchandra Temple',
    note = 'This is a system generated receipt. No signature required.',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const templeName = 'Shree Ramchandra Temple';
  const templeAddress = 'Battisputali, Gaushala, Kathmandu, Nepal';

  // Add watermark
  doc.setFontSize(60);
  doc.setTextColor(200, 200, 200);
  doc.text(watermarkText, 105, 150, { align: 'center', angle: -45 });

  // Header
  doc.setFontSize(24);
  doc.setTextColor(122, 0, 0);
  doc.text(templeName, 105, 30, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(templeAddress, 105, 38, { align: 'center' });

  doc.setDrawColor(122, 0, 0);
  doc.line(20, 45, 190, 45);

  doc.setFontSize(18);
  doc.setTextColor(50, 50, 50);
  doc.text(title, 105, 55, { align: 'center' });

  // Receipt Details
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Receipt No:', 30, 70);
  doc.setTextColor(50, 50, 50);
  doc.text(`RCT-${donation._id.slice(-8).toUpperCase()}`, 80, 70);

  doc.setTextColor(100, 100, 100);
  doc.text('Date:', 30, 78);
  doc.setTextColor(50, 50, 50);
  doc.text(new Date(donation.date).toLocaleDateString(), 80, 78);

  // Donor Details
  doc.setFillColor(245, 245, 245);
  doc.rect(30, 88, 150, 35, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Donor Information', 35, 96);
  
  doc.setTextColor(50, 50, 50);
  doc.text(`Name: ${donation.name}`, 35, 104);
  doc.text(`Email: ${donation.email}`, 35, 112);
  if (donation.phone) {
    doc.text(`Phone: ${donation.phone}`, 35, 120);
  }

  // Donation Details Table
  let yPos = 135;
  doc.setFillColor(122, 0, 0);
  doc.rect(30, yPos, 150, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Description', 35, yPos + 5.5);
  doc.text('Amount', 160, yPos + 5.5, { align: 'right' });

  yPos += 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(30, yPos, 150, 8, 'F');
  doc.setTextColor(50, 50, 50);
  doc.text(`Donation to ${templeName}`, 35, yPos + 5.5);
  doc.text(`Rs. ${donation.amount?.toLocaleString() || 0}`, 160, yPos + 5.5, { align: 'right' });

  yPos += 8;
  doc.setFillColor(245, 245, 245);
  doc.rect(30, yPos, 150, 8, 'F');
  doc.setTextColor(50, 50, 50);
  doc.text(`Payment Method: ${donation.paymentMethod || 'Cash'}`, 35, yPos + 5.5);

  // Total
  yPos += 12;
  doc.setFillColor(240, 240, 240);
  doc.rect(30, yPos, 150, 10, 'F');
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text('Total Amount:', 35, yPos + 7);
  doc.setTextColor(122, 0, 0);
  doc.setFontSize(14);
  doc.text(`Rs. ${donation.amount?.toLocaleString() || 0}`, 160, yPos + 7, { align: 'right' });

  // Footer
  yPos += 20;
  doc.setDrawColor(122, 0, 0);
  doc.line(30, yPos, 190, yPos);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized Signature', 50, yPos + 15, { align: 'center' });
  doc.text('Temple Committee', 105, yPos + 15, { align: 'center' });
  doc.text('Official Stamp', 160, yPos + 15, { align: 'center' });

  // Bottom text
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(note, 105, yPos + 30, { align: 'center' });
  doc.text(`${templeName} ? Gaushala, Kathmandu, Nepal`, 105, yPos + 37, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPos + 44, { align: 'center' });

  // Return PDF as buffer
  return doc.output('arraybuffer');
};

module.exports = { generateReceiptPDF };