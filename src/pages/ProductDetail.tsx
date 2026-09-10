import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { ChevronLeft, Layers, ShieldCheck, Tag } from 'lucide-react';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchProductById, products } = useProducts();
  
  const [product, setProduct] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      if (typeof fetchProductById === 'function') {
        fetchProductById(id)
          .then((data) => {
            if (isMounted) setProduct(data);
          })
          .catch((err) => {
            if (isMounted) {
              setErrorMsg(err.message || 'Product configuration missing.');
              setTimeout(() => navigate('/dashboard/products'), 2500);
            }
          });
      } else {
        const found = products.find((p) => (p.id === id || p._id === id));
        if (found) {
          if (isMounted) setProduct(found);
        } else {
          setErrorMsg('Product configuration method missing from context provider.');
          setTimeout(() => navigate('/dashboard/products'), 2500);
        }
      }
    }
    return () => {
      isMounted = false;
    };
    // Removed 'products' and 'navigate' from dependencies to stop the infinite loop
  }, [id, fetchProductById]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">{errorMsg}</p>
          <p className="text-xs text-red-500 mt-2">Re-routing to core catalog file structures...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-medium font-sans">Syncing data maps...</span>
      </div>
    );
  }

  const productId = product.id || product._id;
  
  // Defensively ensure images are handled as an array
  const imageList = Array.isArray(product.images) 
    ? product.images 
    : (typeof product.images === 'string' ? [product.images] : []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link to="/dashboard/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            <ChevronLeft size={16} /> Return to Fleet Directory
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-sm">
          {/* Left Media Block */}
          <div className="space-y-4">
            <div className="h-96 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center p-4 shadow-inner">
              <img
                src={imageList[activeImgIdx] || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="max-w-full max-h-full object-contain mix-blend-multiply"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {imageList.map((imgUrl: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setActiveImgIdx(index)}
                  className={`w-20 h-20 rounded-lg border overflow-hidden bg-white flex-shrink-0 transition-all ${
                    activeImgIdx === index ? 'border-indigo-600 ring-2 ring-indigo-600/10 scale-95' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Metrics Block */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  <Layers size={12} /> {product.category}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    product.status === 'active' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {product.status}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-3 mb-4">{product.name}</h1>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={14} /> Valuation Output Value
                </div>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-3xl font-black text-gray-900">₱{Number(product.price || 0).toFixed(2)}</span>
                  {product.compare_at_price && (
                    <span className="text-sm text-gray-400 line-through">₱{Number(product.compare_at_price).toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="space-y-5 text-sm text-gray-600">
                <div>
                  <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1.5">Narrative Description</h3>
                  <p className="leading-relaxed bg-white border border-gray-100 rounded-xl p-3 shadow-inner">
                    {product.description || 'No descriptive summary logs attached to this asset catalog record.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Assigned SKU Code</h4>
                    <span className="font-mono font-bold text-gray-900 text-sm mt-0.5 block">{product.sku || 'UNTRACKED'}</span>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Volume Inventory Remainder</h4>
                    <span className={`text-sm font-bold mt-0.5 block ${product.inventory === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.inventory} units available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Attributes Grid */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-3 flex items-center gap-1">
                <ShieldCheck size={14} /> Diagnostic Parameters Matrix
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                  Object.entries(product.specifications).map(([key, val]: any) => (
                    <div key={key} className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 text-xs shadow-sm">
                      <span className="text-gray-500 font-bold">{key}:</span>
                      <span className="text-gray-900 font-mono font-semibold">{val}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 italic bg-gray-100/60 text-center py-4 rounded-xl col-span-full border border-dashed border-gray-200">
                    No custom diagnostic parameters registered.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
              <Link
                to={`/dashboard/products/edit/${productId}`}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-600/10 text-center"
              >
                Modify Asset Blueprint
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
