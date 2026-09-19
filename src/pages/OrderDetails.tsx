import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../context/OrderContext';
import type { Order } from '../context/OrderContext';

const defaultStatusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const getApiBaseUrl = () => {
  return 'https://cc-backend-production-00fe.up.railway.app/api/v1';
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

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, fetchOrderById, updateOrderStatus } = useOrders();

  const cachedOrder = orders.find((o) => o.id === id || o._id === id);

  const [order, setOrder] = useState<Order | null>(cachedOrder || null);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(!cachedOrder);
  const [updating, setUpdating] = useState<boolean>(false);
  const [savingDelivery, setSavingDelivery] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState<string>('');

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }
    return headers;
  };

  useEffect(() => {
    if (order) {
      if ((order as any).estimated_delivery !== undefined) {
        setEstimatedDelivery((order as any).estimated_delivery || '');
      }
      if ((order as any).notes !== undefined) {
        setDeliveryNote((order as any).notes || '');
      } else if ((order as any).delivery_note !== undefined) {
        setDeliveryNote((order as any).delivery_note || '');
      }
    }
  }, [order?._id, order?.id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadOrderData = async () => {
      if (!cachedOrder) setLoading(true);
      setError(null);

      try {
        const data = await fetchOrderById(id);
        if (isMounted && data) {
          setOrder(data);
          if ((data as any).estimated_delivery) {
            setEstimatedDelivery((data as any).estimated_delivery);
          }
          if ((data as any).notes || (data as any).delivery_note) {
            setDeliveryNote((data as any).notes || (data as any).delivery_note);
          }
        }
      } catch (err: any) {
        if (isMounted && !cachedOrder) {
          setError(err?.message || 'Failed to load order from database');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOrderData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const userId = order?.user_id || (order as any)?.userId;
    if (!userId || userId === 'guest') return;

    let isMounted = true;

    const fetchRegisteredUser = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const url = API_BASE_URL + '/users/' + encodeURIComponent(String(userId));
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: getAuthHeaders(),
        });
        clearTimeout(timeoutId);

        const userData = await parseResponse(res);
        if (res.ok && isMounted) {
          setRegisteredUser(userData.user || userData);
        }
      } catch (err) {
        // Silently ignore
      }
    };

    fetchRegisteredUser();

    return () => {
      isMounted = false;
    };
  }, [order?.user_id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order || !id) return;
    setUpdating(true);
    setError(null);
    setSuccessMsg(null);

    const previousOrderState = order;
    setOrder({ ...order, status: newStatus });

    try {
      if (updateOrderStatus) {
        const updated = await updateOrderStatus(id, newStatus);
        if (updated) setOrder(updated);
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const url = API_BASE_URL + '/orders/' + encodeURIComponent(String(id)) + '/status';
        const res = await fetch(url, {
          method: 'PATCH', // Ensures compatibility with backend
          signal: controller.signal,
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: newStatus }),
        });
        clearTimeout(timeoutId);

        const resData = await parseResponse(res);
        if (!res.ok) {
          throw new Error(extractErrorMessage(resData, 'Failed to update status on server'));
        }
        setOrder(resData.order || resData);
      }
      setSuccessMsg('Status updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setOrder(previousOrderState);
      setError(err?.message || 'Failed to update status in database');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveDeliveryInfo = useCallback(async () => {
    const targetId = order?._id || order?.id || id;
    if (!targetId || targetId === 'undefined' || !order) {
      setError('Invalid order ID. Cannot save delivery updates.');
      return;
    }

    setSavingDelivery(true);
    setError(null);
    setSuccessMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = API_BASE_URL + '/orders/' + encodeURIComponent(String(targetId));
      const response = await fetch(url, {
        method: 'PUT',
        signal: controller.signal,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          estimated_delivery: estimatedDelivery,
          notes: deliveryNote,
        }),
      });
      clearTimeout(timeoutId);

      const updatedData = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(updatedData, 'Failed to update delivery information')
        );
      }

      const newOrder = updatedData.order || updatedData;
      setOrder(newOrder);
      setSuccessMsg('Delivery details updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Connection timed out.');
      } else {
        setError(err?.message || 'Failed to save delivery updates');
      }
    } finally {
      setSavingDelivery(false);
    }
  }, [order, id, estimatedDelivery, deliveryNote]);

  if (loading && !order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg font-medium">{error}</div>
        <button
          onClick={() => navigate('/dashboard/orders')}
          className="mt-4 text-indigo-600 hover:underline font-bold text-sm"
        >
          ← Back to Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg font-medium">
          Order not found.
        </div>
        <button
          onClick={() => navigate('/dashboard/orders')}
          className="mt-4 text-indigo-600 hover:underline font-bold text-sm"
        >
          ← Back to Orders
        </button>
      </div>
    );
  }

  const currentStatus = (order.status || 'pending').toLowerCase();
  const statusOptions = defaultStatusOptions.includes(currentStatus)
    ? defaultStatusOptions
    : [...defaultStatusOptions, currentStatus];

  const orderDate = (order as any).date || order.created_at;

  // 🔥 FIX: Added deep fallbacks to ensure information displays regardless of structure
  const checkoutName =
    order.customer_name ||
    (order as any).shipping_full_name ||
    order.shipping_address?.full_name ||
    (order as any).shippingAddress?.fullName ||
    (order as any).shippingAddress?.full_name ||
    'N/A';

  const checkoutEmail =
    order.customer_email || 
    (order as any).shipping_email || 
    'N/A';

  const checkoutPhone =
    order.customer_phone ||
    (order as any).shipping_mobile_number ||
    order.shipping_address?.phone ||
    (order as any).shippingAddress?.mobileNumber ||
    'N/A';

  const shippingStreet =
    order.shipping_address?.address_line1 || 
    (order as any).shipping_street || 
    (order as any).shippingAddress?.street || 
    '';

  const shippingBarangay =
    order.shipping_address?.address_line2 || 
    (order as any).shipping_barangay || 
    (order as any).shippingAddress?.barangay || 
    '';

  const shippingCity =
    order.shipping_address?.city || 
    (order as any).shipping_city || 
    (order as any).shippingAddress?.city || 
    '';

  const shippingRegion =
    order.shipping_address?.state || 
    (order as any).shipping_region || 
    (order as any).shippingAddress?.region || 
    '';

  const shippingZip =
    order.shipping_address?.postal_code || 
    (order as any).shipping_zip_code || 
    (order as any).shippingAddress?.zipCode || 
    '';

  const shippingCountry =
    order.shipping_address?.country || 
    (order as any).shipping_country ||
    (order as any).shippingAddress?.country ||
    'Philippines';

  const shippingLandmark =
    (order as any).shipping_landmark || 
    (order as any).shippingAddress?.landmark || 
    '';

  const regName =
    registeredUser?.name ||
    registeredUser?.full_name ||
    registeredUser?.username ||
    (order.user_id === 'guest' ? 'Guest Checkout' : 'Not Found');
  const regEmail = registeredUser?.email || checkoutEmail;
  const regPhone =
    registeredUser?.phone || registeredUser?.mobile_number || checkoutPhone;

  const totalAmount = (order as any).total_amount ?? order.total ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard/orders')}
            className="text-sm font-bold text-indigo-600 hover:underline mb-2 inline-block"
          >
            ← Back to Orders
          </button>
          <h1 className="text-2xl font-black text-gray-900">
            Order #
            {order.order_number ||
              (order._id || order.id || '').slice(-6).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Placed on{' '}
            {orderDate
              ? new Date(orderDate).toLocaleString('en-PH', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })
              : 'Recently'}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Order Status:
          </label>
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updating}
            className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 capitalize font-bold text-gray-900 bg-gray-50 text-sm"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl shadow-sm text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-50 via-white to-blue-50 border border-indigo-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-indigo-950 flex items-center gap-2">
            🚚 Delivery & Tracking Updates
          </h2>
          {successMsg && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full animate-fade-in">
              {successMsg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-indigo-900 tracking-wider mb-1.5">
              Estimated Delivery Date / Time
            </label>
            <input
              type="text"
              placeholder="e.g. August 7-8 or Aug 16, 2026"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-indigo-900 tracking-wider mb-1.5">
              Status Description / Admin Note
            </label>
            <input
              type="text"
              placeholder="e.g. Arrived in hub or Out for delivery"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900 shadow-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveDeliveryInfo}
            disabled={savingDelivery}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            {savingDelivery ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving Updates...
              </>
            ) : (
              'Save Delivery Details'
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider">
                Order Items ({order.items?.length || 0})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="px-6 py-4 flex items-center gap-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-20 object-cover rounded-xl border border-gray-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-20 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs border">
                      No img
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500 font-medium mt-1">
                      Qty: {item.quantity} × ₱{Number(item.price).toLocaleString()}
                    </div>
                  </div>
                  <div className="font-black text-gray-900 text-base">
                    ₱{(item.quantity * item.price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between font-medium text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">
                  ₱{Number(order.subtotal || totalAmount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-base font-black pt-3 border-t border-gray-100">
                <span>Total Amount</span>
                <span className="text-indigo-600">
                  ₱{Number(totalAmount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-3 flex items-center gap-1.5">
              👤 Registered User Account
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                  Account Name
                </span>
                <p className="font-bold text-gray-900">{regName}</p>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                  Account Email
                </span>
                <p className="font-medium text-gray-800">{regEmail}</p>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                  Account Phone
                </span>
                <p className="font-medium text-gray-800">{regPhone}</p>
              </div>
              <div className="pt-2">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                  User ID (MongoDB Reference)
                </span>
                <p className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-0.5 break-all">
                  {order.user_id || (order as any).userId || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-3">
              📦 Checkout Shipping Info
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                  Recipient Name
                </span>
                <p className="font-bold text-gray-900">{checkoutName}</p>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                  Shipping Email
                </span>
                <p className="font-medium text-gray-800">{checkoutEmail}</p>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                  Shipping Phone
                </span>
                <p className="font-medium text-gray-800">{checkoutPhone}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-3">
              Delivery Address
            </h2>
            <div className="text-sm space-y-1.5 text-gray-800 font-medium">
              <p className="font-bold text-gray-900">{shippingStreet}</p>
              {shippingBarangay && <p>Brgy. {shippingBarangay}</p>}
              <p>
                {shippingCity}
                {shippingRegion ? ', ' + shippingRegion : ''} {shippingZip}
              </p>
              <p className="text-gray-600">{shippingCountry}</p>
              {shippingLandmark && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-900">
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-700">
                    📍 Landmark
                  </span>
                  "{shippingLandmark}"
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-3">
              Payment Info
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium text-xs">Method</span>
                <span className="font-bold uppercase text-gray-900 text-xs bg-gray-100 px-2.5 py-1 rounded-md">
                  {order.payment_method
                    ? String(order.payment_method).replace(/_/g, ' ')
                    : 'Cash on Delivery'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium text-xs">Payment Status</span>
                <span
                  className={
                    'font-extrabold uppercase text-[10px] px-2.5 py-1 rounded-md border ' +
                    ((order.payment_status || '').toLowerCase() === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200')
                  }
                >
                  {order.payment_status || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
