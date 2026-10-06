import React from 'react';
import PrintSheet, { PrintHeader, PrintField, PrintFooter } from '../common/PrintSheet';
import { formatDateTime } from '../../utils/formatDate';

/* ============================================================
 * PRINTABLE BOOKING
 * ============================================================ */

const BOOKING_STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PrintBooking = ({ booking, settings, onClose, t }) => {
  if (!booking) return null;

  const templeName = settings?.logo?.text?.en || 'Shree Ramchandra Temple';

  return (
    <PrintSheet
      title={t?.printBookingTitle || t?.bookingTitle || 'Booking Details'}
      subtitle={t?.bookingDetailsSubtitle || 'Printable puja booking record'}
      onClose={onClose}
    >
      <PrintHeader settings={settings} documentTitle={t?.bookingDocument || 'Puja Booking Record'} />

      {/* Reference + status */}
      <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
        <PrintField
          label={t?.bookingReference || 'Reference No.'}
          value={`BKG-${String(booking._id || '').slice(-8).toUpperCase()}`}
          mono
        />
        <div className="text-right">
          <PrintField
            label={t?.status || 'Status'}
            value={
              BOOKING_STATUS_LABEL[booking.status] || booking.status || '—'
            }
          />
        </div>
      </div>

      {/* Devotee */}
      <section className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          {t?.devoteeDetails || 'Devotee Details'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <PrintField label={t?.fullName || 'Full Name'} value={booking.name} />
          <PrintField label={t?.phoneNumber || 'Phone Number'} value={booking.phone} mono />
          <PrintField label={t?.yourEmail || 'Email'} value={booking.email} />
          <PrintField
            label={t?.bookedOn || 'Booked On'}
            value={formatDateTime(booking.createdAt)}
          />
        </div>
      </section>

      {/* Puja */}
      <section className="border border-gray-300 rounded-lg p-4 mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          {t?.pujaDetails || 'Puja Details'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <PrintField label={t?.pujaType || 'Puja Type'} value={booking.type} />
          <PrintField label={t?.pujaDate || 'Puja Date'} value={booking.date} />
        </div>
        {booking.description && (
          <div className="mt-4">
            <PrintField
              label={t?.specialInstruction || 'Special Instruction'}
              value={booking.description}
            />
          </div>
        )}
      </section>

      <PrintFooter
        settings={settings}
        note={`${templeName} — ${t?.bookingPrintNote || 'This is a system generated booking record.'}`}
      />
    </PrintSheet>
  );
};

/* ============================================================
 * PRINTABLE DONATION
 * ============================================================ */

const DONATION_STATUS_LABEL = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
};

const PAYMENT_LABEL = {
  esewa: 'eSewa',
  khalti: 'Khalti',
  ips: 'IPS (ConnectIPS)',
  bank: 'Bank Transfer',
  cash: 'Cash',
};

export const PrintDonation = ({ donation, settings, onClose, t }) => {
  if (!donation) return null;

  const templeName = settings?.logo?.text?.en || 'Shree Ramchandra Temple';
  const amount = Number(donation.amount) || 0;

  return (
    <PrintSheet
      title={t?.donationTitle || 'Donation Details'}
      subtitle={t?.donationDetailsSubtitle || 'Printable donation record'}
      onClose={onClose}
    >
      <PrintHeader settings={settings} documentTitle={t?.donationDocument || 'Donation Record'} />

      <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
        <PrintField
          label={t?.receiptNo || 'Receipt No.'}
          value={`RCT-${String(donation._id || '').slice(-8).toUpperCase()}`}
          mono
        />
        <div className="text-right">
          <PrintField
            label={t?.status || 'Status'}
            value={DONATION_STATUS_LABEL[donation.status] || donation.status || '—'}
          />
        </div>
      </div>

      {/* Donor */}
      <section className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          {t?.donorInformation || 'Donor Information'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <PrintField label={t?.fullName || 'Full Name'} value={donation.name} />
          <PrintField label={t?.yourEmail || 'Email'} value={donation.email} />
          <PrintField label={t?.phoneNumber || 'Phone Number'} value={donation.phone} mono />
          <PrintField
            label={t?.donationDate || 'Donation Date'}
            value={formatDateTime(donation.date || donation.createdAt)}
          />
        </div>
      </section>

      {/* Amount table */}
      <section className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#A80808] text-white">
              <th className="px-4 py-2 text-left">{t?.description || 'Description'}</th>
              <th className="px-4 py-2 text-right">{t?.amount || 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="px-4 py-2">
                {t?.donationToTemple || 'Donation to'} {templeName}
              </td>
              <td className="px-4 py-2 text-right font-bold">NPR {amount.toLocaleString()}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-4 py-2 text-xs text-gray-500">
                {t?.paymentMethod || 'Payment Method'}
              </td>
              <td className="px-4 py-2 text-right text-xs text-gray-500">
                {PAYMENT_LABEL[donation.paymentMethod] || donation.paymentMethod || '—'}
              </td>
            </tr>
            {donation.transactionId && (
              <tr>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {t?.transactionId || 'Transaction ID'}
                </td>
                <td className="px-4 py-2 text-right text-xs font-mono">
                  {donation.transactionId}
                </td>
              </tr>
            )}
            {donation.message && (
              <tr>
                <td className="px-4 py-2 text-xs text-gray-500">{t?.message || 'Message'}</td>
                <td className="px-4 py-2 text-right text-xs italic">{donation.message}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td className="px-4 py-2 font-bold">{t?.totalAmount || 'Total Amount'}</td>
              <td className="px-4 py-2 text-right font-bold text-[#A80808] text-lg">
                NPR {amount.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <PrintFooter
        settings={settings}
        note={`${templeName} — ${t?.donationPrintNote || 'This is a system generated donation record.'}`}
      />
    </PrintSheet>
  );
};

/* ============================================================
 * PRINTABLE LIST  (all currently filtered records)
 * ============================================================ */

export const PrintRecordList = ({
  title,
  columns,
  rows,
  settings,
  onClose,
  t,
  dateField = 'createdAt',
}) => {
  if (!Array.isArray(rows)) return null;

  return (
    <PrintSheet
      title={title}
      subtitle={`${rows.length} ${t?.records || 'records'}`}
      onClose={onClose}
    >
      <PrintHeader settings={settings} documentTitle={title} />

      <p className="text-xs text-gray-500 mb-4">
        {t?.printedOn || 'Printed on'}: {formatDateTime(new Date())}
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          {t?.noRecords || 'No records to print.'}
        </p>
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#A80808] text-white">
              {columns.map((c) => (
                <th key={c.key} className="px-2.5 py-2 text-left font-bold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row._id || i} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-2.5 py-2 border-b border-gray-200 align-top ${
                      c.align === 'right' ? 'text-right' : ''
                    } ${c.mono ? 'font-mono' : ''}`}
                  >
                    {c.printValue
                      ? c.printValue(row)
                      : c.value
                        ? c.value(row)
                        : row[c.key] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <PrintFooter settings={settings} />
    </PrintSheet>
  );
};
