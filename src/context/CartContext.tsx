// src/context/CartContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// =================================================================
// TYPE DEFINITIONS
// =================================================================
export interface CartItemType {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
}

export interface Coupon {
  code: string;
  discount: number; // percentage or fixed amount
  type: 'percent' | 'fixed' | 'shipping';
  minSpend?: number;
  maxDiscount?: number; // Capping the discount amount
  description: string;
}

interface CartContextType {
  cartItems: CartItemType[];
  addToCart: (item: Omit<CartItemType, 'quantity'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;
  getTotalItems: () => number;

  // Coupon & Financial States
  availableCoupons: Coupon[];
  appliedCoupon: Coupon | null;
  couponInput: string;
  setCouponInput: (val: string) => void;
  couponError: string;
  couponSuccess: string;
  isApplying: boolean;
  handleApplyCoupon: () => Promise<void>;
  handleRemoveCoupon: () => void;

  // Final Calculated Values
  discountAmount: number;
  tax: number;
  shipping: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// =================================================================
// CONSTANTS — permanent production base (same style as AuthContext)
// =================================================================
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

// =================================================================
// GLOBAL PROVIDER
// =================================================================
export const CartProvider: React.FC<{ children: ReactNode; userId?: string | null }> = ({
  children,
  userId,
}) => {
  // 🚀 Dynamic storage key tied to the user session
  const storageKey = userId ? 'councicroff_cart_' + userId : 'councicroff_cart_guest';

  // 1. Load from local storage securely, scoping to the active user
  const [cartItems, setCartItems] = useState<CartItemType[]>(() => {
    try {
      const localData = localStorage.getItem(storageKey);
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      console.error('Failed to parse cart data', error);
      return [];
    }
  });

  // Coupon States
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Default fallback coupons
  const defaultCoupons: Coupon[] = [
    {
      code: 'HARLEY',
      discount: 15,
      type: 'percent',
      maxDiscount: 25,
      description: '15% off (Max ₱25 discount)',
    },
    {
      code: 'CCSHOP',
      discount: 25,
      type: 'fixed',
      maxDiscount: 25,
      description: '₱25 off your order',
    },
    {
      code: 'ARCHIVEPH',
      discount: 10,
      type: 'percent',
      maxDiscount: 25,
      description: '10% off selected archive pieces (Max ₱25)',
    },
    {
      code: 'FREESHIP',
      discount: 100,
      type: 'shipping',
      description: 'Priority processing (Free shipping)',
    },
  ];

  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>(defaultCoupons);

  // 🚀 Fetch custom coupons from backend (permanent production URL)
  const fetchCoupons = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(API_BASE_URL + '/coupons/', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(response);

      if (!response.ok) {
        const msg = extractErrorMessage(data, 'Failed to fetch coupons (' + response.status + ')');
        console.warn('[CartContext] Coupons error:', msg);
        return;
      }

      const list = Array.isArray(data) ? data : data.coupons || data.data || [];
      if (list.length === 0) return;

      const merged = [...defaultCoupons];
      list.forEach((apiCoupon: any) => {
        if (!apiCoupon?.code) return;
        const upperApiCode = String(apiCoupon.code).toUpperCase();
        const existingIndex = merged.findIndex(
          (c) => c.code.toUpperCase() === upperApiCode
        );

        const formattedCoupon: Coupon = {
          code: upperApiCode,
          discount: Number(apiCoupon.discount) || 0,
          type: apiCoupon.type || 'percent',
          minSpend: apiCoupon.minSpend || 0,
          maxDiscount: apiCoupon.maxDiscount ?? 25,
          description: apiCoupon.description || 'Dashboard Store Voucher',
        };

        if (existingIndex !== -1) {
          merged[existingIndex] = formattedCoupon;
        } else {
          merged.push(formattedCoupon);
        }
      });
      setAvailableCoupons(merged);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[CartContext] Coupons request timed out. Using defaults.');
      } else {
        console.warn(
          '[CartContext] Using default local coupons fallback due to backend connection issue.'
        );
      }
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // 2. Listen for User Switches (Login/Logout) to instantly load the correct cart
  useEffect(() => {
    try {
      const localData = localStorage.getItem(storageKey);
      setCartItems(localData ? JSON.parse(localData) : []);
      setAppliedCoupon(null); // Reset coupon on user switch
    } catch (error) {
      setCartItems([]);
    }
  }, [storageKey]);

  // 3. Sync with local storage safely using the dynamic key
  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(cartItems));
      } else {
        localStorage.removeItem(storageKey); // Clean up empty cart storage
      }
    } catch (error) {
      console.warn('Could not save cart to local storage.');
    }
  }, [cartItems, storageKey]);

  const addToCart = useCallback((newItem: Omit<CartItemType, 'quantity'>) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === newItem.id);
      if (existing) {
        return prev.map((item) =>
          item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Financial Calculations
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const getTotalItems = () => cartCount;

  const shipping = 0; // Free nationwide shipping
  const taxRate = 0.08; // 8% tax

  let discountAmount = 0;
  let effectiveShipping = shipping;

  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent' || appliedCoupon.type === 'fixed') {
      if (!appliedCoupon.minSpend || cartSubtotal >= appliedCoupon.minSpend) {
        let calcDiscount =
          appliedCoupon.type === 'percent'
            ? (cartSubtotal * appliedCoupon.discount) / 100
            : appliedCoupon.discount;

        if (appliedCoupon.maxDiscount && calcDiscount > appliedCoupon.maxDiscount) {
          calcDiscount = appliedCoupon.maxDiscount;
        }
        discountAmount = Math.round(calcDiscount * 100) / 100;
      }
    } else if (appliedCoupon.type === 'shipping') {
      effectiveShipping = 0;
    }
  }

  const subtotalWithDiscount = Math.max(0, cartSubtotal - discountAmount);
  const tax = Math.round(subtotalWithDiscount * taxRate * 100) / 100;
  const total = Math.max(0, subtotalWithDiscount + effectiveShipping + tax);

  const handleApplyCoupon = useCallback(async () => {
    setIsApplying(true);
    setCouponError('');
    setCouponSuccess('');

    await new Promise((resolve) => setTimeout(resolve, 400));
    const upperCode = couponInput.trim().toUpperCase();
    const found = availableCoupons.find((c) => c.code.toUpperCase() === upperCode);

    if (!found) {
      setCouponError('Invalid offer code. Please verify and try again.');
      setIsApplying(false);
      return;
    }
    if (found.minSpend && cartSubtotal < found.minSpend) {
      setCouponError('Minimum spend of ₱' + found.minSpend + ' required for this offer.');
      setIsApplying(false);
      return;
    }

    setAppliedCoupon(found);
    setCouponSuccess(found.code + ' applied successfully.');
    setCouponInput('');
    setIsApplying(false);
  }, [couponInput, availableCoupons, cartSubtotal]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError('');
    setCouponSuccess('');
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartCount,
        getTotalItems,
        availableCoupons,
        appliedCoupon,
        couponInput,
        setCouponInput,
        couponError,
        couponSuccess,
        isApplying,
        handleApplyCoupon,
        handleRemoveCoupon,
        discountAmount,
        tax,
        shipping: effectiveShipping,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// =================================================================
// HOOK EXPORT
// =================================================================
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
