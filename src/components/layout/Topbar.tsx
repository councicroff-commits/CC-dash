import React from 'react';
import { useNavigate } from 'react-router-dom';
// FIXED: Added an extra '../' to properly route from src/components/layout to src/utils
import { clearSession } from '../../utils/auth'; 

interface TopbarProps { 
  onMenuTrigger: () => void; 
}

const Topbar: React.FC<TopbarProps> = ({ onMenuTrigger }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (typeof clearSession === 'function') {
      clearSession();
    } else {
      localStorage.removeItem('token'); 
    }
    
    navigate('/'); 
  };

  return (
    <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 right-0 left-0 lg:left-72 z-30 transition-all duration-300">
      
      {/* Mobile Menu Trigger */}
      <button onClick={onMenuTrigger} className="lg:hidden p-2 text-zinc-600 hover:text-black transition-colors">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <div className="hidden sm:block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        System Overview
      </div>
      
      <div className="flex items-center gap-4 sm:gap-5">
        
        {/* User Identity */}
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-zinc-900">Harley YC</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Super Admin</p>
        </div>
        
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-xs font-bold text-white shadow-sm">
          HY
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

        {/* Log Out Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          title="Log out securely"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        
      </div>
    </header>
  );
};

export default Topbar;
