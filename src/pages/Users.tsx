// src/pages/Users.tsx
import React, { useEffect, useMemo, useState } from "react";
import UserDetail from "./UserDetail";

export interface UserNode {
  id: string;
  fullName: string;
  username: string;
  email: string;
  mobile?: string;
  birthDate?: string;
  gender?: string;
  age?: number | string;
  facebook?: string;
  status?: string;
  isVerified?: boolean;
  created_at?: string;
  avatar?: string;
}

// Permanent Production API Base URL
const API_BASE_URL = 'https://cc-backend-production-00fe.up.railway.app/api/v1';

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "VERIFIED" | "UNVERIFIED">("ALL");
  
  const [selectedNode, setSelectedNode] = useState<UserNode | null>(null);

  const BASE_URL = `${API_BASE_URL}/analytics/users`; 
  const VERIFY_URL = `${API_BASE_URL}/auth/verify`;

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchAllDatabaseNodes = async () => {
    try {
      const response = await fetch(BASE_URL, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      
      if (response.ok) {
        const rawUsers = data.users || (Array.isArray(data) ? data : []);

        const mappedUsers = rawUsers.map((user: any) => ({
          ...user,
          id: user._id || user.id, 
          fullName: user.profile ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() : user.fullName || 'Unknown',
          username: user.email ? user.email.split('@')[0] : user.username || 'user',
          avatar: user.profile?.avatar || user.avatar || '',
          mobile: user.profile?.mobile || user.mobile || '',
          status: user.status || 'Active',
          isVerified: user.isVerified || false,
        }));

        setUsers(mappedUsers);
      } else {
        throw new Error(data.message || "Failed to fetch users");
      }
    } catch (err) {
      setNotification({ type: 'error', message: "Connection Error: Unable to reach the admin server or fetch data." });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchAllDatabaseNodes();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Optimistic Verification Handler
  const handleToggleVerification = async (nodeId: string) => {
    try {
      setNotification(null);
      setUsers(prev => prev.map(u => u.id === nodeId ? { ...u, isVerified: true } : u));
      if (selectedNode?.id === nodeId) {
        setSelectedNode(prev => prev ? { ...prev, isVerified: true } : null);
      }

      const response = await fetch(`${VERIFY_URL}/${nodeId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok || data.status !== "SUCCESS") {
        throw new Error(data.message || "Failed to verify user.");
      }

      setNotification({ type: 'success', message: `User account successfully verified.` });
    } catch (error: any) {
      fetchAllDatabaseNodes();
      setNotification({ type: 'error', message: `Verification Failed: ${error.message}` });
    }
  };

  // Blazing Fast Optimistic Deletion
  const handleTerminateNode = async (nodeId: string) => {
    const previousUsers = [...users];
    const previousSelectedNode = selectedNode;

    try {
      setNotification(null);
      // 1. Immediately update UI state seamlessly without lagging
      setUsers(prev => prev.filter(u => u.id !== nodeId));
      setSelectedNode(null); 

      // 2. Perform background server sync request
      const response = await fetch(`${BASE_URL}/${nodeId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok || (data.status && data.status !== "SUCCESS" && response.status >= 400)) {
        throw new Error(data.message || "Deletion blocked by server.");
      }

      setNotification({ type: 'warning', message: `User account has been permanently deleted.` });
    } catch (error: any) {
      // Rollback state if server request errors out
      setUsers(previousUsers);
      setSelectedNode(previousSelectedNode);
      setNotification({ type: 'error', message: `Delete Failed: ${error.message}` });
    }
  };

  const systemMetrics = useMemo(() => {
    const total = users.length;
    const verified = users.filter(u => u.isVerified).length;
    const verifiedPercent = total > 0 ? Math.round((verified / total) * 100) : 0;
    const activeConnections = users.filter(u => u.status === "Active").length;
    return { total, verified, verifiedPercent, activeConnections };
  }, [users]);

  const filteredNodes = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        filterType === "ALL" ? true :
        filterType === "VERIFIED" ? user.isVerified === true :
        user.isVerified !== true; 
      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, filterType]);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-medium">Loading user directory...</span>
      </div>
    );
  }

  // --- Detail View Override ---
  if (selectedNode) {
    return (
      <UserDetail 
        node={selectedNode} 
        onBack={() => setSelectedNode(null)} 
        onVerify={() => handleToggleVerification(selectedNode.id)}
        onDelete={() => handleTerminateNode(selectedNode.id)}
      />
    );
  }

  // --- Main List View ---
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Administer user accounts, verify identities, and manage access seamlessly.</p>
          </div>
          <button
            onClick={() => fetchAllDatabaseNodes()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition cursor-pointer"
          >
            Refresh Directory
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`mb-8 p-4 rounded-2xl shadow-sm border-l-4 flex items-center gap-3 text-sm font-bold ${
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 
            notification.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-800' :
            'bg-red-50 border-red-500 text-red-800'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard title="Total Users" value={systemMetrics.total.toString()} />
          <MetricCard title="Verified Percentage" value={`${systemMetrics.verifiedPercent}%`} />
          <MetricCard title="Verified Accounts" value={systemMetrics.verified.toString()} highlight="blue" />
          <MetricCard title="Active Status" value={systemMetrics.activeConnections.toString()} highlight="green" />
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search by name, username, or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm font-medium transition-colors"
            />
          </div>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer sm:w-auto w-full"
          >
            <option value="ALL">All Users</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="UNVERIFIED">Unverified Only</option>
          </select>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {filteredNodes.length > 0 ? (
            filteredNodes.map((node) => (
              <div 
                key={node.id} 
                onClick={() => setSelectedNode(node)}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-4 relative overflow-hidden group shadow-sm"
              >
                {/* Left Accent Border */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${node.isVerified ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-100 shadow-sm">
                  {node.avatar ? (
                    <img src={node.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-indigo-600">
                      {node.fullName ? node.fullName.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors text-base">
                    {node.fullName || "Unknown User"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                    @{node.username || "unknown"} • {node.email}
                  </p>
                </div>

                {/* Badges */}
                <div className="hidden sm:flex shrink-0 gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${node.isVerified ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                    {node.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${node.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {node.status || 'Unknown'}
                  </span>
                </div>

                {/* Arrow Icon */}
                <div className="shrink-0 text-gray-400 group-hover:text-indigo-600 transition-colors pr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-500 text-sm font-semibold shadow-sm">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              No users found matching your search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, highlight = "default" }: { title: string, value: string, highlight?: "default" | "blue" | "green" }) => {
  const colorMap = {
    default: "text-gray-900",
    blue: "text-indigo-600",
    green: "text-green-600",
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</div>
      <div className={`text-3xl font-black mt-2 ${colorMap[highlight]}`}>{value}</div>
    </div>
  );
};

export default Users;
