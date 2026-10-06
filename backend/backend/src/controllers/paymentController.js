const crypto = require('crypto');
const Donation = require('../models/Donation');
const AdminSettings = require('../models/AdminSettings');
const User = require('../models/User');
const { sendDonationConfirmation } = require('../services/emailService');

const ESEWA_TEST_URL = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_LIVE_URL = 'https://epay.esewa.com.np/api/epay/main/v2/form';
const KHALTI_TEST_URL = 'https://dev.khalti.com/api/v2';
const KHALTI_LIVE_URL = 'https://khalti.com/api/v2';
const IPS_TEST_URL = 'https://uat.connectips.com/connectipswebgw/loginpage';
const IPS_LIVE_URL = 'https://connectipswebgw.connectips.com/connectipswebgw/loginpage';
const IPS_VALIDATE_TEST_URL = 'https://uat.connectips.com';
const IPS_VALIDATE_LIVE_URL = 'https://connectipswebws.connectips.com';

const isPaymentLive = (mode) => mode === 'live';

const generateTransactionUuid = (prefix = 'TXN') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(json.message || json.detail || json.statusDesc || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
};

const completeDonation = async (donation, transactionId) => {
  // Claim the donation in ONE atomic step that only matches while it is still pending. Two verify
  // calls arriving together (a double click, a refreshed success page) would otherwise both pass the
  // "is it pending?" check, count the donation twice and send two receipts.
  const set = { status: 'completed' };
  if (transactionId) set.transactionId = transactionId;
  const claimed = await Donation.findOneAndUpdate({ _id: donation._id, status: 'pending' }, { $set: set }, { new: true });
  if (!claimed) return false;
  donation.status = 'completed';
  if (transactionId) donation.transactionId = transactionId;

  try {
    // $inc on the stored counter: no read-modify-write race between simultaneous donations.
    await AdminSettings.updateOne({}, { $inc: { 'donate.baseCount': 1 } });
  } catch (error) {
    console.error('Update settings count error:', error);
  }

  try {
    const user = await User.findById(donation.userId);
    if (user) {
      await sendDonationConfirmation(donation, user);
    }
  } catch (error) {
    console.error('Email error:', error);
  }
};

const ESEWA_STATUS_TEST_URL = 'https://rc.esewa.com.np/api/epay/transaction/status/';
const ESEWA_STATUS_LIVE_URL = 'https://esewa.com.np/api/epay/transaction/status/';
// eSewa's published sandbox secret. Only ever used in test mode.
const ESEWA_SANDBOX_SECRET = '8gBm/:&EnhH.1/q';

const getEsewaSecret = () => {
  if (process.env.ESEWA_SECRET_KEY) return process.env.ESEWA_SECRET_KEY;
  return isPaymentLive(process.env.ESEWA_MODE) ? null : ESEWA_SANDBOX_SECRET;
};

const isAdminUser = (user) => user && !user.mustChangePassword && (user.role === 'admin' || user.role === 'superadmin');

/**
 * Load a donation for a verify call. Only the donor may verify it, and only a
 * pending donation can change state, so verify calls cannot be replayed to
 * re-send receipts / re-count donors or flip someone else's donation.
 * Returns { donation } or { done: true } when a response was already sent.
 */
const loadDonationForVerify = async (req, res, donationId) => {
  if (!donationId || !/^[a-f\d]{24}$/i.test(String(donationId))) {
    res.status(400).json({ success: false, message: 'Invalid donation id' });
    return { done: true };
  }
  const donation = await Donation.findById(donationId);
  if (!donation) {
    res.status(404).json({ success: false, message: 'Donation not found' });
    return { done: true };
  }
  if (String(donation.userId) !== String(req.user._id || req.user.id)) {
    res.status(403).json({ success: false, message: 'Not allowed to verify this donation' });
    return { done: true };
  }
  if (donation.status === 'completed') {
    // Idempotent: a refresh of the success page must not complete it twice.
    res.json({ success: true, message: 'Payment already verified', donationId });
    return { done: true };
  }
  if (donation.status !== 'pending') {
    res.status(400).json({ success: false, message: 'This donation is no longer pending' });
    return { done: true };
  }
  return { donation };
};

// A real, finite rupee amount: not NaN / Infinity / text, at least Rs. 1, at most Rs. 1 crore.
/**
 * Fifty lakh in one transaction, the same ceiling as the manual donation route.
 * It has to be repeated here: these three endpoints each create their own
 * Donation, so a rule that only lived on the manual route would leave the
 * gateways — which is how most donations are actually paid for — unrestricted.
 */
const MAX_DONATION = 5000000;

/*
 * From this amount up, a donor declares where the money came from and takes a
 * photograph of themselves; below it neither is asked for. Must stay the same
 * figure as DECLARED_INCOME_FROM in routes/donationRoutes.js and
 * WIDE_AMOUNT_FROM in frontend/src/utils/money.js — the form hides the fields at
 * this line, and all three paths stop demanding them at the same one.
 */
const DECLARED_INCOME_FROM = 1000000;

const isValidAmount = (amount) => {
  const n = Number(amount);
  return Number.isFinite(n) && n >= 1 && n <= MAX_DONATION;
};

/*
 * What the donor declared, and their photograph. Taken from the request on the
 * way past: these endpoints create the Donation, so a field not read here is a
 * field the admin never sees. The photograph is checked to be our own Cloudinary
 * address, for the same reason as on the manual route — it is displayed in the
 * admin panel and must not be an arbitrary URL a donor typed in.
 */
const declaredFields = (req, required) => {
  const { employment, businessIncome, photo } = req.body || {};
  const job = String(employment || '').trim();
  const business = String(businessIncome || '').trim();
  const pic = String(photo || '').trim();

  let picOk = false;
  if (pic) {
    try {
      const u = new URL(pic);
      const cloud = process.env.CLOUDINARY_CLOUD_NAME;
      picOk = u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !u.username && !u.password &&
        (cloud ? u.pathname.startsWith(`/${cloud}/image/`) : /^\/[^/]+\/image\//.test(u.pathname));
    } catch { /* not a URL */ }
  }

  return {
    // Only demanded from ten lakh up. Below that `required` is false and any of
    // them may be absent — but if a value was sent it is still stored, so a
    // donor who filled them in anyway is not losing what they typed.
    ok: !required || (!!job && !!business && picOk),
    fields: {
      employment: job,
      businessIncome: business,
      photo: picOk ? pic : null,
      photoCapturedAt: picOk ? new Date() : null,
    },
  };
};

/** The refusal, said the same way on all three gateways. */
const missingDeclared = {
  employment: 'Please enter your salary or employment.',
  businessIncome: 'Please enter your business income.',
  photo: 'Please take your photograph. It is required with every donation.',
};

/**
 * The refusal, said the same way on all three gateways. `photoGiven` and
 * `photoAccepted` are separate: a photograph that was sent but is not our own
 * Cloudinary address gets the "use the camera button" wording, because the donor
 * did take one and only the address is wrong.
 */
const declaredError = ({ job, business, photoGiven, photoAccepted }) => {
  // In order of the form: employment, then business income, then photograph.
  if (!job) return missingDeclared.employment;
  if (!business) return missingDeclared.businessIncome;
  if (!photoAccepted) {
    return photoGiven
      ? 'Please take your photograph using the camera button.'
      : missingDeclared.photo;
  }
  return null;
};

const sameAmount = (a, b) => Math.abs(Number(String(a).replace(/,/g, '')) - Number(b)) < 0.005;

exports.initiateEsewaPayment = async (req, res) => {
  try {
    const { amount, name, email, phone } = req.body;

    if (!isValidAmount(amount)) {
      // 'Invalid amount' also covers an amount over the ceiling; say so, because a
      // donor who typed too much zeroes needs to know it is a second transaction,
      // not a typo.
      return res.status(400).json(
        Number(amount) > MAX_DONATION
          ? { message: 'A single donation cannot be more than 50 lakh (50,00,000). Please send it as a second donation, one transaction of up to 50 lakh each.' }
          : { message: 'Invalid amount' }
      );
    }

const declared = declaredFields(req, Number(amount) >= DECLARED_INCOME_FROM);
    if (!declared.ok) {
      return res.status(400).json({
        message: declaredError({
          job: String(req.body?.employment || '').trim(),
          business: String(req.body?.businessIncome || '').trim(),
          photoGiven: !!String(req.body?.photo || '').trim(),
          photoAccepted: !!declared.fields.photo,
        })
      });
    }

    const merchantId = process.env.ESEWA_MERCHANT_ID || 'EPAYTEST';
    const secretKey = getEsewaSecret();
    if (!secretKey) {
      console.error('eSewa secret key is not configured'); return res.status(503).json({ message: 'This payment method is temporarily unavailable.' });
    }
    const testMode = !isPaymentLive(process.env.ESEWA_MODE);
    const successUrl = process.env.ESEWA_SUCCESS_URL || 'http://localhost:4000/donate/success';
    const failureUrl = process.env.ESEWA_FAILURE_URL || 'http://localhost:4000/donate/failure';
    const formUrl = testMode
      ? (process.env.ESEWA_TEST_URL || ESEWA_TEST_URL)
      : (process.env.ESEWA_LIVE_URL || ESEWA_LIVE_URL);

    const transactionUuid = generateTransactionUuid('TXN');

const donation = await Donation.create({
      userId: req.user.id,
      name: name || req.user.name,
      email: email || req.user.email,
      phone: phone || req.user.phone,
      amount: Number(amount),
      ...declared.fields,
      transactionId: transactionUuid,
      status: 'pending',
      paymentMethod: 'esewa',
    });

    const formData = {
      amount: amount.toString(),
      transaction_uuid: transactionUuid,
      product_code: merchantId,
      product_service_charge: '0',
      product_delivery_charge: '0',
      tax_amount: '0',
      total_amount: amount.toString(),
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };

    const signatureString = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${merchantId}`;
    formData.signature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureString)
      .digest('base64');

    res.json({
      success: true,
      data: formData,
      url: formUrl,
      donationId: donation._id,
    });
  } catch (error) {
    console.error('Initiate eSewa payment error:', error);
    res.status(500).json({ message: 'Payment initiation failed. Please try again.' });
  }
};

exports.verifyEsewaPayment = async (req, res) => {
  try {
    const { donationId, data } = req.body;

    const { donation, done } = await loadDonationForVerify(req, res, donationId);
    if (done) return;

    const merchantId = process.env.ESEWA_MERCHANT_ID || 'EPAYTEST';
    const testMode = !isPaymentLive(process.env.ESEWA_MODE);
    const secretKey = getEsewaSecret();

    // 1) Authoritative check: ask eSewa for the status of *this* donation's
    //    transaction and amount. Client-sent status/amount are never trusted.
    let confirmed = null;
    try {
      const statusUrl = new URL(testMode ? ESEWA_STATUS_TEST_URL : ESEWA_STATUS_LIVE_URL);
      statusUrl.searchParams.set('product_code', merchantId);
      statusUrl.searchParams.set('total_amount', String(donation.amount));
      statusUrl.searchParams.set('transaction_uuid', donation.transactionId);
      const json = await fetchJson(statusUrl.toString(), { method: 'GET' });
      confirmed = String(json.status || '').toUpperCase() === 'COMPLETE';
    } catch (error) {
      console.error('eSewa status lookup failed, falling back to signed response:', error.message);
    }

    // 2) Fallback when the status API is unreachable: accept only eSewa's
    //    signed redirect payload, and only if it matches this donation.
    if (confirmed === null) {
      confirmed = false;
      if (data && secretKey) {
        let fields;
        try {
          const normalized = String(data).replace(/-/g, '+').replace(/_/g, '/');
          fields = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
        } catch (error) {
          return res.status(400).json({ success: false, message: 'Invalid eSewa response data' });
        }
        const names = String(fields.signed_field_names || '').split(',').filter(Boolean);
        const text = names.map((n) => `${n}=${fields[n] ?? ''}`).join(',');
        const expected = crypto.createHmac('sha256', secretKey).update(text).digest('base64');
        confirmed =
          names.length > 0 &&
          expected === fields.signature &&
          names.includes('transaction_uuid') &&
          names.includes('total_amount') &&
          fields.transaction_uuid === donation.transactionId &&
          sameAmount(fields.total_amount, donation.amount) &&
          String(fields.status || '').toUpperCase() === 'COMPLETE';
      }
    }

    if (confirmed) {
      await completeDonation(donation, donation.transactionId);
      return res.json({
        success: true,
        message: 'Payment verified successfully',
        donationId,
      });
    }

    donation.status = 'failed';
    await donation.save();
    return res.status(400).json({
      success: false,
      message: 'Payment verification failed',
    });
  } catch (error) {
    console.error('Verify eSewa payment error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

exports.initiateKhaltiPayment = async (req, res) => {
  try {
    const { amount, name, email, phone } = req.body;

    if (!isValidAmount(amount)) {
      // 'Invalid amount' also covers an amount over the ceiling; say so, because a
      // donor who typed too much zeroes needs to know it is a second transaction,
      // not a typo.
      return res.status(400).json(
        Number(amount) > MAX_DONATION
          ? { message: 'A single donation cannot be more than 50 lakh (50,00,000). Please send it as a second donation, one transaction of up to 50 lakh each.' }
          : { message: 'Invalid amount' }
      );
    }

const declared = declaredFields(req, Number(amount) >= DECLARED_INCOME_FROM);
    if (!declared.ok) {
      return res.status(400).json({
        message: declaredError({
          job: String(req.body?.employment || '').trim(),
          business: String(req.body?.businessIncome || '').trim(),
          photoGiven: !!String(req.body?.photo || '').trim(),
          photoAccepted: !!declared.fields.photo,
        })
      });
    }

    const secretKey = process.env.KHALTI_SECRET_KEY;
    if (!secretKey) {
      console.error('Khalti secret key is not configured'); return res.status(503).json({ message: 'This payment method is temporarily unavailable.' });
    }

    const testMode = !isPaymentLive(process.env.KHALTI_MODE);
    const baseUrl = testMode
      ? (process.env.KHALTI_TEST_URL || KHALTI_TEST_URL)
      : (process.env.KHALTI_LIVE_URL || KHALTI_LIVE_URL);
    const returnUrl = process.env.KHALTI_RETURN_URL || 'http://localhost:4000/donate/success';
    const websiteUrl = process.env.KHALTI_WEBSITE_URL || 'http://localhost:4000';

    const purchaseOrderId = generateTransactionUuid('KHALTI');
    const amountPaisa = Math.round(Number(amount) * 100);

const donation = await Donation.create({
      userId: req.user.id,
      name: name || req.user.name,
      email: email || req.user.email,
      phone: phone || req.user.phone,
      amount: Number(amount),
      ...declared.fields,
      transactionId: purchaseOrderId,
      status: 'pending',
      paymentMethod: 'khalti',
    });

    const payload = {
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: amountPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: `Donation to Shree Ramchandra Temple - NPR ${Number(amount).toFixed(2)}`,
      customer_info: {
        name: name || req.user.name || 'Anonymous',
        email: email || req.user.email || '',
        phone: phone || req.user.phone || '',
      },
    };

    const json = await fetchJson(`${baseUrl}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!json.pidx || !json.payment_url) {
      throw new Error('Khalti did not return a payment url');
    }

    donation.gatewayRef = json.pidx;
    await donation.save();

    res.json({
      success: true,
      data: {
        pidx: json.pidx,
        paymentUrl: json.payment_url,
      },
      donationId: donation._id,
    });
  } catch (error) {
    console.error('Initiate Khalti payment error:', error);
    if (error.data && error.data.detail) {
      return res.status(500).json({ message: 'Khalti error: ' + error.data.detail });
    }
    res.status(500).json({ message: 'Payment initiation failed. Please try again.' });
  }
};

exports.verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx, donationId } = req.body;

    if (!pidx) {
      return res.status(400).json({ message: 'pidx is required' });
    }

    const secretKey = process.env.KHALTI_SECRET_KEY;
    if (!secretKey) {
      console.error('Khalti secret key is not configured'); return res.status(503).json({ message: 'This payment method is temporarily unavailable.' });
    }

    const testMode = !isPaymentLive(process.env.KHALTI_MODE);
    const baseUrl = testMode
      ? (process.env.KHALTI_TEST_URL || KHALTI_TEST_URL)
      : (process.env.KHALTI_LIVE_URL || KHALTI_LIVE_URL);

    const { donation, done } = await loadDonationForVerify(req, res, donationId);
    if (done) return;

    // The pidx must be the one issued for this donation, otherwise one cheap
    // completed payment could be replayed against a larger pending donation.
    if (typeof pidx !== 'string' || !donation.gatewayRef || pidx !== donation.gatewayRef) {
      return res.status(400).json({ success: false, message: 'Payment reference does not match this donation' });
    }

    const json = await fetchJson(`${baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${secretKey}`,
      },
      body: JSON.stringify({ pidx }),
    });

    const paidPaisa = Number(json.total_amount);
    const expectedPaisa = Math.round(Number(donation.amount) * 100);
    if (String(json.status || '').toLowerCase() === 'completed' && paidPaisa === expectedPaisa) {
      await completeDonation(donation, json.transaction_id || donation.transactionId);
      return res.json({
        success: true,
        message: 'Payment verified successfully',
        donationId,
      });
    }

    donation.status = 'failed';
    await donation.save();
    return res.status(400).json({
      success: false,
      message: `Payment is not completed (status: ${json.status || 'unknown'})`,
    });
  } catch (error) {
    console.error('Verify Khalti payment error:', error);
    res.status(500).json({ message: 'Payment verification failed. Please contact the temple office if money was deducted.' });
  }
};

const signWithIpsKey = (message) => {
  const raw = (process.env.IPS_PRIVATE_KEY || '').trim();
  if (!raw) {
    throw new Error('IPS_PRIVATE_KEY is not configured in .env');
  }

  const candidates = [];
  if (raw.includes('-----BEGIN')) {
    candidates.push(raw);
  } else {
    const base64 = raw.replace(/\\n/g, '\n').replace(/\s+/g, '');
    candidates.push(`-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`);
    candidates.push(`-----BEGIN RSA PRIVATE KEY-----\n${base64}\n-----END RSA PRIVATE KEY-----`);
  }

  let lastError = null;
  for (const pem of candidates) {
    try {
      return crypto.sign('sha256', Buffer.from(message, 'utf8'), pem).toString('base64');
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error('IPS_PRIVATE_KEY could not be used to sign the token: ' + (lastError ? lastError.message : 'no key provided'));
};

exports.initiateIpsPayment = async (req, res) => {
  try {
    const { amount, name, email, phone } = req.body;

    if (!isValidAmount(amount)) {
      // 'Invalid amount' also covers an amount over the ceiling; say so, because a
      // donor who typed too much zeroes needs to know it is a second transaction,
      // not a typo.
      return res.status(400).json(
        Number(amount) > MAX_DONATION
          ? { message: 'A single donation cannot be more than 50 lakh (50,00,000). Please send it as a second donation, one transaction of up to 50 lakh each.' }
          : { message: 'Invalid amount' }
      );
    }

const declared = declaredFields(req, Number(amount) >= DECLARED_INCOME_FROM);
    if (!declared.ok) {
      return res.status(400).json({
        message: declaredError({
          job: String(req.body?.employment || '').trim(),
          business: String(req.body?.businessIncome || '').trim(),
          photoGiven: !!String(req.body?.photo || '').trim(),
          photoAccepted: !!declared.fields.photo,
        })
      });
    }

    const merchantId = process.env.IPS_MERCHANT_ID;
    const appId = process.env.IPS_APP_ID;
    if (!merchantId || !appId) {
      console.error('IPS credentials are not configured'); return res.status(503).json({ message: 'This payment method is temporarily unavailable.' });
    }

    const testMode = !isPaymentLive(process.env.IPS_MODE);
    const loginUrl = testMode
      ? (process.env.IPS_TEST_URL || IPS_TEST_URL)
      : (process.env.IPS_LIVE_URL || IPS_LIVE_URL);

    const txnId = generateTransactionUuid('IPS').replace(/[^A-Z0-9]/g, '').slice(0, 20);
    const now = new Date();
    const txnDate = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      now.getFullYear(),
    ].join('-');
    const amountPaisa = Math.round(Number(amount) * 100);
    const remarks = `Donation NPR ${Number(amount).toFixed(2)}`;

    const fields = {
      MERCHANTID: merchantId,
      APPID: appId,
      APPNAME: process.env.IPS_APP_NAME || 'Shree Ramchandra Temple',
      TXNID: txnId,
      TXNDATE: txnDate,
      TXNCRNCY: 'NPR',
      TXNAMT: String(amountPaisa),
      REFERENCEID: txnId,
      REMARKS: remarks,
      PARTICULARS: remarks,
    };

    const message =
      `MERCHANTID=${fields.MERCHANTID},APPID=${fields.APPID},APPNAME=${fields.APPNAME},` +
      `TXNID=${fields.TXNID},TXNDATE=${fields.TXNDATE},TXNCRNCY=${fields.TXNCRNCY},` +
      `TXNAMT=${fields.TXNAMT},REFERENCEID=${fields.REFERENCEID},` +
      `REMARKS=${fields.REMARKS},PARTICULARS=${fields.PARTICULARS},TOKEN=TOKEN`;

    let token;
    try {
      token = signWithIpsKey(message);
    } catch (error) {
      console.error('IPS signing error:', error.message); return res.status(500).json({ message: 'This payment method is temporarily unavailable.' });
    }

const donation = await Donation.create({
      userId: req.user.id,
      name: name || req.user.name,
      email: email || req.user.email,
      phone: phone || req.user.phone,
      amount: Number(amount),
      ...declared.fields,
      transactionId: txnId,
      status: 'pending',
      paymentMethod: 'ips',
    });

    res.json({
      success: true,
      data: { ...fields, TOKEN: token },
      url: loginUrl,
      donationId: donation._id,
    });
  } catch (error) {
    console.error('Initiate IPS payment error:', error);
    res.status(500).json({ message: 'Payment initiation failed. Please try again.' });
  }
};

exports.verifyIpsPayment = async (req, res) => {
  try {
    const { donationId } = req.body;

    const merchantId = process.env.IPS_MERCHANT_ID;
    const appId = process.env.IPS_APP_ID;
    const password = process.env.IPS_PASSWORD;
    if (!merchantId || !appId || !password) {
      console.error('IPS credentials are not configured'); return res.status(503).json({ message: 'This payment method is temporarily unavailable.' });
    }

    const { donation, done } = await loadDonationForVerify(req, res, donationId);
    if (done) return;

    const testMode = !isPaymentLive(process.env.IPS_MODE);
    const baseUrl = testMode
      ? (process.env.IPS_VALIDATE_TEST_URL || IPS_VALIDATE_TEST_URL)
      : (process.env.IPS_VALIDATE_LIVE_URL || IPS_VALIDATE_LIVE_URL);

    const referenceId = donation.transactionId;
    const txnAmt = Math.round(Number(donation.amount) * 100);
    const message = `MERCHANTID=${merchantId},APPID=${appId},REFERENCEID=${referenceId},TXNAMT=${txnAmt}`;

    let token;
    try {
      token = signWithIpsKey(message);
    } catch (error) {
      console.error('IPS signing error:', error.message); return res.status(500).json({ message: 'This payment method is temporarily unavailable.' });
    }

    const json = await fetchJson(`${baseUrl}/connectipswebws/api/creditor/validatetxn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${appId}:${password}`).toString('base64'),
      },
      body: JSON.stringify({
        merchantId,
        appId,
        referenceId,
        txnAmt,
        token,
      }),
    });

    if (String(json.status || '').toUpperCase() === 'SUCCESS') {
      await completeDonation(donation, referenceId);
      return res.json({
        success: true,
        message: 'Payment verified successfully',
        donationId,
      });
    }

    donation.status = 'failed';
    await donation.save();
    return res.status(400).json({
      success: false,
      message: `Payment could not be validated (${json.statusDesc || json.status || 'unknown'})`,
    });
  } catch (error) {
    console.error('Verify IPS payment error:', error);
    res.status(500).json({ message: 'Payment verification failed. Please contact the temple office if money was deducted.' });
  }
};

exports.getDonationStatus = async (req, res) => {
  try {
    const { donationId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(String(donationId))) {
      return res.status(400).json({ message: 'Invalid donation id' });
    }
    const donation = await Donation.findById(donationId);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    if (String(donation.userId) !== String(req.user._id || req.user.id) && !isAdminUser(req.user)) {
      return res.status(403).json({ message: 'Not allowed to view this donation' });
    }

    res.json({
      success: true,
      data: donation,
    });
  } catch (error) {
    console.error('Get donation status error:', error);
    res.status(500).json({ message: 'Failed to get donation status' });
  }
};