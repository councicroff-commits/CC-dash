import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../context/OrderContext';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

// Same API base URL as OrderDetails
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

const OrderList: React.FC = () => {
  const { deleteOrder } = useOrders(); // still use context only for delete (or you can replace this too)
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // Direct API fetch — same style as OrderDetails
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setContextError(null);
    setErrorMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `${API_BASE_URL}/orders`;
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: getAuthHeaders(),
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to load orders'));
      }

      // Handle different possible response shapes
      const list = Array.isArray(data)
        ? data
        : data.orders || data.data || data.results || [];

      setOrders(list);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setContextError('Connection timed out while loading orders.');
      } else {
        setContextError(err?.message || 'Failed to load orders from server');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    const s = search.toLowerCase();

    const matchesSearch =
      !s ||
      (order.order_number || '').toLowerCase().includes(s) ||
      (order.customer_name || '').toLowerCase().includes(s) ||
      (order.customer_email || '').toLowerCase().includes(s);

    const safeStatus = (order.status || 'pending').toLowerCase();
    const matchesStatus = statusFilter === 'all' || safeStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // You can also replace this with a direct API call if you want
      await deleteOrder(id);
      setSuccessMsg('Order successfully deleted.');
      setConfirmDeleteId(null);
      // Refresh list after delete
      await fetchOrders();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete order.');
      setConfirmDeleteId(null);
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Manage and track all customer orders
          </p>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-sm shadow-sm"
        >
          Refresh
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-xl text-sm font-bold shadow-sm">
          {successMsg}
        </div>
      )}
      {(errorMsg || contextError) && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl text-sm font-bold shadow-sm">
          {errorMsg || contextError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by order #, name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-bold shadow-sm cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm font-semibold">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const currentId = order.id || order._id || '';
                  const isConfirming = confirmDeleteId === currentId;
                  const orderDate = order.created_at || (order as any).date;

                  return (
                    <tr
                      key={currentId}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => navigate(`/dashboard/orders/${currentId}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-black text-indigo-600">
                          #{order.order_number || currentId.slice(-8).toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {order.items?.length || 0} item(s)
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">
                          {order.customer_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {order.customer_email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {orderDate ? new Date(orderDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                        ₱{Number(order.total || order.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            statusColors[(order.status || '').toLowerCase()] ||
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                          {order.payment_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/orders/${currentId}`);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 font-bold mr-3"
                        >
                          View
                        </button>
                        {isConfirming ? (
                          <span
                            className="inline-flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDelete(currentId)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition shadow-sm"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(currentId);
                            }}
                            className="text-red-600 hover:text-red-900 font-bold"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderList;