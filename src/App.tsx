import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './app/routes';
import './styles/globals.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { OrderProvider } from './context/OrderContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProductProvider>
        <OrderProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </OrderProvider>
      </ProductProvider>
    </AuthProvider>
  );
};

export default App;
