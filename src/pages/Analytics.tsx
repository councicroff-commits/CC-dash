import React from 'react';

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.4em] font-mono text-zinc-500 mb-1">METRIC CONSOLE // STREAMS</p>
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Performance Analytics</h1>
      </div>
      <div className="border border-zinc-900 bg-zinc-950/40 p-12 text-center text-xs font-mono tracking-widest text-zinc-600 uppercase">
        Telemetry Chart Arrays Initializing...
      </div>
    </div>
  );
};

export default Analytics;
