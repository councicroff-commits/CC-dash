// src/context/OrderContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface OrderItem {
  id?: string;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
  category?: string;
}

export interface ShippingAddress {
  full_name: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  street?: string;
  barangay?: string;
  city: string;
  state?: string;
  region?: string;
  postal_code: string;
  zip_code?: string;
  country: string;
  landmark?: string;
}

export interface Order {
  _id?: string;
  id?: string;
  order_number?: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee?: number;
  tax?: number;
  total: number;
  total_amount?: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | string;
  payment_method?: string;
  shipping_address: ShippingAddress;
  notes?: string;
  estimated_delivery?: string;
  created_at?: string;
  date?: string;
  updated_at?: string;
}

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<Order>;
  updateOrderStatus: (id: string, status: string) => Promise<Order>;
  deleteOrder: (id: string) => Promise<void>;
}

const API_BASE_URL = 'https://cc-backend-production-00fe.up.railway.app/api/v1/orders';
 

let activeFetchPromise: Promise<any> | null = null;

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const parseResponse = async (response: Response) => {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || `Server error (Status ${response.status})` };
    }
  };

  const normalizeOrderData = (o: any): Order => {
    const rawShipping = o.shippingAddress || o.shipping_address || {};
    
    const mappedShipping: ShippingAddress = {
      full_name: rawShipping.full_name || o.shipping_full_name || o.customer_name || 'Unknown Customer',
      phone: rawShipping.phone || o.shipping_mobile_number || o.customer_phone || 'N/A',
      email: rawShipping.email || o.shipping_email || o.customer_email || 'N/A',
      address_line1: rawShipping.address_line1 || rawShipping.street || o.shipping_street || 'N/A',
      address_line2: rawShipping.address_line2 || o.shipping_barangay || o.shipping_landmark || '',
      street: o.shipping_street || rawShipping.street || '',
      barangay: o.shipping_barangay || rawShipping.barangay || '',
      city: rawShipping.city || rawShipping.city || 'N/A',
      state: rawShipping.state || rawShipping.region || o.shipping_region || 'N/A',
      region: o.shipping_region || rawShipping.region || '',
      postal_code: rawShipping.postal_code || rawShipping.zip_code || o.shipping_zip_code || 'N/A',
      zip_code: o.shipping_zip_code || rawShipping.zip_code || '',
      country: rawShipping.country || o.shipping_country || 'Philippines',
      landmark: o.shipping_landmark || rawShipping.landmark || ''
    };

    const orderId = o._id?.toString() || o._id || o.id || '';
    const numericTotal = Number(o.total ?? o.total_amount ?? 0);
    const numericSubtotal = Number(o.subtotal ?? o.total_amount ?? numericTotal);
    const orderDate = o.created_at || o.date || new Date().toISOString();

    return {
      ...o,
      id: orderId,
      _id: orderId,
      order_number: o.order_number || orderId.slice(-8).toUpperCase(),
      total: numericTotal,
      total_amount: numericTotal,
      subtotal: numericSubtotal,
      items: Array.isArray(o.items) ? o.items : [],
      customer_name: o.customer_name || o.shipping_full_name || mappedShipping.full_name,
      customer_email: o.customer_email || o.shipping_email || mappedShipping.email,
      customer_phone: o.customer_phone || o.shipping_mobile_number || mappedShipping.phone,
      status: (o.status || 'pending').toLowerCase(),
      payment_status: (o.payment_status || 'pending').toLowerCase(),
      payment_method: o.payment_method || 'cash_on_delivery',
      shipping_address: mappedShipping,
      created_at: orderDate,
      date: orderDate,
    };
  };

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!activeFetchPromise) {
        activeFetchPromise = fetch(API_BASE_URL, {
          headers: getAuthHeaders(),
        }).then(async (res) => {
          const data = await parseResponse(res);
          if (!res.ok) {
            throw new Error(data.detail || data.message || `Server returned status: ${res.status}`);
          }
          return data;
        });
      }

      const data = await activeFetchPromise;
      const list = Array.isArray(data) ? data : data.orders || data.data || [];
      const normalized = list.map(normalizeOrderData);

      setOrders(normalized);
    } catch (err: any) {
      console.error('[OrderContext] Fetch error details:', err);
      setError(err?.message || 'Failed to fetch orders.');
    } finally {
      activeFetchPromise = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchOrderById = async (id: string): Promise<Order> => {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
        headers: getAuthHeaders(),
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to fetch order details');
      }

      const rawOrder = data.order || data;
      const normalizedOrder = normalizeOrderData(rawOrder);

      setOrders((prev) => 
        prev.some((o) => o.id === id || o._id === id)
          ? prev.map((order) => (order.id === id || order._id === id ? normalizedOrder : order))
          : [normalizedOrder, ...prev]
      );

      return normalizedOrder;
    } catch (err: any) {
      console.error('[OrderContext] Failed to fetch single order:', err);
      throw err;
    }
  };

  const updateOrderStatus = async (id: string, status: string): Promise<Order> => {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const data = await parseResponse(response);
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to update order status');
      }

      const updatedRaw = data.order || data;
      const updatedOrder = normalizeOrderData(updatedRaw);

      setOrders((prev) => 
        prev.map((o) => (o.id === id || o._id === id ? { ...o, ...updatedOrder, status } : o))
      );
      
      return updatedOrder;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await parseResponse(response);
        throw new Error(data.detail || data.message || 'Failed to delete order');
      }

      setOrders((prev) => prev.filter((o) => o.id !== id && o._id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        isLoading,
        loading: isLoading,
        error,
        fetchOrders,
        fetchOrderById,
        updateOrderStatus,
        deleteOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within an OrderProvider');
  return context;
};

export default OrderProvider;
