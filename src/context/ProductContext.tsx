// src/context/ProductContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface Product {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
  sku: string;
  inventory: number;
  category: 'clothes' | 'perfume' | 'lifestyle' | string;
  badge?: string | null;
  sizes: string[];
  colors: string[];
  images: string[];
  specifications: Record<string, any>;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<Product>;
  createProduct: (productData: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
}

// Matches FastAPI backend routes without trailing slashes (e.g., @router.get('') and @router.post(''))
const API_BASE_URL = 'https://cc-backend-yc-team.onrender.com/api/v1/products';

export const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeFetchRef = useRef<Promise<any> | null>(null);

  const getAuthHeaders = (includeAuth = true) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (includeAuth) {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (token) headers.Authorization = `Bearer ${token}`;
    }
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

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!activeFetchRef.current) {
        activeFetchRef.current = fetch(API_BASE_URL, {
          headers: getAuthHeaders(false),
        }).then(async (res) => {
          const data = await parseResponse(res);
          if (!res.ok) {
            throw new Error(data.detail || data.message || `Server returned status: ${res.status}`);
          }
          return data;
        });
      }

      const data = await activeFetchRef.current;
      const list = Array.isArray(data) ? data : data.products || data.data || [];

      const normalized = list.map((p: any) => ({
        ...p,
        id: p._id || p.id,
        price: Number(p.price) || 0,
        inventory: Number(p.inventory || p.stock || 0),
        images: Array.isArray(p.images) ? p.images : [],
      }));

      setProducts(normalized);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch products.');
    } finally {
      activeFetchRef.current = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchProductById = useCallback(async (id: string): Promise<Product> => {
    if (!id || id === 'undefined') {
      throw new Error('Invalid product ID provided.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
        headers: getAuthHeaders(false),
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to fetch product details');
      }

      const rawProduct = data.product || data;
      const fullProductData = {
        ...rawProduct,
        id: rawProduct._id || rawProduct.id || id,
        price: Number(rawProduct.price) || 0,
        inventory: Number(rawProduct.inventory || rawProduct.stock || 0),
        images: Array.isArray(rawProduct.images) ? rawProduct.images : [],
      };

      setProducts((prev) => {
        const index = prev.findIndex((p) => p.id === id || p._id === id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = fullProductData;
          return updated;
        }
        return [fullProductData, ...prev];
      });

      return fullProductData;
    } catch (err: any) {
      throw err;
    }
  }, []);

  const createProduct = async (productData: Partial<Product>) => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(productData),
      });

      const data = await parseResponse(response);
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to create product');
      }

      const rawProd = data.product || data;
      const newProd = {
        ...rawProd,
        id: rawProd._id || rawProd.id,
        price: Number(rawProd.price) || 0,
        inventory: Number(rawProd.inventory || rawProd.stock || 0),
        images: Array.isArray(rawProd.images) ? rawProd.images : [],
      };

      setProducts((prev) => [newProd, ...prev]);
      return newProd;
    } catch (err: any) {
      throw err;
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(productData),
      });

      const data = await parseResponse(response);
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to update product');
      }

      const rawProd = data.product || data;
      const updatedProd = {
        ...rawProd,
        id: rawProd._id || rawProd.id || id,
        price: Number(rawProd.price) || 0,
        inventory: Number(rawProd.inventory || rawProd.stock || 0),
        images: Array.isArray(rawProd.images) ? rawProd.images : [],
      };

      setProducts((prev) => prev.map((p) => (p.id === id || p._id === id ? updatedProd : p)));
      return updatedProd;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
      });

      if (!response.ok) {
        const data = await parseResponse(response);
        throw new Error(data.detail || data.message || 'Failed to delete product');
      }

      setProducts((prev) => prev.filter((p) => p.id !== id && p._id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        loading: isLoading,
        error,
        fetchProducts,
        fetchProductById,
        createProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within a ProductProvider');
  return context;
};

export default ProductProvider;
