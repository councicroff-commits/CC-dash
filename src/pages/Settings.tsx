// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';

// 🔥 DYNAMIC PERMANENT FIX for Settings (Cleaned single slash)
const getApiBaseUrl = () => {
  return 'https://cc-backend-yc-team.onrender.com/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const Settings: React.FC = () => {
  const defaultEndpoint = API_BASE_URL;

  // 1. Set up state to hold the endpoint
  const [endpoint, setEndpoint] = useState(defaultEndpoint);
  const [isSaved, setIsSaved] = useState(false);

  // 2. Load the saved endpoint when the component mounts
  useEffect(() => {
    const savedEndpoint = localStorage.getItem('cc_api_endpoint');
    if (savedEndpoint) {
      setEndpoint(savedEndpoint);
    } else {
      setEndpoint(API_BASE_URL);
    }
  }, []);

  // 3. Save the new endpoint to localStorage
  const handleSave = () => {
    localStorage.setItem('cc_api_endpoint', endpoint);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    setEndpoint(API_BASE_URL);
    localStorage.setItem('cc_api_endpoint', API_BASE_URL);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.4em] font-mono text-zinc-500 mb-1">
          CONFIGURATION KEYS // PREFERENCES
        </p>
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Node Settings</h1>
      </div>
      <div className="border border-zinc-900 bg-zinc-950 p-6 max-w-xl">
        <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block mb-2">
          Ecosystem Domain Endpoint
        </label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-900 text-zinc-300 font-mono text-xs p-3 outline-none focus:border-sky-400 mb-4"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold uppercase tracking-widest px-6 py-2 transition-colors cursor-pointer"
          >
            {isSaved ? 'Saved!' : 'Save Configuration'}
          </button>
          <button
            onClick={handleReset}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-widest px-6 py-2 transition-colors cursor-pointer border border-zinc-700"
          >
            Reset to Production
          </button>
        </div>
        <p className="mt-4 text-[10px] font-mono text-zinc-600 tracking-wide">
          Default production:{' '}
          <span className="text-zinc-400">{API_BASE_URL}</span>
        </p>
      </div>
    </div>
  );
};

export default Settings;