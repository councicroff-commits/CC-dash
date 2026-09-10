import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { Package, DollarSign, ImagePlus, Settings, CheckCircle2, AlertCircle, X } from 'lucide-react';

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

const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { fetchProductById, createProduct, updateProduct, products } = useProducts();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [sku, setSku] = useState('');
  const [inventory, setInventory] = useState('');
  const [category, setCategory] = useState('clothes');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [badge, setBadge] = useState('');
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const populateFields = (data: any) => {
    setName(data.name || '');
    setDescription(data.description || '');
    setPrice(data.price?.toString() || '');
    setCompareAtPrice(data.compare_at_price?.toString() || data.compareAtPrice?.toString() || '');
    setSku(data.sku || '');
    setInventory(data.inventory?.toString() || '');
    setCategory(data.category || 'clothes');
    setStatus(data.status || 'active');
    setBadge(data.badge || '');
    
    if (data.sizes && Array.isArray(data.sizes)) setSizes(data.sizes.join(', '));
    if (data.colors && Array.isArray(data.colors)) setColors(data.colors.join(', '));
    
    // Safely enforce array setting even if backend returned a string
    if (data.images) {
      setImages(Array.isArray(data.images) ? data.images : [data.images]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isEditMode && id) {
      if (typeof fetchProductById === 'function') {
        fetchProductById(id)
          .then((data: any) => {
            if (isMounted) populateFields(data);
          })
          .catch((err: any) => {
            if (isMounted) showToast(err.message || 'Failed to sync resource profiles.', 'error');
          });
      } else {
        const found = products.find((p) => (p.id === id || p._id === id));
        if (found && isMounted) populateFields(found);
      }
    }
    return () => {
      isMounted = false;
    };
    // Removed 'products' from dependencies to stop the form input reset loop
  }, [id, isEditMode, fetchProductById]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      const base64Promises = fileArray.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      });

      try {
        const base64Images = await Promise.all(base64Promises);
        setImages(prev => [...prev, ...base64Images]);
      } catch (error) {
        showToast('Error converting hardware images to Base64 datasets.', 'error');
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      name, 
      description,
      price: parseFloat(price) || 0.0,
      compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
      sku,
      inventory: parseInt(inventory, 10) || 0,
      category, 
      status,
      badge: badge.trim() !== '' ? badge : null,
      sizes: sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: colors.split(',').map(c => c.trim()).filter(Boolean),
      images: images.filter(img => img.trim() !== ''),
    };

    try {
      if (isEditMode && id) {
        await updateProduct(id, payload);
        showToast('System node successfully recalibrated!', 'success');
      } else {
        await createProduct(payload);
        showToast('Asset catalog index successfully generated!', 'success');
      }
      setTimeout(() => navigate('/dashboard/products'), 1500);
    } catch (err: any) {
      showToast(err.message || 'Transaction rejected by backend database modules.', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-8 font-sans pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {isEditMode ? 'Modify Product Parameters' : 'Deploy Product Listing'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Configure backend mapping parameters for public listing delivery.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/dashboard/products')} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition-all">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={isLoading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm shadow-indigo-600/10 transition-all flex items-center gap-2 disabled:opacity-50">
              {isLoading ? 'Saving Transaction...' : (isEditMode ? 'Commit Metrics' : 'Publish Matrix')}
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-3">
                <Package className="text-indigo-600" size={18} />
                <h2 className="text-md font-bold text-gray-900">Core Listing Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Product Label/Title *</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors text-sm" placeholder="Core signature label..." />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">System Description Narrative</label>
                  <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors text-sm" placeholder="Provide functional specification parameters and details..." />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-3">
                <ImagePlus className="text-indigo-600" size={18} />
                <h2 className="text-md font-bold text-gray-900">Media System Directories</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-3">
                {images.map((imgUrl, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group shadow-sm">
                    <img src={imgUrl} alt="" className="w-full h-full object-contain mix-blend-multiply p-2" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <X size={12} />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 w-full bg-indigo-600 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wider">
                        Primary Node
                      </div>
                    )}
                  </div>
                ))}

                <label className="aspect-square rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-indigo-600 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center cursor-pointer group">
                  <ImagePlus className="text-gray-400 group-hover:text-indigo-600 mb-1" size={22} />
                  <span className="text-[11px] text-gray-500 font-bold group-hover:text-indigo-600 text-center px-1">Upload Media</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              </div>
              <p className="text-[11px] text-gray-400">Supported datasets include raw JPG, PNG, and asset base64 sequences.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-3">
                <DollarSign className="text-indigo-600" size={18} />
                <h2 className="text-md font-bold text-gray-900">Financial Attributes</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Standard Value (₱) *</label>
                  <input type="number" step="any" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Compare Valuation (Sale)</label>
                  <input type="number" step="any" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm" placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Stock Volume *</label>
                    <input type="number" required value={inventory} onChange={(e) => setInventory(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Tracking SKU</label>
                    <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm" placeholder="SKU-XXX" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-3">
                <Settings className="text-indigo-600" size={18} />
                <h2 className="text-md font-bold text-gray-900">Registry Categories</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Category Type</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm">
                    <option value="clothes">Clothes</option>
                    <option value="perfume">Perfume</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Product Badge</label>
                  <select value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm">
                    <option value="">No Badge</option>
                    <option value="Prime">Prime</option>
                    <option value="Sale">Sale</option>
                    <option value="New Arrival">New Arrival</option>
                    <option value="Best Seller">Best Seller</option>
                    <option value="Limited Edition">Limited Edition</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Registry Visibility Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm">
                    <option value="active">Active (Visible in Shop Modules)</option>
                    <option value="draft">Draft (Restricted/Hidden)</option>
                    <option value="archived">Archived (Deprecated)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-3">
                <Package className="text-indigo-600" size={18} />
                <h2 className="text-md font-bold text-gray-900">Fixed Variants</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Available Sizes</label>
                  <input type="text" value={sizes} onChange={(e) => setSizes(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors text-sm" placeholder="e.g. S, M, L, XL, 50ml" />
                  <p className="text-[10px] text-gray-400 mt-1">Separate sizes with commas.</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Available Colors</label>
                  <input type="text" value={colors} onChange={(e) => setColors(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors text-sm" placeholder="e.g. Red, Blue, Black" />
                  <p className="text-[10px] text-gray-400 mt-1">Separate colors with commas.</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
