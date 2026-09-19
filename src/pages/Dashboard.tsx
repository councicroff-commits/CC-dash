// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';

// 🔥 DYNAMIC PERMANENT FIX for Dashboard (Cleaned single slash)
const getApiBaseUrl = () => {
  return 'https://cc-backend-production-00fe.up.railway.app/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const MONTHLY_REVENUE_TARGET = 50000;

const CHART_COLORS = ['#1e1b4b', '#10b981', '#8b5cf6', '#e5e7eb', '#f59e0b', '#3b82f6'];

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

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({ sales: 0, orders: 0, revenue: 0, customers: 0 });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [targetProgress, setTargetProgress] = useState(0);

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

  const fetchLiveData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      const [ordersRes, productsRes, usersRes] = await Promise.all([
        fetch(API_BASE_URL + '/orders', {
          method: 'GET',
          signal: controller.signal,
          headers,
        }),
        fetch(API_BASE_URL + '/products', {
          method: 'GET',
          signal: controller.signal,
          headers,
        }),
        fetch(API_BASE_URL + '/analytics/users', {
          method: 'GET',
          signal: controller.signal,
          headers,
        }),
      ]);
      clearTimeout(timeoutId);

      const ordersJson = await parseResponse(ordersRes);
      const productsJson = await parseResponse(productsRes);
      const usersJson = await parseResponse(usersRes);

      if (!ordersRes.ok || !productsRes.ok || !usersRes.ok) {
        const msg =
          extractErrorMessage(ordersJson, '') ||
          extractErrorMessage(productsJson, '') ||
          extractErrorMessage(usersJson, '') ||
          'One or more API endpoints failed to respond.';
        throw new Error(msg);
      }

      const activeOrders: any[] = Array.isArray(ordersJson)
        ? ordersJson
        : ordersJson.orders || ordersJson.data || [];
      const activeProducts: any[] = Array.isArray(productsJson)
        ? productsJson
        : productsJson.products || productsJson.data || [];
      const activeUsers: any[] = Array.isArray(usersJson)
        ? usersJson
        : usersJson.users || usersJson.data || [];

      // CORE STATS
      const totalRevenue = activeOrders.reduce((sum, order) => {
        const amount = parseFloat(
          order.totalAmount ?? order.amount ?? order.total ?? order.total_amount ?? 0
        );
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      setStats({
        sales: totalRevenue,
        orders: activeOrders.length,
        revenue: totalRevenue,
        customers: activeUsers.length,
      });

      // MONTHLY TARGET
      const progress = Math.min((totalRevenue / MONTHLY_REVENUE_TARGET) * 100, 100);
      setTargetProgress(progress);

      // REVENUE BY DAY
      if (activeOrders.length > 0) {
        const groupedDates: Record<string, number> = {};
        activeOrders.forEach((o) => {
          const rawDate = o.createdAt || o.created_at || o.date || new Date().toISOString();
          const date = String(rawDate).split('T')[0];
          const amount = parseFloat(
            o.totalAmount ?? o.amount ?? o.total ?? o.total_amount ?? 0
          );
          groupedDates[date] = (groupedDates[date] || 0) + (isNaN(amount) ? 0 : amount);
        });

        const sortedDates = Object.keys(groupedDates).sort();
        const formattedChart = sortedDates.slice(-6).map((date) => ({
          name: date.slice(5),
          current: groupedDates[date],
        }));
        setRevenueData(formattedChart);
      } else {
        setRevenueData([]);
      }

      // TOP PRODUCTS
      const productSales: Record<string, any> = {};
      activeOrders.forEach((order) => {
        const items = order.items || order.orderItems || order.products || [];
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const id = item.productId || item.product_id || item.id || item.name;
            const name = item.name || item.productName || 'Unknown';
            const qty = parseInt(item.quantity || item.qty || 1, 10);
            const price = parseFloat(item.price || item.unitPrice || 0);

            if (!productSales[id]) {
              productSales[id] = {
                name,
                qty: 0,
                revenue: 0,
                price,
                category: item.category,
              };
            }
            productSales[id].qty += qty;
            productSales[id].revenue += qty * price;
          });
        }
      });

      const rankedProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((p: any) => ({
          name: p.name,
          price: p.price,
          category: p.category || 'General',
          stock: p.qty,
          amount: p.revenue,
        }));
      setTopProducts(rankedProducts);

      // SALES BY LOCATION
      const citySales: Record<string, number> = {};
      activeOrders.forEach((order) => {
        const city =
          order.shippingAddress?.city ||
          order.shipping_city ||
          order.city ||
          'Unspecified';
        const amount = parseFloat(
          order.totalAmount ?? order.amount ?? order.total ?? order.total_amount ?? 0
        );
        citySales[city] = (citySales[city] || 0) + (isNaN(amount) ? 0 : amount);
      });

      const rankedCities = Object.entries(citySales)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 4)
        .map(([city, amount]) => ({
          city,
          value: amount as number,
          percent: totalRevenue > 0 ? ((amount as number) / totalRevenue) * 100 : 0,
        }));
      setLocationData(rankedCities);

      // SALES CHANNELS
      const channelSales: Record<string, number> = {};
      activeOrders.forEach((order) => {
        const channel = order.channel || order.source || order.payment_method || 'Direct';
        const amount = parseFloat(
          order.totalAmount ?? order.amount ?? order.total ?? order.total_amount ?? 0
        );
        channelSales[channel] = (channelSales[channel] || 0) + (isNaN(amount) ? 0 : amount);
      });

      const formattedChannels = Object.entries(channelSales)
        .map(([name, amount], index) => ({
          name,
          value: amount as number,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);
      setChannelData(formattedChannels);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Connection timed out. Please try again.');
      } else {
        console.error('Dashboard Sync Error:', err);
        setError(err.message || 'Failed to load live data');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 60_000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  if (loading) {
    return (
      <div className="p-8 text-gray-500 font-medium">Loading live report analysis…</div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500 font-medium flex items-center gap-4">
        {error}
        <button
          onClick={fetchLiveData}
          className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f8f9fb] min-h-screen text-gray-800 font-sans space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Report Analysis</h1>
        <button
          onClick={fetchLiveData}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Refresh Live Data
        </button>
      </div>

      {/* TOP STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Sales"
          value={'₱' + stats.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          trend="+0%"
          isPositive
        />
        <StatCard
          title="Total Orders"
          value={stats.orders.toLocaleString()}
          trend="Live"
          isPositive
        />
        <StatCard
          title="Total Revenue"
          value={'₱' + stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          trend="+0%"
          isPositive
        />
        <StatCard
          title="Total Customers"
          value={stats.customers.toLocaleString()}
          trend="Live"
          isPositive
        />
      </div>

      {/* MIDDLE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-800">Revenue Timeline</h2>
            <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Real-time
              </span>
            </div>
          </div>
          <div className="h-[250px] w-full">
            {revenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No order data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(val) => '₱' + val / 1000 + 'K'}
                    dx={-10}
                  />
                  <Tooltip formatter={(value: number) => '₱' + value.toLocaleString()} />
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Sales By Location</h2>
          <div className="space-y-4 mt-6">
            {locationData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">No location data available</p>
            ) : (
              locationData.map((loc, i) => (
                <LocationBar
                  key={i}
                  city={loc.city}
                  value={'₱' + loc.value.toLocaleString()}
                  percent={loc.percent}
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">Sales Channels</h2>
          <div className="h-[140px] relative">
            {channelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No channel data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={'cell-' + index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            {channelData.length > 0 && stats.revenue > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold bg-indigo-950 text-white px-2 py-0.5 rounded-md">
                  {((channelData[0].value / stats.revenue) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2 overflow-y-auto max-h-[100px]">
            {channelData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-500">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  {item.name}
                </span>
                <span className="font-medium text-gray-700">
                  ₱{item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Top Selling Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-50 bg-gray-50/30">
                  <th className="p-4 font-medium">Product Name</th>
                  <th className="p-4 font-medium">Unit Price</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Total Sold</th>
                  <th className="p-4 font-medium">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      No products sold yet.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((prod, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {prod.name?.substring(0, 2).toUpperCase() || 'NA'}
                        </div>
                        <span className="font-medium text-gray-700">{prod.name}</span>
                      </td>
                      <td className="p-4 text-gray-600">
                        ₱{Number(prod.price || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-gray-500 text-xs">{prod.category}</td>
                      <td className="p-4 text-gray-600 font-medium">{prod.stock} units</td>
                      <td className="p-4 font-semibold text-emerald-600">
                        ₱{Number(prod.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center">
          <h2 className="font-semibold text-gray-800 mb-2">Monthly Target</h2>
          <p className="text-xs text-gray-400 mb-6">
            Goal: ₱{MONTHLY_REVENUE_TARGET.toLocaleString()}
          </p>

          <div className="relative h-32 w-full flex justify-center items-end overflow-hidden mb-6">
            <ResponsiveContainer width="100%" height="200%">
              <PieChart>
                <Pie
                  data={[
                    { value: targetProgress },
                    { value: Math.max(100 - targetProgress, 0) },
                  ]}
                  startAngle={180}
                  endAngle={0}
                  innerRadius={70}
                  outerRadius={85}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#7c3aed" />
                  <Cell fill="#f3f4f6" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-4 flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-800">
                {targetProgress.toFixed(1)}%
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-6">
            You have earned ₱{stats.revenue.toLocaleString()} so far this period.
          </p>

          <div className="flex justify-between items-center px-4 bg-gray-50 py-3 rounded-lg">
            <div className="text-left">
              <p className="text-xs text-gray-400 mb-1">Target</p>
              <p className="text-sm font-semibold text-gray-800">
                ₱{(MONTHLY_REVENUE_TARGET / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 mb-1">Revenue</p>
              <p className="text-sm font-semibold text-emerald-600">
                ₱{(stats.revenue / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 mb-1">Orders</p>
              <p className="text-sm font-semibold text-gray-800">{stats.orders}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  trend,
  isPositive,
}: {
  title: string;
  value: string | number;
  trend: string;
  isPositive: boolean;
}) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative">
    <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
      <MoreHorizontal size={16} />
    </button>
    <p className="text-sm text-gray-500 mb-2">{title}</p>
    <p className="text-2xl font-bold text-gray-900 mb-3">{value}</p>
    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
      <span
        className={
          'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ' +
          (isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')
        }
      >
        {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {trend}
      </span>
      Current Period
    </div>
  </div>
);

const LocationBar = ({
  city,
  value,
  percent,
}: {
  city: string;
  value: string;
  percent: number;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between text-xs text-gray-500 font-medium">
      <span className="capitalize">{city}</span>
      <span>{value}</span>
    </div>
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-violet-600 rounded-full transition-all duration-500"
        style={{ width: percent + '%' }}
      ></div>
    </div>
  </div>
);

export default Dashboard;
