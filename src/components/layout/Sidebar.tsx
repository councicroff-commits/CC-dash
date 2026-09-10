import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Tag, 
  Settings, 
  LayoutTemplate 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', path: '/dashboard/products', icon: Package },
    { name: 'Orders', path: '/dashboard/orders', icon: ShoppingCart },
    { name: 'Store Parts', path: '/dashboard/parts', icon: LayoutTemplate },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Promos', path: '/promos', icon: Tag },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar Container */}
      <aside
        className={`w-72 bg-zinc-950 border-r border-white/10 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          {/* Replace this div with an <img src="/logo.png" className="h-8" /> if you have an image file */}
          <div className="flex flex-col select-none">
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none">
              Counci<span className="font-light text-zinc-400">Croff</span>
            </h1>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.35em] mt-1.5 ml-0.5">
              Admin Gateway
            </span>
          </div>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
            Core Modules
          </p>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <IconComponent 
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-black' : 'text-zinc-400 group-hover:text-white'
                      }`} 
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Info & Session Status */}
        <div className="p-4 border-t border-white/10 bg-zinc-950">
          <div className="px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-400 flex items-center justify-between shadow-inner">
            <span className="font-medium tracking-wide">Network</span>
            <span className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" /> 
              Secure
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
