const net = require('net');
const Visitor = require('../models/Visitor');

// Placeholder rows written before the IP dedupe fix. Their `0.0.0.0` address
// collapses every affected network into one bogus "visitor", so they are
// excluded from all counts rather than silently skewing the totals.
const isRealAddress = (ip) =>
  !!ip && ip !== '0.0.0.0' && ip !== '::1' && ip !== 'localhost' && ip !== '127.0.0.1';

/**
 * The caller's address as Express resolved it (`app.set('trust proxy', ...)` decides how many proxy
 * hops are believed). The X-Forwarded-For header is NEVER read directly here: any visitor can send
 * one, which would let them impersonate another address, fill the table with invented ones, or read
 * back another visitor's stored row.
 */
const getClientIp = (req) => {
  const ip = String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
  return net.isIP(ip) ? ip : '0.0.0.0';
};

// Text from the browser is stored and shown in the admin panel: type and length are enforced.
const cleanText = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
// Page paths never keep the secret part of a password-reset link.
const cleanPage = (value) => {
  const page = cleanText(value, 200).replace(/(\/reset-password\/)[^?#\s]+/gi, '$1:token');
  return page.startsWith('/') ? page : '/';
};

// Try to load geoip-lite, but don't fail if not available
let geoip;
try {
  geoip = require('geoip-lite');
} catch (error) {
  console.log('⚠️ geoip-lite not available, using IP API fallback');
  geoip = null;
}

// @desc    Track visitor
// @route   POST /api/visitors/track
// @access  Public
exports.trackVisitor = async (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = cleanText(body.sessionId, 64);
    const page = cleanPage(body.page);
    const pageTitle = cleanText(body.pageTitle, 200);
    const referrer = cleanText(body.referrer, 500).replace(/(\/reset-password\/)[^?#\s]+/gi, '$1:token');
    const userAgent = cleanText(body.userAgent, 300);
    // The page-view count is the server's own: a client-sent number is not trusted.
    const visitCount = 1;
    if (!sessionId) return res.status(400).json({ message: 'Invalid visit' });

    const cleanIp = getClientIp(req);

    // Get location from IP
    const location = await getLocationFromIP(cleanIp);

    // Parse user agent
    const deviceInfo = parseUserAgent(userAgent);

    /*
     * Dedupe key: IP + page + today.
     *
     * The previous key was sessionId + page + today, but sessionId is a
     * per-tab UUID that the browser mints on every load. Because rows are
     * written per page, one person browsing 8 pages produced 8 documents and
     * `distinct(sessionId)` counted all of them. Keying on the IP instead
     * means a refresh or a new tab updates the existing row rather than
     * inserting another, so "one device, one count" holds.
     *
     * visitCount on the row still tracks real page loads, which is what the
     * page-views metric should use.
     */
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const day = new Date().toISOString().split('T')[0];

    const existingVisitor = await Visitor.findOne({
      ipAddress: cleanIp,
      page,
      date: { $gte: startOfToday },
    });

    if (existingVisitor) {
      existingVisitor.visitCount = (existingVisitor.visitCount || 0) + 1;
      existingVisitor.sessionId = sessionId;
      existingVisitor.pageTitle = pageTitle || existingVisitor.pageTitle;
      existingVisitor.referrer = referrer || existingVisitor.referrer;
      existingVisitor.userAgent = userAgent || existingVisitor.userAgent;
      existingVisitor.deviceType = deviceInfo.deviceType;
      existingVisitor.browser = deviceInfo.browser;
      existingVisitor.os = deviceInfo.os;
      existingVisitor.location = location;
      existingVisitor.exitPage = page;
      existingVisitor.isNewVisitor = false;
      // timeSpent is written on unload, so don't reset it here
      await existingVisitor.save();

      return res.json({
        success: true,
        visitor: existingVisitor,
        isNew: false,
      });
    }

    // A network seen before today is a returning visitor, not a new one.
    // The client-sent flag is only a hint, so it is not trusted here.
    const seenBefore = await Visitor.exists({
      ipAddress: cleanIp,
      date: { $lt: startOfToday },
    });

    const visitor = await Visitor.create({
      sessionId,
      ipAddress: cleanIp,
      page,
      pageTitle: pageTitle || page,
      referrer: referrer || '',
      userAgent: userAgent || '',
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      location,
      isNewVisitor: !seenBefore,
      visitCount: visitCount || 1,
      entryPage: page,
      exitPage: page,
      date: new Date(),
      day,
      month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      year: new Date().getFullYear(),
    });

    res.json({
      success: true,
      visitor,
      isNew: !seenBefore,
    });
  } catch (error) {
    console.error('❌ Track visitor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update time spent on page
// @route   POST /api/visitors/time
// @access  Public
exports.updateTimeSpent = async (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = cleanText(body.sessionId, 64);
    const page = cleanPage(body.page);
    const timeSpent = Number(body.timeSpent);
    if (!sessionId || !Number.isFinite(timeSpent) || timeSpent < 0 || timeSpent > 86400) {
      return res.json({ success: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /*
     * Match on sessionId first, then fall back to IP + page.
     *
     * Rows are now keyed by IP, and a long-lived tab can outlive the
     * sessionId its row was written under (the row keeps the most recent
     * sessionId seen for that network). Preferring the sessionId and falling
     * back keeps the write landing on the right row in both cases, whereas
     * matching only on sessionId silently dropped timeSpent whenever the two
     * disagreed.
     */
    let visitor = await Visitor.findOneAndUpdate(
      { sessionId, page, date: { $gte: today } },
      { $set: { timeSpent } },
      { new: true }
    );

    if (!visitor && page) {
      const ipAddress = getClientIp(req);
      visitor = await Visitor.findOneAndUpdate(
        { ipAddress, page, date: { $gte: today } },
        { $set: { timeSpent } },
        { new: true }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update time spent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get visitor stats (admin only)
// @route   GET /api/visitors/stats
// @access  Private/Admin
exports.getVisitorStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    // 1-365 days: an unbounded window would load every row ever stored into memory.
    const windowDays = Math.min(365, Math.max(1, parseInt(days, 10) || 30));
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (windowDays - 1));

    // Placeholder rows carry no usable address, so they are dropped up front
    // rather than counted as one giant fake visitor.
    const rangeQuery = {
      date: { $gte: startDate },
      ipAddress: { $nin: ['0.0.0.0', '::1', 'localhost', '127.0.0.1'] },
    };

    // Get all visitors in date range
    const visitors = await Visitor.find(rangeQuery).sort({ date: 1 });

    /*
     * "Total Visitors" = distinct IPs in the window. This is the honest
     * one-device-one-count number; the old code counted distinct sessionIds,
     * which grew with every reload and tab.
     */
    const totalVisitors = new Set(
      visitors.map((v) => v.ipAddress).filter(isRealAddress)
    ).size;

    // Today's visitors, also deduped by IP (not raw row count)
    const today = new Date().toISOString().split('T')[0];
    const todayRows = visitors.filter((v) => (v.day || '') === today);
    const todayVisitors = new Set(todayRows.map((v) => v.ipAddress)).size;

    // Unique IPs seen on exactly one day vs multiple days in the window
    const daysSeenByIp = new Map();
    visitors.forEach((v) => {
      const ip = v.ipAddress;
      if (!isRealAddress(ip)) return;
      const seen = daysSeenByIp.get(ip) || new Set();
      seen.add(v.day || new Date(v.date).toISOString().split('T')[0]);
      daysSeenByIp.set(ip, seen);
    });
    const uniqueVisitors = daysSeenByIp.size;

    // Daily stats: `count` is distinct IPs that day (the visitor number the
    // chart should show); `pageViews` is the raw row/visit total.
    const dailyStats = visitors.reduce((acc, v) => {
      const day = v.day || v.date.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { date: day, count: 0, pageViews: 0, uniqueIPs: new Set() };
      }
      acc[day].count += 1;
      acc[day].pageViews += v.visitCount || 1;
      if (isRealAddress(v.ipAddress)) acc[day].uniqueIPs.add(v.ipAddress);
      return acc;
    }, {});

    const dailyStatsArray = Object.values(dailyStats).map(d => ({
      date: d.date,
      count: d.uniqueIPs.size,
      pageViews: d.pageViews,
      sessions: d.uniqueIPs.size,
      uniqueIPs: d.uniqueIPs.size,
    }));

    // Page-wise stats. `count` is raw page views; `uniqueVisitors` dedupes by IP.
    const pageStats = visitors.reduce((acc, v) => {
      const page = v.page || '/';
      if (!acc[page]) {
        acc[page] = { page, count: 0, uniqueIPs: new Set(), timeSpent: 0 };
      }
      acc[page].count += v.visitCount || 1;
      if (isRealAddress(v.ipAddress)) acc[page].uniqueIPs.add(v.ipAddress);
      acc[page].timeSpent += (v.timeSpent || 0);
      return acc;
    }, {});

    const pageStatsArray = Object.values(pageStats).map(p => ({
      page: p.page,
      count: p.count,
      uniqueVisitors: p.uniqueIPs.size,
      avgTimeSpent: p.count > 0 ? Math.round(p.timeSpent / p.count) : 0,
    })).sort((a, b) => b.count - a.count);

    // Device stats
    const deviceStats = visitors.reduce((acc, v) => {
      const device = v.deviceType || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    // Browser stats
    const browserStats = visitors.reduce((acc, v) => {
      const browser = v.browser || 'unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {});

    // OS stats
    const osStats = visitors.reduce((acc, v) => {
      const os = v.os || 'unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {});

    // Location stats - filter out Unknown
    const locationStats = visitors.reduce((acc, v) => {
      if (v.location?.country && v.location.country !== 'Unknown' && v.location.country !== '') {
        const key = `${v.location.country}${v.location.city && v.location.city !== 'Unknown' ? `, ${v.location.city}` : ''}`;
        if (!acc[key]) {
          acc[key] = {
            country: v.location.country,
            city: v.location.city || '',
            count: 0,
            visitors: new Set(),
            locations: [],
          };
        }
        acc[key].count += 1;
        if (isRealAddress(v.ipAddress)) acc[key].visitors.add(v.ipAddress);
        if (v.location.latitude && v.location.longitude) {
          acc[key].locations.push({
            lat: v.location.latitude,
            lng: v.location.longitude,
            sessionId: v.sessionId,
          });
        }
      }
      return acc;
    }, {});

    const locationStatsArray = Object.values(locationStats).map(l => ({
      country: l.country,
      city: l.city,
      count: l.count,
      uniqueVisitors: l.visitors.size,
      locations: l.locations.slice(0, 5),
    })).sort((a, b) => b.count - a.count);

    /*
     * Recent visitors: newest first, one row per IP per page.
     *
     * With IP dedupe on write there is already one row per network per page,
     * so this is a straight descending read. Placeholder rows are excluded.
     */
    const recentVisitors = await Visitor.find({
      ipAddress: { $nin: ['0.0.0.0', '::1', 'localhost', '127.0.0.1'] },
    })
      .sort({ date: -1 })
      .limit(50)
      .populate('userId', 'name email');

    // Hourly distribution
    const hourlyStats = Array(24).fill(0);
    visitors.forEach(v => {
      const hour = new Date(v.date).getHours();
      hourlyStats[hour] += 1;
    });

    // Average time spent
    const totalTimeSpent = visitors.reduce((sum, v) => sum + (v.timeSpent || 0), 0);
    const avgTimeSpent = visitors.length > 0 ? Math.round(totalTimeSpent / visitors.length) : 0;

    /*
     * Bounce rate, measured per network per day.
     *
     * Grouping by sessionId counted every reload as a separate one-page
     * session, so almost everything looked like a bounce. Grouping by
     * (ip, day) asks the question that actually matters: did this visitor
     * look at more than one page on a given day?
     */
    const pagesByVisitorDay = visitors.reduce((acc, v) => {
      if (!isRealAddress(v.ipAddress)) return acc;
      const key = `${v.ipAddress}|${v.day || new Date(v.date).toISOString().split('T')[0]}`;
      if (!acc[key]) acc[key] = new Set();
      acc[key].add(v.page);
      return acc;
    }, {});

    const visitorDayKeys = Object.keys(pagesByVisitorDay);
    const bounceCount = visitorDayKeys.filter(
      (k) => pagesByVisitorDay[k].size <= 1
    ).length;
    const bounceRate = visitorDayKeys.length > 0
      ? Math.round((bounceCount / visitorDayKeys.length) * 100)
      : 0;

    // Most popular entry pages
    const entryPages = visitors.reduce((acc, v) => {
      const page = v.entryPage || v.page || '/';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {});

    const topEntryPages = Object.entries(entryPages)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Return comprehensive stats
    res.json({
      success: true,
      data: {
        // Overview
        // totalVisitors / todayVisitors are distinct IPs (one device = one
        // count). totalPageViews is the sum of real page loads.
        totalVisitors,
        todayVisitors,
        uniqueVisitors,
        totalPageViews: visitors.reduce((sum, v) => sum + (v.visitCount || 1), 0),
        avgTimeSpent,
        bounceRate,

        // Time series
        dailyStats: dailyStatsArray.slice(-windowDays),
        weeklyStats: [],
        monthlyStats: [],
        hourlyStats,
        
        // Breakdown
        pageStats: pageStatsArray,
        deviceStats,
        browserStats,
        osStats,
        locationStats: locationStatsArray,
        
        // Recent
        recentVisitors: recentVisitors.map(v => ({
          _id: v._id,
          sessionId: v.sessionId,
          page: v.page,
          pageTitle: v.pageTitle,
          ipAddress: v.ipAddress,
          location: v.location,
          deviceType: v.deviceType,
          browser: v.browser,
          os: v.os,
          timeSpent: v.timeSpent,
          date: v.date,
          isNewVisitor: v.isNewVisitor,
          visitCount: v.visitCount,
          user: v.userId,
          userName: v.userName,
        })),
        
        // Top entry pages
        topEntryPages,
      },
    });
  } catch (error) {
    console.error('❌ Get visitor stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get visitor details by ID
// @route   GET /api/visitors/:id
// @access  Private/Admin
exports.getVisitorDetails = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id).populate('userId', 'name email profilePhoto');
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }
    res.json({
      success: true,
      data: visitor,
    });
  } catch (error) {
    console.error('Get visitor details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get location from IP
// @route   GET /api/visitors/location/:ip
// @access  Private/Admin
exports.getLocationFromIP = async (req, res) => {
  try {
    const { ip } = req.params;
    const location = await getLocationFromIP(ip);
    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/*
 * Language by country.
 *
 * Only the five languages the site actually ships are ever returned. Anything
 * outside these regions falls back to English rather than guessing, so a
 * visitor in, say, Germany is not shown Tamil.
 *
 * Note this is a *suggestion*, not a setting: the client only applies it when
 * the visitor has never chosen a language themselves.
 */
const COUNTRY_LANGUAGE = {
  // Nepali is the primary language of the temple's own country.
  NP: 'ne',
  // Hindi covers India, Nepal's southern neighbour and a Nepali diaspora.
  IN: 'hi',
  LK: 'ta',
  // Tamil Nadu is in India, so it is matched before the IN default below.
  CN: 'zh',
  // Fallbacks for the languages that are common outside their home region.
  // Placed after the exact matches on purpose.
  default: 'en',
};

// Indian states and regions where Tamil is the main language, so a visitor
// from Chennai is offered Tamil instead of the all-India Hindi default.
const TAMIL_REGIONS = new Set(['TN', 'PY', 'KL']);

const languageForLocation = (location) => {
  const code = String(location?.countryCode || '').toUpperCase();
  if (!code) return COUNTRY_LANGUAGE.default;

  if (code === 'IN') {
    const region = String(location?.regionCode || '').toUpperCase();
    if (TAMIL_REGIONS.has(region)) return 'ta';
    return COUNTRY_LANGUAGE.IN;
  }

  return COUNTRY_LANGUAGE[code] || COUNTRY_LANGUAGE.default;
};

/*
 * @desc    Detect the visitor's country and suggest a starting language
 * @route   GET /api/visitors/detect
 * @access  Public
 *
 * Called once on a visitor's very first visit. Returns the detected country
 * plus the language that country maps to, so a visitor in Nepal lands on the
 * Nepali site immediately instead of English.
 */
exports.detectLanguage = async (req, res) => {
  try {
    const cleanIp = getClientIp(req);
    const location = await getLocationFromIP(cleanIp);
    const lang = languageForLocation(location);

    res.json({
      success: true,
      data: {
        country: location.country,
        countryCode: location.countryCode,
        city: location.city,
        lang,
        // Only true when we actually recognised the country. The client uses
        // this to avoid switching a visitor away from a language they can read.
        detected: !!location.countryCode,
      },
    });
  } catch (error) {
    console.error('Detect language error:', error);
    // A failed detection must never block the page: fall back to English.
    res.json({
      success: true,
      data: { country: null, countryCode: null, city: null, lang: 'en', detected: false },
    });
  }
};

/*
 * @desc    Get the public visitor counters
 * @route   GET /api/visitors/count
 * @access  Public
 *
 * "One device, one count": each distinct IP contributes exactly one visit per
 * day regardless of how many pages it loads or how often it refreshes. Used for
 * any visitor number shown on the site.
 */
exports.getPublicVisitorCount = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const day = new Date().toISOString().split('T')[0];

    const realQuery = {
      ipAddress: { $nin: ['0.0.0.0', '::1', 'localhost', '127.0.0.1'] },
    };

    const [today, allTime, pageViewsToday] = await Promise.all([
      Visitor.distinct('ipAddress', { ...realQuery, day }),
      Visitor.distinct('ipAddress', realQuery),
      Visitor.aggregate([
        { $match: { ...realQuery, date: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$visitCount', 1] } } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        today: today.length,
        allTime: allTime.length,
        pageViewsToday: pageViewsToday[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Get public visitor count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get location from IP address using geoip-lite or IP API
 */
async function getLocationFromIP(ip) {
  // Default location
  const defaultLocation = {
    country: 'Unknown',
    countryCode: '',
    city: 'Unknown',
    region: '',
    regionCode: '',
    latitude: 0,
    longitude: 0,
    timezone: '',
    isp: '',
  };

  if (!isRealAddress(ip)) {
    return defaultLocation;
  }

  // Clean IP
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Try geoip-lite first
  if (geoip) {
    try {
      const geo = geoip.lookup(cleanIp);
      if (geo && geo.country) {
        // Resolved locally; no logging needed on the hot path.
        return {
          country: geo.country || 'Unknown',
          // ISO 3166-1 alpha-2, needed to map a country to a site language.
          countryCode: geo.country || '',
          city: geo.city || 'Unknown',
          region: geo.region || '',
          // State / region code (e.g. "TN" for Tamil Nadu), used to tell regions of India apart.
          regionCode: geo.region || '',
          latitude: geo.ll?.[0] || 0,
          longitude: geo.ll?.[1] || 0,
          timezone: geo.timezone || '',
          isp: '',
        };
      }
    } catch (error) {
      console.log('GeoIP lookup failed:', error.message);
    }
  }

  // There is deliberately no web fallback: the old one sent every visitor's address in clear text
  // (plain http) to a third party. An address missing from the bundled database stays "Unknown".
  return defaultLocation;
}

/**
 * Parse user agent string
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  let deviceType = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  // Detect device
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(userAgent)) {
    deviceType = 'mobile';
  }
  if (/tablet|ipad|kindle|playbook|silk/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Detect browser
  if (/Chrome/i.test(userAgent) && !/Edge|OPR|Brave/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/Firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(userAgent) && !/Chrome|Edge/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/Edge/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/OPR|Opera/i.test(userAgent)) {
    browser = 'Opera';
  } else if (/Brave/i.test(userAgent)) {
    browser = 'Brave';
  }

  // Detect OS
  if (/Windows NT 10.0/i.test(userAgent)) {
    os = 'Windows 10';
  } else if (/Windows NT 6.3/i.test(userAgent)) {
    os = 'Windows 8.1';
  } else if (/Windows NT 6.2/i.test(userAgent)) {
    os = 'Windows 8';
  } else if (/Windows NT 6.1/i.test(userAgent)) {
    os = 'Windows 7';
  } else if (/Windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/Mac OS X/i.test(userAgent)) {
    os = 'macOS';
  } else if (/Linux/i.test(userAgent) && !/Android/i.test(userAgent)) {
    os = 'Linux';
  } else if (/Android/i.test(userAgent)) {
    os = 'Android';
  } else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
    os = 'iOS';
  }

  return { deviceType, browser, os };
}