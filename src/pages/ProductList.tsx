import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { Plus, Search, Edit2, Trash2, Package, CheckCircle2, AlertCircle, X, AlertTriangle, Eye } from 'lucide-react';

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl z-50 border ${
    type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
  }`}>
    {type === 'success' ? <CheckCircle2 size={18} className="text-green-600" /> : <AlertCircle size={18} className="text-red-600" />}
    <span className="font-semibold text-sm">{message}</span>
    <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors">
      <X size={14} />
    </button>
  </div>
);

const ConfirmModal = ({ isOpen, title, productName, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center gap-3 text-red-600 mb-3">
          <AlertTriangle size={22} />
          <h3 className="text-md font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-500 text-sm mb-5">
          Are you sure you want to completely erase <strong className="text-gray-900">{productName}</strong> from active registers? This process cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
            Confirm Deletion
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductList: React.FC = () => {
  const { products, loading, isLoading, fetchProducts, deleteProduct } = useProducts();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (typeof fetchProducts === 'function') {
      fetchProducts().catch((err) => showToast(err.message || 'Failure to query product listings.', 'error'));
    }
  }, [fetchProducts]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      showToast('Asset listing erased successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error occurred during entry purging execution.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, filterStatus]);

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
      status === 'active' ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-gray-100 text-gray-500 border-gray-200'
    }`}>
      {status}
    </span>
  );

  const isDataLoading = loading || isLoading;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8 font-sans pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <ConfirmModal 
        isOpen={!!deleteTarget}
        title="Delete Operational Asset Listing"
        productName={deleteTarget?.name}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Active Core Inventory</h1>
            <p className="text-gray-500 text-sm mt-1">Review validation states, unit parameters, pricing targets, and distribution lists.</p>
          </div>
          <Link
            to="/dashboard/products/new"
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-indigo-600/10 flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>Register New Asset</span>
          </Link>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['all', 'active', 'draft', 'archived'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                  filterStatus === tab 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Query matrix by title or SKU code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>
        </div>

        {isDataLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-2.5 shadow-sm">
            <Package size={36} className="text-gray-300" />
            <h3 className="text-gray-900 font-bold text-md">No indexed assets found</h3>
            <p className="text-gray-500 text-xs max-w-xs">
              No matching listings comply with the specific search variables applied.
            </p>
            {searchTerm !== '' && (
              <button onClick={() => setSearchTerm('')} className="mt-1 text-indigo-600 text-xs font-bold hover:underline">
                Reset system query filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop View */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6">Catalog Parameters</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Volume Registry</th>
                    <th className="p-4">Category System</th>
                    <th className="p-4 text-right pr-6">Management Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredProducts.map((product) => {
                    const productId = product.id || product._id;
                    return (
                      <tr key={productId} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={product.images?.[0] || 'https://via.placeholder.com/50'}
                              alt=""
                              className="w-11 h-11 rounded-xl object-contain bg-gray-50 border border-gray-200 p-1"
                            />
                            <div className="max-w-[240px]">
                              <div className="font-bold text-gray-900 truncate">{product.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</div>
                              <div className="text-xs font-extrabold text-indigo-600 mt-0.5">₱{Number(product.price || 0).toFixed(2)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><StatusBadge status={product.status} /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${product.inventory > 10 ? 'bg-green-500' : product.inventory > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                            <span className={`font-medium ${product.inventory === 0 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                              {product.inventory} pieces remaining
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 font-semibold">{product.category}</td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => navigate(`/dashboard/products/${productId}`)} className="p-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="View details">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => navigate(`/dashboard/products/edit/${productId}`)} className="p-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-colors" title="Modify">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget({ id: productId, name: product.name })} className="p-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg transition-colors" title="Purge">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {filteredProducts.map((product) => {
                const productId = product.id || product._id;
                return (
                  <div key={productId} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                    <div className="flex gap-3">
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/50'}
                        alt=""
                        className="w-16 h-16 rounded-xl object-contain bg-gray-50 border border-gray-200 shrink-0 p-1"
                      />
                      <div className="flex flex-col justify-between overflow-hidden text-xs">
                        <div>
                          <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</p>
                        </div>
                        <div className="font-extrabold text-indigo-600">₱{Number(product.price || 0).toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-y border-gray-100 py-2.5 text-xs">
                      <StatusBadge status={product.status} />
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${product.inventory > 10 ? 'bg-green-500' : product.inventory > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <span className={`font-medium ${product.inventory === 0 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                          {product.inventory} units available
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/dashboard/products/${productId}`)} className="flex-1 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                        <Eye size={12} /> View
                      </button>
                      <button onClick={() => navigate(`/dashboard/products/edit/${productId}`)} className="flex-1 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget({ id: productId, name: product.name })} className="py-1.5 px-3 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
