import React, { useState, useEffect } from 'react';
import { 
  Users, Eye, Clock, TrendingUp, MapPin, Globe, 
  Monitor, Smartphone, Tablet,
  RefreshCw,
  Activity,
  X, ChevronRight, User
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../../components/common/OmLoader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

// How many rows the Recent Visitors table lists. GET /api/visitors/stats returns
// at most this many (visitorController.js), so the two stay in step.
const RECENT_VISITOR_LIMIT = 50;

const AdminVisitor = ({ t }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [timeRange, setTimeRange] = useState('7');

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when timeRange changes
  }, [timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/visitors/stats?days=${timeRange}`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
      showToast(t.a1_visitorStatsLoadFailed || 'Failed to load visitor stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (visitorId) => {
    try {
      const response = await api.get(`/visitors/${visitorId}`);
      setSelectedVisitor(response.data.data);
      setShowModal(true);
    } catch (error) {
      console.error('Get visitor details error:', error);
      showToast(t.a1_visitorDetailsLoadFailed || 'Failed to load visitor details', 'error');
    }
  };

  const deviceLabel = (device) => {
    const labels = {
      desktop: t.a1_visitorDesktop || 'Desktop',
      mobile: t.a1_visitorMobile || 'Mobile',
      tablet: t.a1_visitorTablet || 'Tablet',
    };
    return labels[String(device || '').toLowerCase()] || device;
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <OmLoader size="lg" color="maroon" className="mx-auto mb-4" />
          <p className="text-ink-soft">{t.a1_visitorLoadingAnalytics || 'Loading visitor analytics...'}</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const barData = stats?.dailyStats || [];
  const deviceData = Object.entries(stats?.deviceStats || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
  const browserData = Object.entries(stats?.browserStats || {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-ink">{t.a1_visitorAnalytics || 'Visitor Analytics'}</h2>
          <p className="text-sm text-ink-soft">{t.a1_visitorSubtitle || 'Real-time visitor tracking and insights'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {['7', '14', '30', '90'].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  timeRange === days 
                    ? 'bg-white text-[#A80808] shadow-sm' 
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {(t.a1_visitorDaysShort || '{days}d').replace('{days}', days)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchStats}
            aria-label={t.a1_visitorRefresh || 'Refresh'}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={18} className="text-ink-soft" />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t.a1_visitorTotalVisitors || 'Total Visitors'}</p>
              <p className="text-2xl font-bold text-ink">{stats?.totalVisitors || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Users size={18} className="text-brand-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t.today || 'Today'}</p>
              <p className="text-2xl font-bold text-ink">{stats?.todayVisitors || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Activity size={18} className="text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t.a1_visitorUnique || 'Unique'}</p>
              <p className="text-2xl font-bold text-ink">{stats?.uniqueVisitors || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Globe size={18} className="text-brand-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t.a1_visitorPageViews || 'Page Views'}</p>
              <p className="text-2xl font-bold text-ink">{stats?.totalPageViews || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Eye size={18} className="text-amber-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t.a1_visitorAvgTime || 'Avg Time'}</p>
              <p className="text-2xl font-bold text-ink">{(t.a1_visitorSecondsShort || '{n}s').replace('{n}', stats?.avgTimeSpent || 0)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Clock size={18} className="text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t.a1_visitorBounceRate || 'Bounce Rate'}</p>
              <p className="text-2xl font-bold text-ink">{stats?.bounceRate || 0}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-brand-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Visitors Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="text-sm font-serif font-semibold text-ink mb-4">{t.a1_visitorDailyVisitors || 'Daily Visitors'}</h4>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="count" fill="#A80808" radius={[4, 4, 0, 0]} name={t.a1_visitorVisitors || 'Visitors'} />
                <Bar dataKey="uniqueIPs" fill="#E2DBD8" radius={[4, 4, 0, 0]} name={t.a1_visitorUniqueIPs || 'Unique IPs'} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-ink-soft">
              {t.a1_visitorNoData || 'No data available'}
            </div>
          )}
        </div>

        {/* Page Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="text-sm font-serif font-semibold text-ink mb-4">{t.a1_visitorTopPages || 'Top Pages'}</h4>
          {stats?.pageStats?.length > 0 ? (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {stats.pageStats.slice(0, 8).map((page, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-6">{index + 1}</span>
                    <span className="text-sm text-ink-soft truncate">{page.page || '/'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-soft">{(t.a1_visitorViewsCount || '{count} views').replace('{count}', page.count)}</span>
                    <span className="text-xs text-ink-soft">{(t.a1_visitorUniqueCount || '{count} unique').replace('{count}', page.uniqueVisitors)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-ink-soft">
              {t.a1_visitorNoData || 'No data available'}
            </div>
          )}
        </div>
      </div>

      {/* Devices & Browsers */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Device Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="text-sm font-serif font-semibold text-ink mb-4 flex items-center gap-2">
            <Monitor size={16} className="text-ink-soft" />
            {t.a1_visitorDevices || 'Devices'}
          </h4>
          {deviceData.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {deviceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  {item.name === 'Desktop' && <Monitor size={14} className="text-gray-600" />}
                  {item.name === 'Mobile' && <Smartphone size={14} className="text-gray-600" />}
                  {item.name === 'Tablet' && <Tablet size={14} className="text-gray-600" />}
                  <span className="text-sm font-medium">{deviceLabel(item.name)}</span>
                  <span className="text-xs text-ink-soft">{(t.a1_visitorViewsCount || '{count} views').replace('{count}', item.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-soft text-sm">{t.a1_visitorNoDeviceData || 'No device data available'}</p>
          )}
        </div>

        {/* Browser Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="text-sm font-serif font-semibold text-ink mb-4 flex items-center gap-2">
            <Globe size={16} className="text-ink-soft" />
            {t.a1_visitorBrowsers || 'Browsers'}
          </h4>
          {browserData.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {browserData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-ink-soft">{(t.a1_visitorViewsCount || '{count} views').replace('{count}', item.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-soft text-sm">{t.a1_visitorNoBrowserData || 'No browser data available'}</p>
          )}
        </div>
      </div>

      {/* Location Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h4 className="text-sm font-serif font-semibold text-ink mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-ink-soft" />
          {t.a1_visitorLocations || 'Visitor Locations'}
        </h4>
        {stats?.locationStats?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.locationStats.slice(0, 8).map((location, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#A80808]/10 flex items-center justify-center">
                    <MapPin size={14} className="text-[#A80808]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-ink">{location.country}</p>
                    {location.city && <p className="text-xs text-ink-soft">{location.city}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-ink-soft">
                  <span>{(t.a1_visitorVisitsCount || '{count} visits').replace('{count}', location.count)}</span>
                  <span>•</span>
                  <span>{(t.a1_visitorVisitorsCount || '{count} visitors').replace('{count}', location.uniqueVisitors)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink-soft text-sm">{t.a1_visitorNoLocationData || 'No location data available'}</p>
        )}
      </div>

      {/* Recent Visitors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-serif font-semibold text-ink flex items-center gap-2">
            <Activity size={16} className="text-[#A80808]" />
            {t.a1_visitorRecentVisitors || 'Recent Visitors'}
          </h4>
          <span className="text-xs text-ink-soft">{(t.a1_visitorVisitorsCount || '{count} visitors').replace('{count}', stats?.recentVisitors?.length || 0)}</span>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{t.a1_visitorVisitor || 'Visitor'}</th>
                <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{t.a1_visitorPage || 'Page'}</th>
                <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">{t.a1_visitorLocation || 'Location'}</th>
                <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">{t.a1_visitorDevice || 'Device'}</th>
                <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{t.a1_visitorTime || 'Time'}</th>
                <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-right">{t.a1_visitorAction || 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {/*
                The API already returns only the newest 50 visitors, so they are
                all listed. This used to cut the list to 20 while the heading
                counted the full 50, which read as missing rows.
              */}
              {stats?.recentVisitors?.slice(0, RECENT_VISITOR_LIMIT).map((visitor) => (
                <tr key={visitor._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#A80808]/10 flex items-center justify-center">
                        <User size={14} className="text-[#A80808]" />
                      </div>
                      <div>
                        <p className="font-medium text-ink text-sm">
                          {visitor.userName || visitor.user?.name || t.a1_visitorGuest || 'Guest'}
                        </p>
                        <p className="text-xs text-ink-soft">{visitor.ipAddress}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 hidden md:table-cell">
                    <span className="text-xs text-ink-soft">{visitor.pageTitle || visitor.page}</span>
                  </td>
                  <td className="py-3 hidden lg:table-cell">
                    <span className="text-xs text-ink-soft">
                      {visitor.location?.country || t.a1_visitorUnknown || 'Unknown'}
                      {visitor.location?.city ? `, ${visitor.location.city}` : ''}
                    </span>
                  </td>
                  <td className="py-3 hidden sm:table-cell">
                    <span className="text-xs text-ink-soft capitalize">{deviceLabel(visitor.deviceType)}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-ink-soft">
                      {new Date(visitor.date).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleViewDetails(visitor._id)}
                      aria-label={t.a1_visitorViewDetails || 'View details'}
                      className="p-1.5 rounded-lg text-ink-soft hover:text-[#A80808] hover:bg-[#A80808]/10 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visitor Details Modal */}
      {showModal && selectedVisitor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-[#A80808] flex items-center gap-2">
                <User size={18} />
                {t.a1_visitorVisitorDetails || 'Visitor Details'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedVisitor(null);
                }}
                aria-label={t.close || 'Close'}
                className="p-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.a1_visitorVisitor || 'Visitor'}</p>
                  <p className="font-semibold text-ink">{selectedVisitor.userName || t.a1_visitorGuest || 'Guest'}</p>
                  <p className="text-sm text-ink-soft">{selectedVisitor.ipAddress}</p>
                  {selectedVisitor.userId && (
                    <p className="text-xs text-ink-soft">{(t.a1_visitorUserLabel || 'User: {name}').replace('{name}', selectedVisitor.userId?.name || t.a1_visitorUnknown || 'Unknown')}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.a1_visitorLocation || 'Location'}</p>
                  <p className="font-semibold text-ink">
                    {selectedVisitor.location?.country || t.a1_visitorUnknown || 'Unknown'}
                  </p>
                  {selectedVisitor.location?.city && (
                    <p className="text-sm text-ink-soft">{selectedVisitor.location.city}</p>
                  )}
                  {selectedVisitor.location?.region && (
                    <p className="text-xs text-ink-soft">{(t.a1_visitorRegion || 'Region: {region}').replace('{region}', selectedVisitor.location.region)}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.a1_visitorDeviceBrowser || 'Device & Browser'}</p>
                  <p className="font-semibold text-ink capitalize">{deviceLabel(selectedVisitor.deviceType)}</p>
                  <p className="text-sm text-ink-soft">{selectedVisitor.browser} • {selectedVisitor.os}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.a1_visitorVisitDetails || 'Visit Details'}</p>
                  <p className="font-semibold text-ink">{(t.a1_visitorVisitsCount || '{count} visits').replace('{count}', selectedVisitor.visitCount || 1)}</p>
                  <p className="text-sm text-ink-soft">
                    {new Date(selectedVisitor.date).toLocaleString()}
                  </p>
                  {selectedVisitor.timeSpent > 0 && (
                    <p className="text-xs text-ink-soft">{(t.a1_visitorTimeSpent || 'Time spent: {n}s').replace('{n}', selectedVisitor.timeSpent)}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">{t.a1_visitorPageDetails || 'Page Details'}</p>
                <p className="font-semibold text-ink">{selectedVisitor.pageTitle || selectedVisitor.page}</p>
                <p className="text-sm text-ink-soft">URL: {selectedVisitor.page}</p>
                {selectedVisitor.entryPage && (
                  <p className="text-xs text-ink-soft">{(t.a1_visitorEntry || 'Entry: {page}').replace('{page}', selectedVisitor.entryPage)}</p>
                )}
                {selectedVisitor.exitPage && (
                  <p className="text-xs text-ink-soft">{(t.a1_visitorExit || 'Exit: {page}').replace('{page}', selectedVisitor.exitPage)}</p>
                )}
                {selectedVisitor.referrer && (
                  <p className="text-xs text-ink-soft">{(t.a1_visitorReferrer || 'Referrer: {url}').replace('{url}', selectedVisitor.referrer)}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedVisitor(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  {t.close || 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVisitor;