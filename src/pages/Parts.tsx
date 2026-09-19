// src/pages/Parts.tsx
import React, { useState, useEffect, useCallback } from 'react';

interface BannerItem {
  sticker: string;
  text: string;
}

interface ThemeConfig {
  bg: string;
  border: string;
  text: string;
  separator: string;
  items: BannerItem[];
}

interface BannerConfig {
  activeMode: string;
  forcedTheme: string;
  themes: Record<string, ThemeConfig>;
}

interface FooterContact {
  phone: string;
  email: string;
  address: string;
}

interface FooterSocials {
  facebook: string;
  twitter: string;
  instagram: string;
  youtube: string;
}

interface FooterConfig {
  contact: FooterContact;
  socials: FooterSocials;
  copyrightText: string;
}

interface StorePartsDocument {
  key: string;
  banner: BannerConfig;
  footer: FooterConfig;
  updated_at?: string;
}

const EMPTY_CONFIG: StorePartsDocument = {
  key: 'store_parts_config',
  banner: {
    activeMode: 'auto',
    forcedTheme: '',
    themes: {},
  },
  footer: {
    contact: { phone: '', email: '', address: '' },
    socials: { facebook: '', twitter: '', instagram: '', youtube: '' },
    copyrightText: '',
  },
};

// 🔥 DYNAMIC PERMANENT FIX for Parts (Cleaned single slash)
const getApiBaseUrl = () => {
  return 'https://cc-backend-production-00fe.up.railway.app/api/v1/parts/';
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

const Parts: React.FC = () => {
  const [config, setConfig] = useState<StorePartsDocument>(EMPTY_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [selectedThemeKey, setSelectedThemeKey] = useState<string>('');
  const [newThemeName, setNewThemeName] = useState<string>('');

  const getAuthHeaders = (includeAuth = true) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (includeAuth) {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }
    }
    return headers;
  };

  const fetchConfig = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(API_BASE_URL + '/parts/', {
        method: 'GET',
        signal: controller.signal,
        headers: getAuthHeaders(false),
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(res);

      if (res.ok) {
        const validConfig = data.config || data;
        if (validConfig && validConfig.banner && validConfig.footer) {
          setConfig(validConfig);
          const themeKeys = Object.keys(validConfig.banner.themes || {});
          if (
            themeKeys.length > 0 &&
            (!selectedThemeKey || !validConfig.banner.themes[selectedThemeKey])
          ) {
            setSelectedThemeKey(themeKeys[0]);
          }
        }
      } else {
        console.error(
          '[Parts] Fetch error:',
          extractErrorMessage(data, 'Failed to load parts config')
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching store parts:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedThemeKey]);

  useEffect(() => {
    fetchConfig();
    window.addEventListener('focus', fetchConfig);
    return () => {
      window.removeEventListener('focus', fetchConfig);
    };
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(API_BASE_URL + '/parts/', {
        method: 'PUT',
        signal: controller.signal,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          banner: config.banner,
          footer: config.footer,
        }),
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(res);

      if (res.ok) {
        if (data.config) {
          setConfig(data.config);
        }
        setMessage({
          type: 'success',
          text: 'Changes successfully saved and synced to database!',
        });
      } else {
        setMessage({
          type: 'error',
          text: extractErrorMessage(data, 'Failed to save configuration updates.'),
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Connection timed out while saving.' });
      } else {
        console.error('Error saving store parts:', err);
        setMessage({
          type: 'error',
          text: 'Network or code error: ' + (err?.message || 'Unknown error'),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddTheme = () => {
    const formattedKey = newThemeName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!formattedKey) return;
    if (config.banner.themes[formattedKey]) {
      alert('Theme event already exists!');
      return;
    }

    const updatedThemes = {
      ...config.banner.themes,
      [formattedKey]: {
        bg: '#09090b',
        border: '#27272a',
        text: '#f4f4f5',
        separator: '#0ea5e9',
        items: [{ sticker: '🎉', text: 'NEW EVENT BANNER' }],
      },
    };

    setConfig({
      ...config,
      banner: {
        ...config.banner,
        themes: updatedThemes,
      },
    });
    setSelectedThemeKey(formattedKey);
    setNewThemeName('');
  };

  const handleDeleteTheme = (keyToDelete: string) => {
    if (Object.keys(config.banner.themes).length <= 1) {
      alert('You must keep at least one active theme.');
      return;
    }
    if (
      !window.confirm(
        'Are you sure you want to delete the theme event "' + keyToDelete + '"?'
      )
    ) {
      return;
    }

    const updatedThemes = { ...config.banner.themes };
    delete updatedThemes[keyToDelete];

    const remainingKeys = Object.keys(updatedThemes);
    setConfig({
      ...config,
      banner: {
        ...config.banner,
        themes: updatedThemes,
        forcedTheme:
          config.banner.forcedTheme === keyToDelete
            ? remainingKeys[0]
            : config.banner.forcedTheme,
      },
    });
    setSelectedThemeKey(remainingKeys[0]);
  };

  const updateCurrentThemeField = (field: keyof ThemeConfig, value: any) => {
    setConfig({
      ...config,
      banner: {
        ...config.banner,
        themes: {
          ...config.banner.themes,
          [selectedThemeKey]: {
            ...config.banner.themes[selectedThemeKey],
            [field]: value,
          },
        },
      },
    });
  };

  const handleItemChange = (index: number, field: 'sticker' | 'text', val: string) => {
    const currentItems = [...(config.banner.themes[selectedThemeKey]?.items || [])];
    currentItems[index] = { ...currentItems[index], [field]: val };
    updateCurrentThemeField('items', currentItems);
  };

  const handleAddItem = () => {
    const currentItems = [...(config.banner.themes[selectedThemeKey]?.items || [])];
    currentItems.push({ sticker: '⭐', text: 'NEW BANNER ITEM' });
    updateCurrentThemeField('items', currentItems);
  };

  const handleDeleteItem = (index: number) => {
    const currentItems = [...(config.banner.themes[selectedThemeKey]?.items || [])];
    currentItems.splice(index, 1);
    updateCurrentThemeField('items', currentItems);
  };

  const getActiveThemeKey = (): string => {
    const b = config.banner;
    if (!b || !b.themes) return '';
    if (b.activeMode === 'manual' && b.forcedTheme && b.themes[b.forcedTheme]) {
      return b.forcedTheme;
    }
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    let targetKey = 'default';
    if ((month === 12 && day >= 1) || (month === 1 && day <= 5)) targetKey = 'christmas';
    else if ((month === 10 && day >= 1) || (month === 11 && day <= 5))
      targetKey = 'halloween';

    if (b.themes[targetKey]) return targetKey;
    const keys = Object.keys(b.themes);
    return keys.length > 0 ? keys[0] : '';
  };

  const activeThemeKey = getActiveThemeKey();
  const previewTheme = config.banner?.themes
    ? config.banner.themes[activeThemeKey]
    : undefined;
  const isHex = (val: string) => val?.startsWith('#') || val?.startsWith('rgb');

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-zinc-600 flex items-center justify-center font-mono text-xs tracking-widest uppercase">
        <div className="animate-pulse text-sky-600">Loading Configuration...</div>
      </div>
    );
  }

  const currentTheme = config.banner.themes[selectedThemeKey] || {
    bg: '#ffffff',
    border: '#e4e4e7',
    text: '#18181b',
    separator: '#0ea5e9',
    items: [],
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans p-4 sm:p-10 relative overflow-hidden">
      <style>{`
        @keyframes pingPongMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-smooth-marquee {
          display: flex;
          width: max-content;
          animation: pingPongMarquee 15s ease-in-out infinite alternate;
          will-change: transform;
        }
      `}</style>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        {/* LIVE PREVIEW SECTION */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">
            Live Storefront Preview:
          </label>
          <div className="border border-zinc-300 rounded overflow-hidden shadow-sm bg-zinc-950">
            {previewTheme && previewTheme.items && previewTheme.items.length > 0 ? (
              <div
                style={
                  isHex(previewTheme.bg)
                    ? { backgroundColor: previewTheme.bg, borderColor: previewTheme.border }
                    : undefined
                }
                className={
                  'w-full overflow-hidden ' +
                  (!isHex(previewTheme.bg) ? previewTheme.bg : '') +
                  ' border-b ' +
                  (!isHex(previewTheme.border) ? previewTheme.border : 'border-zinc-800') +
                  ' h-6 relative flex items-center shadow-inner'
                }
              >
                <div className="animate-smooth-marquee flex items-center">
                  <div className="flex items-center shrink-0">
                    {previewTheme.items.map((item, idx) => (
                      <div
                        key={'preview-a-' + idx}
                        className="flex items-center gap-2 px-6 shrink-0"
                      >
                        <span className="text-[11px] leading-none">{item.sticker}</span>
                        <span
                          style={
                            isHex(previewTheme.text)
                              ? { color: previewTheme.text }
                              : undefined
                          }
                          className={
                            (!isHex(previewTheme.text) ? previewTheme.text : '') +
                            ' font-semibold text-[9px] tracking-[0.15em] uppercase'
                          }
                        >
                          {item.text}
                        </span>
                        <div
                          style={
                            isHex(previewTheme.separator)
                              ? { backgroundColor: previewTheme.separator }
                              : undefined
                          }
                          className={
                            'h-1 w-1 rounded-full ' +
                            (!isHex(previewTheme.separator)
                              ? previewTheme.separator
                              : 'bg-sky-500') +
                            ' ml-3'
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center shrink-0" aria-hidden="true">
                    {previewTheme.items.map((item, idx) => (
                      <div
                        key={'preview-b-' + idx}
                        className="flex items-center gap-2 px-6 shrink-0"
                      >
                        <span className="text-[11px] leading-none">{item.sticker}</span>
                        <span
                          style={
                            isHex(previewTheme.text)
                              ? { color: previewTheme.text }
                              : undefined
                          }
                          className={
                            (!isHex(previewTheme.text) ? previewTheme.text : '') +
                            ' font-semibold text-[9px] tracking-[0.15em] uppercase'
                          }
                        >
                          {item.text}
                        </span>
                        <div
                          style={
                            isHex(previewTheme.separator)
                              ? { backgroundColor: previewTheme.separator }
                              : undefined
                          }
                          className={
                            'h-1 w-1 rounded-full ' +
                            (!isHex(previewTheme.separator)
                              ? previewTheme.separator
                              : 'bg-sky-500') +
                            ' ml-3'
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-6 bg-zinc-950 text-zinc-500 text-[10px] flex items-center justify-center font-mono">
                NO ACTIVE BANNER THEME
              </div>
            )}
          </div>
        </div>

        {/* HEADER & SAVE BUTTON */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-zinc-200 pb-5 gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-wider text-zinc-900 uppercase font-mono">
              Store Parts Dashboard
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Mobile-optimized manager for top banners and footer settings.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-widest py-3 sm:py-2.5 px-6 transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-sm rounded w-full sm:w-auto"
          >
            {saving ? 'Syncing...' : 'Save Configuration'}
          </button>
        </div>

        {message && (
          <div
            className={
              'p-4 text-xs font-mono border rounded ' +
              (message.type === 'success'
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : 'bg-red-50 border-red-200 text-red-800')
            }
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* SECTION 1: TOP BANNER & THEME EVENTS MANAGER */}
          <section className="bg-zinc-50 border border-zinc-200 p-4 sm:p-6 rounded space-y-6 shadow-sm">
            <h2 className="text-xs font-bold font-mono tracking-[0.2em] text-sky-600 uppercase">
              Banner Theme Events Manager
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Active Mode
                </label>
                <select
                  value={config.banner?.activeMode || 'auto'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      banner: { ...config.banner, activeMode: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                >
                  <option value="auto">Auto (Date-Based Detection)</option>
                  <option value="manual">Manual (Forced Theme)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Forced Theme Key
                </label>
                <select
                  value={config.banner?.forcedTheme || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      banner: { ...config.banner, forcedTheme: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                >
                  <option value="">-- Select Theme --</option>
                  {Object.keys(config.banner.themes || {}).map((thKey) => (
                    <option key={thKey} value={thKey}>
                      {thKey}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* THEME TABS & CREATION */}
            <div className="pt-4 border-t border-zinc-200 space-y-3">
              <label className="block text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
                Select Theme Event:
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(config.banner.themes || {}).map((thKey) => (
                  <button
                    key={thKey}
                    type="button"
                    onClick={() => setSelectedThemeKey(thKey)}
                    className={
                      'px-4 py-2.5 sm:py-2 text-xs font-mono uppercase tracking-wider transition-all rounded cursor-pointer ' +
                      (selectedThemeKey === thKey
                        ? 'bg-sky-600 text-white shadow-sm font-bold'
                        : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100')
                    }
                  >
                    {thKey}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <input
                  type="text"
                  placeholder="New theme name (e.g. summer_sale)"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
                <button
                  type="button"
                  onClick={handleAddTheme}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest px-5 py-3 sm:py-2 rounded shrink-0 cursor-pointer"
                >
                  + Add Event
                </button>
              </div>
            </div>

            {selectedThemeKey && config.banner.themes[selectedThemeKey] && (
              <div className="p-4 sm:p-5 bg-white border border-zinc-200 rounded space-y-5 mt-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-mono font-bold uppercase text-sky-700">
                    Editing Event: <span className="underline">{selectedThemeKey}</span>
                  </h3>
                  {Object.keys(config.banner.themes).length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTheme(selectedThemeKey)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-mono uppercase font-semibold px-3 py-1.5 rounded cursor-pointer"
                    >
                      Delete Theme Event
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-500 mb-1 font-mono">
                      Background Color / Tailwind
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={
                          currentTheme.bg?.startsWith('#') ? currentTheme.bg : '#000000'
                        }
                        onChange={(e) => updateCurrentThemeField('bg', e.target.value)}
                        className="w-10 h-10 p-0.5 border border-zinc-300 rounded bg-white cursor-pointer shrink-0"
                        title="Pick background color"
                      />
                      <input
                        type="text"
                        value={currentTheme.bg}
                        onChange={(e) => updateCurrentThemeField('bg', e.target.value)}
                        placeholder="#000000 or bg-zinc-900"
                        className="w-full bg-zinc-50 border border-zinc-300 text-base sm:text-xs text-zinc-900 p-2.5 sm:p-2 font-mono rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-zinc-500 mb-1 font-mono">
                      Text Color / Tailwind
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={
                          currentTheme.text?.startsWith('#')
                            ? currentTheme.text
                            : '#ffffff'
                        }
                        onChange={(e) => updateCurrentThemeField('text', e.target.value)}
                        className="w-10 h-10 p-0.5 border border-zinc-300 rounded bg-white cursor-pointer shrink-0"
                        title="Pick text color"
                      />
                      <input
                        type="text"
                        value={currentTheme.text}
                        onChange={(e) => updateCurrentThemeField('text', e.target.value)}
                        placeholder="#ffffff or text-cyan-400"
                        className="w-full bg-zinc-50 border border-zinc-300 text-base sm:text-xs text-zinc-900 p-2.5 sm:p-2 font-mono rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-700 font-bold font-mono">
                      Banner Words &amp; Stickers
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] uppercase tracking-widest px-4 py-2 rounded shadow-sm cursor-pointer"
                    >
                      + Add Item Phrase
                    </button>
                  </div>

                  <div className="space-y-3">
                    {currentTheme.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-zinc-50 p-3.5 border border-zinc-200 rounded-lg shadow-xs"
                      >
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={item.sticker}
                            onChange={(e) =>
                              handleItemChange(idx, 'sticker', e.target.value)
                            }
                            className="w-20 bg-white border border-zinc-300 text-center text-lg p-2.5 sm:p-1.5 rounded font-mono shrink-0"
                            title="Sticker / Emoji"
                          />
                          <span className="text-[10px] uppercase text-zinc-400 font-mono sm:hidden">
                            Sticker / Emoji
                          </span>
                        </div>

                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => handleItemChange(idx, 'text', e.target.value)}
                          className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2 font-mono rounded"
                          placeholder="Banner text phrase..."
                        />

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 sm:bg-transparent sm:text-red-500 sm:hover:text-red-700 text-xs py-2 px-3 sm:px-2 rounded font-bold font-mono flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: FOOTER CONTACT */}
          <section className="bg-zinc-50 border border-zinc-200 p-4 sm:p-6 rounded space-y-4 shadow-sm">
            <h2 className="text-xs font-bold font-mono tracking-[0.2em] text-sky-600 uppercase">
              Footer Contact Nodes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={config.footer?.contact?.phone || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        contact: { ...config.footer.contact, phone: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Contact Email / Domain
                </label>
                <input
                  type="text"
                  value={config.footer?.contact?.email || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        contact: { ...config.footer.contact, email: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Physical Location
                </label>
                <input
                  type="text"
                  value={config.footer?.contact?.address || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        contact: { ...config.footer.contact, address: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: SOCIAL & COPYRIGHT */}
          <section className="bg-zinc-50 border border-zinc-200 p-4 sm:p-6 rounded space-y-4 shadow-sm">
            <h2 className="text-xs font-bold font-mono tracking-[0.2em] text-sky-600 uppercase">
              Social Channels &amp; Copyright
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Facebook URL
                </label>
                <input
                  type="text"
                  value={config.footer?.socials?.facebook || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        socials: { ...config.footer.socials, facebook: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Twitter / X URL
                </label>
                <input
                  type="text"
                  value={config.footer?.socials?.twitter || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        socials: { ...config.footer.socials, twitter: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  Instagram URL
                </label>
                <input
                  type="text"
                  value={config.footer?.socials?.instagram || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        socials: { ...config.footer.socials, instagram: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                  YouTube URL
                </label>
                <input
                  type="text"
                  value={config.footer?.socials?.youtube || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        socials: { ...config.footer.socials, youtube: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
                Copyright Footer Text
              </label>
              <input
                type="text"
                value={config.footer?.copyrightText || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    footer: { ...config.footer, copyrightText: e.target.value },
                  })
                }
                className="w-full bg-white border border-zinc-300 text-base sm:text-xs text-zinc-900 p-3 sm:p-2.5 focus:outline-none focus:border-sky-600 font-mono rounded"
              />
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-sm rounded w-full sm:w-auto"
            >
              {saving ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Parts;
