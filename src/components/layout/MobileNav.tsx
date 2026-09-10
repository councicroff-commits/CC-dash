import React from 'react';
import { NavLink } from 'react-router-dom';

const MobileNav: React.FC = () => {
  const items = [
    { label: 'Core', path: '/dashboard' },
    { label: 'Metrics', path: '/analytics' },
    { label: 'Nodes', path: '/users' },
    { label: 'Config', path: '/settings' }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900 grid grid-cols-4 z-50 h-16 font-sans">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[10px] font-mono uppercase tracking-widest transition-colors ${
              isActive ? 'text-sky-400 bg-sky-950/10' : 'text-zinc-600 hover:text-zinc-400'
            }`
          }
        >
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileNav;
