import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate as formatLocaleDate } from '../utils/formatDate';
import OmLoader from '../components/common/OmLoader';
import PageHero from '../components/common/PageHero';
import { 
  Calendar, Phone, Tag, FileText, Clock,
  CheckCircle, XCircle, ChevronRight,
  CalendarDays, FileDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MyBookingsPage = () => {
  const { t, lang } = useLanguage();
  useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const contentRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get('/bookings/my');
        setBookings(response.data);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return <CheckCircle size={16} className="text-green-500" />;
      case 'completed': return <CheckCircle size={16} className="text-gray-500" />;
      case 'cancelled': return <XCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-50 border-green-200 text-green-700';
      case 'completed': return 'bg-gray-50 border-gray-200 text-gray-700';
      case 'cancelled': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate watermark canvas
  const generateWatermark = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const text = 'Shree Ramchandra Temple';
    const fontSize = 32;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 4);
    
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(168, 8, 8, 0.06)';
    ctx.fillText(text, 0, 0);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(168, 8, 8, 0.04)';
    ctx.fillText('Official Booking Record', 0, 50);
    
    return canvas.toDataURL('image/png');
  };

  // Generate logo for PDF
  const generateLogo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Background circle
    const gradient = ctx.createRadialGradient(100, 100, 0, 100, 100, 100);
    gradient.addColorStop(0, '#8B0000');
    gradient.addColorStop(1, '#4A0000');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.fill();
    
    // Temple icon (simplified)
    ctx.fillStyle = '#FFD700';
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛕', 100, 95);
    
    // Text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Shree Ramchandra', 100, 150);
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Temple', 100, 172);
    
    return canvas.toDataURL('image/png');
  };

  // Create modern booking card for PDF
  const createBookingCardHTML = (booking, index) => {
    // Booking text goes into an HTML template for the PDF: escape it so it can never become markup.
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const statusColor = booking.status === 'confirmed' ? '#22c55e' : 
                        booking.status === 'completed' ? '#3b82f6' : 
                        booking.status === 'cancelled' ? '#ef4444' : '#eab308';
    
    const statusBg = booking.status === 'confirmed' ? '#dcfce7' : 
                     booking.status === 'completed' ? '#dbeafe' : 
                     booking.status === 'cancelled' ? '#fee2e2' : '#fef9c3';
    
    return `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        position: relative;
        z-index: 2;
      ">
        <!-- Status Bar -->
        <div style="
          height: 4px;
          background: ${statusColor};
          border-radius: 4px;
          margin: -20px -20px 16px -20px;
        " />
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            background: ${statusBg};
            color: ${statusColor};
            border: 1px solid ${statusColor}40;
          ">
            <span>●</span>
            ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </div>
          <span style="
            font-size: 10px;
            color: #9ca3af;
            font-family: monospace;
          ">
            #${booking._id.slice(-8)}
          </span>
        </div>

        <div style="margin-bottom: 10px;">
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 500;
            color: #A80808;
            background: #7A000010;
            padding: 4px 12px;
            border-radius: 20px;
          ">
            🏷️ ${esc(booking.type)}
          </span>
        </div>

        <h3 style="
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        ">
          ${esc(booking.name)}
        </h3>

        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        ">
          <span>📱</span>
          <span>${esc(booking.phone)}</span>
        </div>

        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;
          margin-top: 2px;
        ">
          <span>📅</span>
          <span>${booking.date}</span>
        </div>

        ${booking.description ? `
          <div style="
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #f3f4f6;
          ">
            <div style="
              display: flex;
              align-items: flex-start;
              gap: 6px;
              font-size: 12px;
              color: #6b7280;
            ">
              <span>📝</span>
              <span style="flex: 1;">${esc(booking.description)}</span>
            </div>
          </div>
        ` : ''}

        <div style="
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
          font-size: 10px;
          color: #9ca3af;
        ">
          Booked: ${formatDate(booking.createdAt)}
        </div>
      </div>
    `;
  };

  // Download latest 2 bookings as PDF
  const downloadPDF = async () => {
    if (bookings.length === 0) return;
    
    setIsDownloading(true);
    try {
      // Get latest 2 bookings (most recent first)
      const latestBookings = [...bookings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2);
      
      // Create PDF container
      const container = document.createElement('div');
      container.style.width = '600px';
      container.style.background = '#ffffff';
      container.style.padding = '40px';
      container.style.fontFamily = 'Arial, sans-serif';
      
      // Logo and Header
      const logoImg = generateLogo();
      
      container.innerHTML = `
        <div style="
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 2px solid #A80808;
        ">
          <img src="${logoImg}" style="width: 80px; height: 80px; margin-bottom: 8px;" />
          <h1 style="
            font-size: 24px;
            font-weight: bold;
            color: #A80808;
            margin: 0;
            font-family: 'Fraunces', 'Mukta', serif;
          ">
            🛕 Shree Ramchandra Temple
          </h1>
          <p style="
            font-size: 13px;
            color: #6b7280;
            margin: 4px 0 0;
          ">
            ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        ">
          <h2 style="
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
          ">
            📋 Latest Bookings
          </h2>
          <span style="
            background: #A80808;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          ">
            ${latestBookings.length} of ${bookings.length}
          </span>
        </div>

        <!-- Booking Cards -->
        ${latestBookings.map((booking, index) => createBookingCardHTML(booking, index)).join('')}

        <!-- Footer -->
        <div style="
          margin-top: 24px;
          padding-top: 16px;
          border-top: 2px solid #A80808;
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
        ">
          <p style="margin: 0;">
            This is an official booking confirmation document.
          </p>
          <p style="margin: 4px 0 0;">
            Generated on ${new Date().toLocaleString()}
          </p>
          <p style="margin: 2px 0 0; color: #d1d5db;">
            Document ID: ${new Date().getTime().toString(36).toUpperCase()}
          </p>
        </div>
      `;

      // Add watermark
      const watermarkImg = generateWatermark();
      const watermarkDiv = document.createElement('div');
      watermarkDiv.style.position = 'absolute';
      watermarkDiv.style.top = '0';
      watermarkDiv.style.left = '0';
      watermarkDiv.style.width = '100%';
      watermarkDiv.style.height = '100%';
      watermarkDiv.style.pointerEvents = 'none';
      watermarkDiv.style.backgroundImage = `url(${watermarkImg})`;
      watermarkDiv.style.backgroundRepeat = 'repeat';
      watermarkDiv.style.backgroundSize = '300px 300px';
      watermarkDiv.style.backgroundPosition = 'center';
      watermarkDiv.style.opacity = '0.3';
      watermarkDiv.style.zIndex = '1';
      
      // Wrap container with watermark
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '600px';
      wrapper.style.background = '#ffffff';
      wrapper.appendChild(container);
      wrapper.appendChild(watermarkDiv);
      
      // Temporarily append to body
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      document.body.appendChild(wrapper);
      
      // Capture with html2canvas
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 600,
        height: wrapper.scrollHeight,
        allowTaint: true,
        foreignObjectRendering: true
      });
      
      document.body.removeChild(wrapper);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Add page number if multiple pages
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        // Handle multiple pages
        let heightLeft = pdfHeight;
        let position = 0;
        let page = 1;
        
        while (heightLeft > 0) {
          if (page > 1) {
            pdf.addPage();
          }
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();
          position -= pdf.internal.pageSize.getHeight();
          page++;
        }
      }
      
      // Save PDF
      pdf.save(`my-bookings-latest-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Booking Card Component
  const BookingCard = ({ booking }) => (
    <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-[#A80808]/20 hover:-translate-y-1">
      <div className={`h-1 w-full ${getStatusBg(booking.status)}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)} border`}>
            {getStatusIcon(booking.status)}
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </div>
          <span className="text-xs text-gray-400 font-medium">
            #{booking._id.slice(-6)}
          </span>
        </div>

        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A80808] bg-[#A80808]/10 px-3 py-1 rounded-full">
            <Tag size={12} />
            {booking.type}
          </span>
        </div>

        <h3 className="text-base font-semibold text-gray-800 truncate">
          {booking.name}
        </h3>

        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
          <Phone size={13} className="text-[#A80808]" />
          <span>{booking.phone}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
          <Calendar size={13} className="text-[#A80808]" />
          <span>{booking.date}</span>
        </div>

        {booking.description && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-start gap-1.5">
              <FileText size={13} className="text-[#A80808] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 line-clamp-2">
                {booking.description}
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {t.bookedOn || 'Booked on'}: {formatLocaleDate(booking.createdAt, lang, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <OmLoader size="lg" color="maroon" className="mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: '#ffffff' }}>
      <PageHero title={t.myBookings} sub={t.bookingIntro} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header with Download Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <CalendarDays size={20} className="text-[#A80808]" />
            <h2 className="text-lg font-serif font-semibold text-gray-800">
              My Bookings
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {bookings.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Button - Latest 2 Bookings */}
            {bookings.length > 0 && (
              <button
                onClick={downloadPDF}
                disabled={isDownloading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[#A80808] text-white font-medium text-xs transition-all shadow-md shadow-[#A80808]/20 hover:shadow-lg ${
                  isDownloading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#660505]'
                }`}
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown size={14} />
                    Download Latest ({Math.min(2, bookings.length)})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-gray-100">
            <div className="w-24 h-24 rounded-full bg-[#A80808]/10 flex items-center justify-center mx-auto mb-4">
              <Calendar size={40} className="text-[#A80808]" />
            </div>
            <h3 className="text-2xl font-serif font-semibold text-gray-800">No Bookings Yet</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              You haven't made any bookings yet. Book a puja to receive divine blessings.
            </p>
            <button
              onClick={() => window.location.href = '/booking'}
              className="mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#A80808] text-white font-semibold text-sm hover:bg-[#660505] transition-all shadow-lg shadow-[#A80808]/20 hover:shadow-xl"
            >
              Book Now <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div ref={contentRef}>
            {/* Grid View - 4 Columns */}
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bookings.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: white !important;
          }
          .bg-white {
            background: white !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
};

export default MyBookingsPage;