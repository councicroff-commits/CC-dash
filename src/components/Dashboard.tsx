import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900 z-50 font-mono shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center gap-4 sm:gap-8 overflow-x-auto whitespace-nowrap">
        
        <a href="/" className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 text-[10px] uppercase tracking-widest font-bold transition-all hover:bg-zinc-900/50 px-3 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full group-hover:bg-amber-500" />
          [ System Hub ]
        </a>

        <a href="/profile" className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 text-[10px] uppercase tracking-widest font-bold transition-all hover:bg-zinc-900/50 px-3 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full group-hover:bg-amber-500" />
          [ Active Node Profile ]
        </a>

        <a href="/users" className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 text-[10px] uppercase tracking-widest font-bold transition-all hover:bg-zinc-900/50 px-3 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full group-hover:bg-amber-500" />
          [ Operator Registry ]
        </a>

      </div>
    </div>
  );
};

export default Dashboard;
