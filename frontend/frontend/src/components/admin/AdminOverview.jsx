import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasArea, areaForPage } from '../../utils/permissions';
import api from '../../services/api';
import { formatDate as formatLocaleDate, formatTime } from '../../utils/formatDate';
import OmLoader from '../../components/common/OmLoader';
import {
  Users, CalendarDays, Gift, ClipboardList,
  Eye, Activity, ArrowUp, ArrowDown, UserPlus,
  TrendingUp, Calendar, Clock, BookOpen, MessageCircle,
  MapPin,
  Globe, ChevronRight, UserX, CheckCircle2, Mail
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// Format a coordinate to a readable value (e.g. 27.7172°)
const formatCoord = (val) => {
  const n = Number(val);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(4);
};

const AdminOverview = ({ settings, users, events, donations, bookings, t, lang }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visitorStats, setVisitorStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange] = useState('7');
  const [contactStats, setContactStats] = useState({ total: 0, pending: 0, read: 0, replied: 0 });
  const [blogStats, setBlogStats] = useState({ total: 0, published: 0, draft: 0 });

  // Number of suspended accounts (for the "needs attention" strip).
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [accountTotal, setAccountTotal] = useState(null);
  // True when a request behind the "needs attention" counts failed: a missing count
  // must not read as "nothing is waiting".
  const [attnUnknown, setAttnUnknown] = useState(false);

  useEffect(() => {
    let live = true;
    // Each source is independent and only requested when this admin may use
    // that area; a restricted admin would otherwise get 403s here.
    const fetchStats = async () => {
      const jobs = {
        visitors: hasArea(user, 'analytics') ? api.get(`/visitors/stats?days=${timeRange}`) : null,
        activity: api.get('/admin/activity'),
        contact: hasArea(user, 'contact') ? api.get('/contact/stats') : null,
        blogs: api.get('/admin/blogs'),
        accounts: hasArea(user, 'users') ? api.get('/admin/accounts/summary') : null,
      };
      const keys = Object.keys(jobs);
      const settled = await Promise.allSettled(keys.map((k) => jobs[k] || Promise.resolve(null)));
      if (!live) return;
      const got = {};
      keys.forEach((k, i) => { if (settled[i].status === 'fulfilled' && settled[i].value) got[k] = settled[i].value.data; });
      setAttnUnknown(keys.some((k, i) => (k === 'contact' || k === 'accounts') && settled[i].status === 'rejected'));

      if (got.visitors) setVisitorStats(got.visitors.data);
      if (Array.isArray(got.activity)) setRecentActivities(got.activity.slice(0, 5));
      if (got.contact) setContactStats(got.contact.data);
      const blogs = got.blogs?.data || [];
      setBlogStats({
        total: blogs.length,
        published: blogs.filter((b) => b.published !== false).length,
        draft: blogs.filter((b) => b.published === false).length,
      });
      if (got.accounts) {
        setSuspendedCount(got.accounts.data.suspended || 0);
        setAccountTotal(got.accounts.data.total);
      }
      setLoading(false);
    };
    fetchStats().catch((error) => { console.error('Error fetching stats:', error); if (live) { setAttnUnknown(true); setLoading(false); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the range changes
  }, [timeRange]);

  const statusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  bookings?.forEach((b) => {
    if (statusCounts[b.status] !== undefined) statusCounts[b.status]++;
  });

  const statusColors = {
    pending: '#F59E0B',
    confirmed: '#16A34A',
    completed: '#0EA5E9',
    cancelled: '#EF4444',
  };

  const statusLabels = {
    pending: t.statusPending || 'Pending',
    confirmed: t.statusConfirmed || 'Confirmed',
    completed: t.statusCompleted || 'Completed',
    cancelled: t.statusCancelled || 'Cancelled',
  };

  const totalDonors = (settings?.donate?.baseCount || 0) + (donations?.length || 0);
  const totalDonationAmount = donations?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

  // Real visitor change between the last 7 days and the previous 7 days
  const daily = visitorStats?.dailyStats || [];
  const last7 = daily.slice(-7).reduce((sum, d) => sum + (d.count || 0), 0);
  const prev7 = daily.slice(-14, -7).reduce((sum, d) => sum + (d.count || 0), 0);
  const visitorChange = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

  // Prepare chart data
  const barData = visitorStats?.dailyStats?.slice(-14).map(d => ({
    date: formatLocaleDate(d.date, lang, { month: 'short', day: 'numeric' }),
    visitors: d.count || 0,
    sessions: d.sessions || 0,
    uniqueIPs: d.uniqueIPs || 0,
  })) || [];

  const pieData = Object.entries(statusCounts)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: statusLabels[key] || key,
      value: value,
      color: statusColors[key],
    }));

  const lineData = visitorStats?.dailyStats?.slice(-7).map(d => ({
    date: formatLocaleDate(d.date, lang, { weekday: 'short' }),
    visitors: d.count || 0,
  })) || [];

  const pieColors = ['#F59E0B', '#16A34A', '#0EA5E9', '#EF4444'];

  // Prepare location data for display
  const locationData = visitorStats?.locationStats || [];

  // Stats cards with real data
  const stats = [
    { 
      icon: Users, 
      label: t.totalUsers || 'Total Users',
      value: accountTotal ?? (users?.length || 0),
      bgColor: 'bg-brand-50',
      iconColor: 'text-brand-600',
      path: '/admin/users',
    },
    { 
      icon: Eye, 
      label: t.a1_overviewTotalVisitors || 'Total Visitors',
      value: visitorStats?.totalVisitors || 0,
      bgColor: 'bg-brand-50',
      iconColor: 'text-brand-600',
      change: visitorChange !== null ? `${visitorChange >= 0 ? '+' : ''}${visitorChange}%` : null,
      trend: visitorChange !== null && visitorChange >= 0 ? 'up' : 'down',
      path: '/admin/visitors',
    },
    { 
      icon: Gift, 
      label: t.totalDonors || 'Total Donors',
      value: totalDonors,
      bgColor: 'bg-brand-50',
      iconColor: 'text-brand-600',
      path: '/admin/donations',
    },
    { 
      icon: CalendarDays, 
      label: t.totalEvents || 'Total Events',
      value: events?.length || 0,
      bgColor: 'bg-brand-50',
      iconColor: 'text-brand-600',
      path: '/admin/events',
    },
    { 
      icon: ClipboardList, 
      label: t.totalBookings || 'Total Bookings',
      value: bookings?.length || 0,
      bgColor: 'bg-brand-50',
      iconColor: 'text-brand-600',
      path: '/admin/bookings',
    },
    { 
      icon: BookOpen, 
      label: t.a1_overviewBlogPosts || 'Blog Posts',
      value: blogStats.total,
      bgColor: 'bg-brand-50',
      iconColor: 'text-brand-600',
      path: '/admin/blogs',
    },
  ];

  // Only tiles for areas this admin may open.
  const visibleStats = stats.filter((st) => hasArea(user, areaForPage((st.path || '').replace('/admin/', ''))));
  const showVisitors = hasArea(user, 'analytics');
  const showBookings = hasArea(user, 'bookings');
  const showDonations = hasArea(user, 'donations');
  const showContact = hasArea(user, 'contact');
  const showContent = hasArea(user, 'content');

  // What needs a human today (each item links to where it is handled).
  const pendingDonations = donations?.filter((d) => d.status === 'pending').length || 0;
  const attention = [
    showBookings && { key: 'b', icon: ClipboardList, count: statusCounts.pending, label: t.k7_attnBookings || 'bookings waiting for a decision', to: '/admin/bookings' },
    showDonations && { key: 'd', icon: Gift, count: pendingDonations, label: t.k7_attnDonations || 'donations waiting for review', to: '/admin/donations' },
    showContact && { key: 'c', icon: Mail, count: contactStats.pending, label: t.k7_attnMessages || 'messages not answered yet', to: '/admin/contact' },
    hasArea(user, 'users') && { key: 'u', icon: UserX, count: suspendedCount, label: t.k7_attnSuspended || 'suspended accounts', to: '/admin/users' },
  ].filter(Boolean);
  const attentionOpen = attention.filter((a) => a.count > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
          <p className="text-sm font-semibold text-ink">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-xs text-ink-soft">
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get status icon for activity
  const getActivityIcon = (type) => {
    const a = String(type || '').toLowerCase();
    if (a.includes('booking')) return <ClipboardList size={14} className="text-gray-500" />;
    if (a.includes('donation')) return <Gift size={14} className="text-brand-600" />;
    if (a.includes('account') || a.includes('admin') || a.includes('user') || a.includes('password')) return <UserPlus size={14} className="text-brand-500" />;
    return <Activity size={14} className="text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <OmLoader size="lg" color="maroon" className="mx-auto mb-4" />
          <p className="text-ink-soft">{t.a1_overviewLoading || 'Loading dashboard data...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#A80808] to-[#A80808] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold">{t.welcomeBack || 'Welcome back'}, {user?.name || t.a1_overviewAdmin || 'Admin'}! 👋</h2>
            <p className="text-white/70 text-sm mt-1">{t.a1_overviewSubtitle || "Here's what's happening with your temple today"}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatLocaleDate(new Date(), lang, { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatTime(new Date(), lang, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          {showBookings && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{bookings?.length || 0}</div>
              <div className="text-xs text-white/70">{t.totalBookings || 'Total Bookings'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Needs attention: only what this admin can act on */}
      {attention.length > 0 && (
        <section aria-label={t.k7_needsAttention || 'Needs attention'} className="rounded-xl border border-line bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-serif font-semibold text-ink">
            {attentionOpen.length || attnUnknown ? <ClipboardList size={16} className="text-vermilion" aria-hidden="true" /> : <CheckCircle2 size={16} className="text-green-600" aria-hidden="true" />}
            {attentionOpen.length ? (t.k7_needsAttention || 'Needs attention') : attnUnknown ? (t.k7_attnUnknown || 'Some figures could not be loaded, so this list may be incomplete.') : (t.k7_allCaughtUp || 'All caught up. Nothing is waiting for you.')}
          </h3>
          {attentionOpen.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {attentionOpen.map((a) => {
                const I = a.icon;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => navigate(a.to)}
                    className="flex items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-brand-300"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-vermilion ring-1 ring-line"><I size={16} aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block font-serif text-lg font-semibold leading-tight text-ink">{a.count}</span>
                      <span className="block text-xs leading-snug text-ink-soft">{a.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Stats Grid - 6 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {visibleStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              onClick={() => stat.path && navigate(stat.path)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#A80808]/20 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-ink-soft uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xl font-bold font-serif text-ink mt-1">{stat.value.toLocaleString()}</p>
                  {stat.change && (
                    <p className={`text-xs font-semibold mt-0.5 flex items-center gap-0.5 ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                  <Icon size={16} className={stat.iconColor} />
                </div>
              </div>
              <div className="mt-2 hidden lg:flex items-center gap-1 text-xs font-semibold text-[#A80808] opacity-0 group-hover:opacity-100 transition-opacity">
                {t.a1_overviewViewDetails || 'View details'} <ChevronRight size={12} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart - Daily Visitors */}
        {showVisitors && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-serif font-semibold text-ink">{t.a1_overviewDailyVisitors || 'Daily Visitors'}</h4>
              <p className="text-xs text-ink-soft">{(t.a1_overviewLastNDays || 'Last {count} days').replace('{count}', barData.length)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <Activity size={14} className="text-[#A80808]" />
              <span>{t.a1_overviewTotal || 'Total'}: {visitorStats?.totalVisitors || 0}</span>
            </div>
          </div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="visitors" fill="#A80808" radius={[4, 4, 0, 0]} name={t.a1_overviewVisitors || 'Visitors'} />
                <Bar dataKey="uniqueIPs" fill="#E2DBD8" radius={[4, 4, 0, 0]} name={t.a1_overviewUniqueIps || 'Unique IPs'} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-ink-soft">
              {t.a1_overviewNoData || 'No data available'}
            </div>
          )}
        </div>)}

        {/* Pie Chart - Booking Status */}
        {showBookings && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-serif font-semibold text-ink">{t.a1_overviewBookingStatus || 'Booking Status'}</h4>
              <p className="text-xs text-ink-soft">{t.a1_overviewBookingDist || 'Distribution of all bookings'}</p>
            </div>
            <ClipboardList size={16} className="text-[#A80808]" />
          </div>
          {pieData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    // Percent only: the legend beside the chart already names each slice, and
                    // "Confirmed 28%" outside the ring was clipped at the chart edges.
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 min-w-[120px]">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: item.color || pieColors[index] }} />
                      <span className="text-ink-soft">{item.name}</span>
                    </div>
                    <span className="font-semibold text-ink">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-ink-soft">
              {t.a1_overviewNoBookingData || 'No bookings data available'}
            </div>
          )}
        </div>)}
      </div>

      {/* Second Row - Line and Visitor Location */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Line Chart - Visitor Trend */}
        {showVisitors && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-serif font-semibold text-ink">{t.a1_overviewVisitorTrend || 'Visitor Trend'}</h4>
              <p className="text-xs text-ink-soft">{(t.a1_overviewLastNDays || 'Last {count} days').replace('{count}', 7)}</p>
            </div>
            <TrendingUp size={16} className="text-green-500" />
          </div>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="visitors" 
                  stroke="#A80808" 
                  strokeWidth={2}
                  dot={{ fill: '#A80808', r: 4 }}
                  activeDot={{ r: 6 }}
                  name={t.a1_overviewVisitors || 'Visitors'}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-ink-soft">
              {t.a1_overviewNoData || 'No data available'}
            </div>
          )}
        </div>)}

        {/* Visitor Location Stats */}
        {showVisitors && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-serif font-semibold text-ink flex items-center gap-2">
                <MapPin size={16} className="text-[#A80808]" />
                {t.a1_overviewLocations || 'Visitor Locations'}
              </h4>
              <p className="text-xs text-ink-soft">{t.a1_overviewLocationsSub || 'Real visitor locations'}</p>
            </div>
            <Globe size={16} className="text-ink-soft" />
          </div>
          {locationData.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {locationData.slice(0, 6).map((location, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#A80808] flex-shrink-0" />
                      <span className="text-sm text-ink-soft truncate">
                        {location.country}
                        {location.city && location.city !== 'Unknown' && `, ${location.city}`}
                      </span>
                    </div>
                    {location.locations && location.locations.length > 0 && (
                      <span className="text-xs text-mute ml-6 font-mono">
                        {formatCoord(location.locations[0].lat)}°, {formatCoord(location.locations[0].lng)}°
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-ink-soft">{(t.a1_overviewVisits || '{count} visits').replace('{count}', location.count)}</span>
                    <span className="text-xs font-semibold text-[#A80808]">
                      {(t.a1_overviewVisitorsCount || '{count} visitors').replace('{count}', location.uniqueVisitors)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-ink-soft">
              {t.a1_overviewNoLocation || 'No location data available'}
            </div>
          )}
        </div>)}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-serif font-semibold text-ink flex items-center gap-2">
              <Activity size={16} className="text-[#A80808]" />
              {t.a1_overviewRecentActivity || 'Recent Activity'}
            </h4>
            <p className="text-xs text-ink-soft">{t.a1_overviewRecentSub || 'Latest actions on your site'}</p>
          </div>
        </div>
        {recentActivities.length > 0 ? (
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{activity.action}{activity.user?.name ? ` · ${activity.user.name}` : ''}</p>
                  <p className="text-xs text-ink-soft">
                    {formatLocaleDate(activity.timestamp, lang, { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-ink-soft">
            {t.a1_overviewNoActivity || 'No recent activity'}
          </div>
        )}
      </div>

      {/* Bottom Row - Quick Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Blog Stats */}
        {showContent && (<div role="button" tabIndex={0} onClick={() => navigate('/admin/blogs')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/blogs'); } }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#A80808]/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
          <h4 className="text-sm font-serif font-semibold text-ink mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-brand-500" />
            {t.a1_overviewBlogPosts || 'Blog Posts'}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-brand-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.a1_overviewTotal || 'Total'}</span>
              <span className="text-sm font-bold text-ink">{blogStats.total}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.a1_overviewPublished || 'Published'}</span>
              <span className="text-sm font-bold text-green-600">{blogStats.published}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.a1_overviewDraft || 'Draft'}</span>
              <span className="text-sm font-bold text-yellow-600">{blogStats.draft}</span>
            </div>
          </div>
        </div>)}

        {/* Contact Stats */}
        {showContact && (<div role="button" tabIndex={0} onClick={() => navigate('/admin/contact')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/contact'); } }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#A80808]/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
          <h4 className="text-sm font-serif font-semibold text-ink mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-brand-500" />
            {t.navContactMessages || 'Contact Messages'}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-brand-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.a1_overviewTotal || 'Total'}</span>
              <span className="text-sm font-bold text-ink">{contactStats.total}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.statusPending || 'Pending'}</span>
              <span className="text-sm font-bold text-yellow-600">{contactStats.pending}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.a1_overviewReplied || 'Replied'}</span>
              <span className="text-sm font-bold text-green-600">{contactStats.replied}</span>
            </div>
          </div>
        </div>)}

        {/* Donation Stats */}
        {showDonations && (<div role="button" tabIndex={0} onClick={() => navigate('/admin/donations')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/donations'); } }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#A80808]/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
          <h4 className="text-sm font-serif font-semibold text-ink mb-3 flex items-center gap-2">
            <Gift size={16} className="text-vermilion" aria-hidden="true" />
            {t?.manageDonate || 'Donations'}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-panel rounded-lg">
              <span className="text-xs text-ink-soft">{t.totalDonors || 'Total Donors'}</span>
              <span className="text-sm font-bold text-ink">{totalDonors}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-brand-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.totalAmount || 'Total Amount'}</span>
              <span className="text-sm font-bold text-brand-600">NPR {totalDonationAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-panel rounded-lg">
              <span className="text-xs text-ink-soft">{t.a1_overviewRecords || 'Records'}</span>
              <span className="text-sm font-bold text-ink">{donations?.length || 0}</span>
            </div>
          </div>
        </div>)}

        {/* Booking Stats */}
        {showBookings && (<div role="button" tabIndex={0} onClick={() => navigate('/admin/bookings')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/bookings'); } }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#A80808]/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
          <h4 className="text-sm font-serif font-semibold text-ink mb-3 flex items-center gap-2">
            <ClipboardList size={16} className="text-brand-500" />
            {t.a1_overviewBookings || 'Bookings'}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-brand-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.a1_overviewTotal || 'Total'}</span>
              <span className="text-sm font-bold text-ink">{bookings?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.statusPending || 'Pending'}</span>
              <span className="text-sm font-bold text-yellow-600">{statusCounts.pending}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-xs text-ink-soft">{t.statusConfirmed || 'Confirmed'}</span>
              <span className="text-sm font-bold text-green-600">{statusCounts.confirmed}</span>
            </div>
          </div>
        </div>)}
      </div>
    </div>
  );
};

export default AdminOverview;