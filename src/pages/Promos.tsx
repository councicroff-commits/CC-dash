// src/pages/Promos.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Tag,
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Settings,
  Save,
  CheckCircle2,
  Percent,
} from 'lucide-react';

interface Coupon {
  id?: string;
  _id?: string;
  code: string;
  discount: number;
  type: string;
  minSpend?: number;
  description: string;
}

interface EventItem {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  event_type: string;
  discount_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  is_featured: boolean;
}

// 🔥 DYNAMIC PERMANENT FIX for Promos (Cleaned single slash)
const getApiBaseUrl = () => {
  return 'https://cc-backend-yc-team.onrender.com/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const extractErrorMessage = (data: any, fallback: string): string => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
  }
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return fallback;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { detail: text || 'Server error (Status ' + response.status + ')' };
  }
};

const Promos: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coupons' | 'events' | 'tax'>('coupons');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [taxRateInput, setTaxRateInput] = useState<string>('8');
  const [isSavingTax, setIsSavingTax] = useState<boolean>(false);
  const [taxSuccess, setTaxSuccess] = useState<string | null>(null);
  const [taxError, setTaxError] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'coupon' | 'event' | null;
    idOrCode: string;
    title: string;
  }>({
    isOpen: false,
    type: null,
    idOrCode: '',
    title: '',
  });

  const [couponForm, setCouponForm] = useState({
    code: '',
    discount: 10,
    type: 'percent',
    minSpend: 0,
    description: '',
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'sale',
    discount_amount: 100,
    start_date: '',
    end_date: '',
    status: 'upcoming',
    is_featured: false,
  });

  const [showCouponModal, setShowCouponModal] = useState<boolean>(false);
  const [showEventModal, setShowEventModal] = useState<boolean>(false);

  const getAuthHeaders = (includeAuth = true) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (includeAuth) {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }
    }
    return headers;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      if (activeTab === 'coupons') {
        const res = await fetch(API_BASE_URL + '/coupons', {
          method: 'GET',
          signal: controller.signal,
          headers: getAuthHeaders(false),
        });
        clearTimeout(timeoutId);
        const data = await parseResponse(res);
        if (res.ok) {
          const list = Array.isArray(data) ? data : data.coupons || data.data || [];
          setCoupons(list);
        } else {
          setError(extractErrorMessage(data, 'Failed to load coupons.'));
        }
      } else if (activeTab === 'events') {
        const res = await fetch(API_BASE_URL + '/events', {
          method: 'GET',
          signal: controller.signal,
          headers: getAuthHeaders(false),
        });
        clearTimeout(timeoutId);
        const data = await parseResponse(res);
        if (res.ok) {
          const list = Array.isArray(data) ? data : data.events || data.data || [];
          setEvents(list);
        } else {
          setError(extractErrorMessage(data, 'Failed to load events.'));
        }
      } else if (activeTab === 'tax') {
        const res = await fetch(API_BASE_URL + '/tax', {
          method: 'GET',
          signal: controller.signal,
          headers: getAuthHeaders(false),
        });
        clearTimeout(timeoutId);
        const data = await parseResponse(res);
        if (res.ok && typeof data.taxRate === 'number') {
          const percentage = data.taxRate <= 1 ? data.taxRate * 100 : data.taxRate;
          setTaxRateInput(String(percentage));
        } else if (!res.ok) {
          setError(extractErrorMessage(data, 'Failed to load tax settings.'));
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Connection timed out.');
      } else {
        setError('Failed to connect to the backend server.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(API_BASE_URL + '/coupons', {
        method: 'POST',
        signal: controller.signal,
        headers: getAuthHeaders(),
        body: JSON.stringify(couponForm),
      });
      clearTimeout(timeoutId);
      const data = await parseResponse(res);
      if (res.ok) {
        setShowCouponModal(false);
        setCouponForm({
          code: '',
          discount: 10,
          type: 'percent',
          minSpend: 0,
          description: '',
        });
        fetchData();
      } else {
        setError(extractErrorMessage(data, 'Failed to create coupon.'));
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') setError('Connection timed out.');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(API_BASE_URL + '/events', {
        method: 'POST',
        signal: controller.signal,
        headers: getAuthHeaders(),
        body: JSON.stringify(eventForm),
      });
      clearTimeout(timeoutId);
      const data = await parseResponse(res);
      if (res.ok) {
        setShowEventModal(false);
        setEventForm({
          title: '',
          description: '',
          event_type: 'sale',
          discount_amount: 100,
          start_date: '',
          end_date: '',
          status: 'upcoming',
          is_featured: false,
        });
        fetchData();
      } else {
        setError(extractErrorMessage(data, 'Failed to create event.'));
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') setError('Connection timed out.');
    }
  };

  const handleSaveTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTax(true);
    setTaxSuccess(null);
    setTaxError(null);

    const numericValue = parseFloat(taxRateInput);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      setTaxError('Please enter a valid percentage between 0 and 100.');
      setIsSavingTax(false);
      return;
    }

    const payloadRate = numericValue > 1 ? numericValue / 100 : numericValue;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(API_BASE_URL + '/tax', {
        method: 'PUT',
        signal: controller.signal,
        headers: getAuthHeaders(),
        body: JSON.stringify({ taxRate: payloadRate }),
      });
      clearTimeout(timeoutId);
      const data = await parseResponse(res);

      if (res.ok) {
        setTaxSuccess(
          'Tax rate updated successfully! Cart totals will now reflect this rate.'
        );
      } else {
        throw new Error(extractErrorMessage(data, 'Failed to save tax rate.'));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setTaxError('Connection timed out.');
      } else {
        setTaxError(err.message || 'An error occurred while saving.');
      }
    } finally {
      setIsSavingTax(false);
    }
  };

  const confirmDelete = async () => {
    const { type, idOrCode } = deleteModal;
    if (!type || !idOrCode) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      if (type === 'coupon') {
        const url = API_BASE_URL + '/coupons/' + encodeURIComponent(String(idOrCode));
        const res = await fetch(url, {
          method: 'DELETE',
          signal: controller.signal,
          headers: getAuthHeaders(),
        });
        clearTimeout(timeoutId);
        if (res.ok) fetchData();
      } else if (type === 'event') {
        const url = API_BASE_URL + '/events/' + encodeURIComponent(String(idOrCode));
        const res = await fetch(url, {
          method: 'DELETE',
          signal: controller.signal,
          headers: getAuthHeaders(),
        });
        clearTimeout(timeoutId);
        if (res.ok) fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteModal({ isOpen: false, type: null, idOrCode: '', title: '' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 bg-white text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-200 text-slate-700 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5 text-slate-600" /> Promotions & Events Command
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Promos & Campaign Manager
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage discount coupons, schedule storewide sales, and customize checkout tax
            settings.
          </p>
        </div>
        <div>
          {activeTab === 'coupons' && (
            <button
              onClick={() => setShowCouponModal(true)}
              className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Coupon
            </button>
          )}
          {activeTab === 'events' && (
            <button
              onClick={() => setShowEventModal(true)}
              className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Schedule Event
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('coupons')}
          className={
            'px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ' +
            (activeTab === 'coupons'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
          }
        >
          <Tag className="w-3.5 h-3.5" /> Discount Coupons ({coupons.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={
            'px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ' +
            (activeTab === 'events'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
          }
        >
          <Calendar className="w-3.5 h-3.5" /> Store Events & Sales ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={
            'px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ' +
            (activeTab === 'tax'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
          }
        >
          <Settings className="w-3.5 h-3.5" /> Tax Configuration
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading data...</div>
      ) : activeTab === 'coupons' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coupons.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
              No active discount coupons found. Create your first coupon to get started.
            </div>
          ) : (
            coupons.map((coupon, idx) => (
              <div
                key={coupon.id || coupon._id || idx}
                className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:border-slate-300 shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-900 font-mono font-bold text-xs tracking-wider border border-slate-200">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          type: 'coupon',
                          idOrCode: coupon.code,
                          title: 'Coupon (' + coupon.code + ')',
                        })
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {coupon.type === 'percent'
                      ? coupon.discount + '% OFF'
                      : '₱' + coupon.discount + ' OFF'}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">{coupon.description}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>
                    Min. Spend:{' '}
                    <strong className="text-slate-900">₱{coupon.minSpend || 0}</strong>
                  </span>
                  <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {coupon.type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'events' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
              No events scheduled. Create a flash sale or promotional campaign.
            </div>
          ) : (
            events.map((event, idx) => (
              <div
                key={event.id || event._id || idx}
                className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:border-slate-300 shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase tracking-wider border border-slate-200">
                        {event.event_type}
                      </span>
                      <span
                        className={
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ' +
                          (event.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : event.status === 'ended'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-amber-100 text-amber-800')
                        }
                      >
                        {event.status}
                      </span>
                      {event.is_featured && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase border border-indigo-200">
                          Featured
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          type: 'event',
                          idOrCode: event.id || event._id || '',
                          title: event.title,
                        })
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{event.title}</h3>
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <strong className="text-emerald-600 font-bold">
                      ₱{event.discount_amount || 0} OFF
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>From:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Until:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(event.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-900">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Tax Configuration
              </h2>
              <p className="text-xs text-slate-500 font-light">
                Customize the global tax rate applied across customer checkouts.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveTaxRate} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Global Tax Rate (%)
              </label>
              <div className="relative flex items-center max-w-xs">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 text-slate-900 text-sm font-medium px-4 py-3 rounded-xl outline-none transition-all pr-10"
                  placeholder="8"
                />
                <div className="absolute right-4 text-slate-400 pointer-events-none">
                  <Percent size={16} />
                </div>
              </div>
            </div>

            {taxError && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                <AlertCircle size={16} className="shrink-0" />
                <span>{taxError}</span>
              </div>
            )}

            {taxSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{taxSuccess}</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingTax}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Save size={16} />
                <span>{isSavingTax ? 'Saving Changes...' : 'Save Tax Setting'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create Discount Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER2026"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    required
                    value={couponForm.discount}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={couponForm.type}
                    onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (₱)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Minimum Spend (₱)
                </label>
                <input
                  type="number"
                  value={couponForm.minSpend}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      minSpend: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer special discount"
                  value={couponForm.description}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, description: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Schedule Store Event / Sale
            </h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-Year Flash Sale"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Event Type
                  </label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, event_type: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                  >
                    <option value="sale">Sale / Discount</option>
                    <option value="live_stream">Live Stream</option>
                    <option value="holiday">Holiday Campaign</option>
                    <option value="launch">Product Launch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Discount Amount (PHP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-bold">₱</span>
                    <input
                      type="number"
                      min="0"
                      value={eventForm.discount_amount}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          discount_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.is_featured}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, is_featured: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700 uppercase">
                      Featured Event
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.start_date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, start_date: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.end_date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, end_date: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Event details and rules..."
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete{' '}
                <strong className="text-slate-900">{deleteModal.title}</strong>? This action
                cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({ isOpen: false, type: null, idOrCode: '', title: '' })
                }
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promos;