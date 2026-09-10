// src/pages/Home.tsx
import React, { useState, useEffect, useCallback } from 'react';

interface BackgroundConfig {
  type: string;
  source: string;
  fallbackImage: string;
}

interface HeroConfig {
  badgeText: string;
  badgeFontFamily: string;
  titleTop: string;
  titleBottom: string;
  titleFontFamily: string;
  heading: string;
  headingFontFamily: string;
  narrative: string;
  narrativeFontFamily: string;
  ctaText: string;
  ctaPath: string;
  background: BackgroundConfig;
}

interface CategoryCard {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  path: string;
  fontFamily?: string;
}

interface CarouselConfig {
  eyebrow: string;
  title: string;
  cards: CategoryCard[];
}

interface StatItem {
  number: string;
  label: string;
}

interface StatsConfig {
  eyebrow: string;
  heading: string;
  items: StatItem[];
}

interface HomeContent {
  hero: HeroConfig;
  carousel: CarouselConfig;
  stats: StatsConfig;
}

// 🔥 DYNAMIC PERMANENT FIX for Home Editor (Cleaned single slash)
const getApiBaseUrl = () => {
  return 'https://cc-backend-yc-team.onrender.com/api/v1';
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

const AVAILABLE_FONTS = [
  { label: 'Adorn Serif (Family)', value: '"Adorn Serif", serif' },
  { label: 'Avallon (Welcome)', value: 'Avallon, cursive, sans-serif' },
  { label: 'Taberna (Faith)', value: 'Taberna, sans-serif' },
  { label: 'Brushability (Love)', value: 'Brushability, cursive' },
  { label: 'Beloved (Mr and Mrs)', value: 'Beloved, sans-serif' },
  { label: 'La Parisienne (Celebrate)', value: '"La Parisienne", cursive' },
  { label: 'Golden Youth Caps (Happy Place)', value: '"Golden Youth Caps", sans-serif' },
  { label: 'Flamingo (Grace)', value: 'Flamingo, cursive' },
  { label: 'Northern Soul (Wild at Heart)', value: '"Northern Soul", sans-serif' },
  { label: 'Kathya Script (Farmhouse)', value: '"Kathya Script", cursive' },
  { label: 'Fairwater (Est. 2009)', value: 'Fairwater, serif' },
  { label: 'Isabella Script (Journey)', value: '"Isabella Script", cursive' },
  { label: 'Microbrew (Blessed)', value: 'Microbrew, sans-serif' },
  { label: 'Octavia Script (Create)', value: '"Octavia Script", cursive' },
  { label: 'Adorn Condensed (Together)', value: '"Adorn Condensed", sans-serif' },
  { label: 'Buttermilk Farmhouse (Beach House)', value: '"Buttermilk Farmhouse", cursive' },
  { label: 'Charcuterie (Grateful)', value: 'Charcuterie, serif' },
  { label: 'Legend Script (Little One)', value: '"Legend Script", cursive' },
  { label: 'Midnight Owl (Home)', value: '"Midnight Owl", serif' },
  { label: 'Ragazza (Gather)', value: 'Ragazza, cursive' },
];

const Home: React.FC = () => {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const fetchContent = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(API_BASE_URL + '/home', {
        method: 'GET',
        signal: controller.signal,
        headers: getAuthHeaders(),
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to fetch home content'));
      }

      const hero = data.hero || {};
      const normalizedHero: HeroConfig = {
        ...hero,
        badgeFontFamily: hero.badgeFontFamily || hero.fontFamily || '"Kathya Script", cursive',
        titleFontFamily: hero.titleFontFamily || hero.fontFamily || '"Kathya Script", cursive',
        headingFontFamily: hero.headingFontFamily || hero.fontFamily || '"Kathya Script", cursive',
        narrativeFontFamily:
          hero.narrativeFontFamily || hero.fontFamily || '"Kathya Script", cursive',
      };
      delete (normalizedHero as any).fontFamily;

      setContent({ ...data, hero: normalizedHero });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Connection timed out.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Error loading content' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setSaving(true);
    setMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(API_BASE_URL + '/home', {
        method: 'PUT',
        signal: controller.signal,
        headers: getAuthHeaders(),
        body: JSON.stringify(content),
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to update home content'));
      }

      setContent(data);
      setMessage({ type: 'success', text: 'Homepage updated successfully!' });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Connection timed out while saving.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Error saving content' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        callback(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="p-8 text-slate-800 font-medium">Loading homepage editor...</div>;
  }

  if (!content) {
    return (
      <div className="p-8 text-rose-600 font-medium">Failed to load content configuration.</div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto text-slate-900 bg-white rounded-xl shadow-xl border border-slate-200">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Home Page Customizer</h1>
          <p className="text-sm text-slate-500">
            Modify hero sections, typography, curated cards, and global stats instantly.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving Changes...' : 'Save All Changes'}
        </button>
      </div>

      {message && (
        <div
          className={
            'p-4 mb-6 rounded-lg text-sm font-medium ' +
            (message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200')
          }
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* HERO SECTION */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-indigo-600">Hero Section Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Badge Text
              </label>
              <input
                type="text"
                value={content.hero.badgeText}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, badgeText: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Badge Font Family
              </label>
              <select
                value={content.hero.badgeFontFamily}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, badgeFontFamily: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Heading
              </label>
              <input
                type="text"
                value={content.hero.heading}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, heading: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Heading Font Family
              </label>
              <select
                value={content.hero.headingFontFamily}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, headingFontFamily: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Title Top
              </label>
              <input
                type="text"
                value={content.hero.titleTop}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, titleTop: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Title Bottom
              </label>
              <input
                type="text"
                value={content.hero.titleBottom}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, titleBottom: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Title Font Family (Top & Bottom)
              </label>
              <select
                value={content.hero.titleFontFamily}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, titleFontFamily: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Narrative Description
              </label>
              <textarea
                rows={3}
                value={content.hero.narrative}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, narrative: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Narrative Font Family
              </label>
              <select
                value={content.hero.narrativeFontFamily}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, narrativeFontFamily: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={content.hero.ctaText}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, ctaText: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                CTA Destination Path
              </label>
              <input
                type="text"
                value={content.hero.ctaPath}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, ctaPath: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Background Media / Video (URL or Gallery File)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter URL or upload file"
                  value={content.hero.background.source}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: {
                        ...content.hero,
                        background: { ...content.hero.background, source: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 text-sm"
                />
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      setContent({
                        ...content,
                        hero: {
                          ...content.hero,
                          background: { ...content.hero.background, source: url },
                        },
                      });
                    })
                  }
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Fallback Image (URL or Gallery File)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter URL or upload file"
                  value={content.hero.background.fallbackImage}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: {
                        ...content.hero,
                        background: {
                          ...content.hero.background,
                          fallbackImage: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 text-sm"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      setContent({
                        ...content,
                        hero: {
                          ...content.hero,
                          background: { ...content.hero.background, fallbackImage: url },
                        },
                      });
                    })
                  }
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CAROUSEL */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-indigo-600">
            Curated Collections Carousel
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Section Eyebrow
              </label>
              <input
                type="text"
                value={content.carousel.eyebrow}
                onChange={(e) =>
                  setContent({
                    ...content,
                    carousel: { ...content.carousel, eyebrow: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Section Title
              </label>
              <input
                type="text"
                value={content.carousel.title}
                onChange={(e) =>
                  setContent({
                    ...content,
                    carousel: { ...content.carousel, title: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            Cards Configuration
          </h3>
          <div className="space-y-4">
            {content.carousel.cards.map((card, index) => (
              <div
                key={card.id}
                className="p-4 bg-white rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center shadow-xs"
              >
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => {
                      const newCards = [...content.carousel.cards];
                      newCards[index].title = e.target.value;
                      setContent({
                        ...content,
                        carousel: { ...content.carousel, cards: newCards },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={card.subtitle}
                    onChange={(e) => {
                      const newCards = [...content.carousel.cards];
                      newCards[index].subtitle = e.target.value;
                      setContent({
                        ...content,
                        carousel: { ...content.carousel, cards: newCards },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Card Font Family</label>
                  <select
                    value={card.fontFamily || '"Adorn Serif", serif'}
                    onChange={(e) => {
                      const newCards = [...content.carousel.cards];
                      newCards[index].fontFamily = e.target.value;
                      setContent({
                        ...content,
                        carousel: { ...content.carousel, cards: newCards },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm"
                  >
                    {AVAILABLE_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Card Image (URL or Gallery)
                  </label>
                  <input
                    type="text"
                    value={card.image}
                    onChange={(e) => {
                      const newCards = [...content.carousel.cards];
                      newCards[index].image = e.target.value;
                      setContent({
                        ...content,
                        carousel: { ...content.carousel, cards: newCards },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm mb-1"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(e, (url) => {
                        const newCards = [...content.carousel.cards];
                        newCards[index].image = url;
                        setContent({
                          ...content,
                          carousel: { ...content.carousel, cards: newCards },
                        });
                      })
                    }
                    className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={card.description}
                    onChange={(e) => {
                      const newCards = [...content.carousel.cards];
                      newCards[index].description = e.target.value;
                      setContent({
                        ...content,
                        carousel: { ...content.carousel, cards: newCards },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Path URL</label>
                  <input
                    type="text"
                    value={card.path}
                    onChange={(e) => {
                      const newCards = [...content.carousel.cards];
                      newCards[index].path = e.target.value;
                      setContent({
                        ...content,
                        carousel: { ...content.carousel, cards: newCards },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-indigo-600">
            Statistics Section Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Stats Eyebrow
              </label>
              <input
                type="text"
                value={content.stats.eyebrow}
                onChange={(e) =>
                  setContent({
                    ...content,
                    stats: { ...content.stats, eyebrow: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Stats Heading
              </label>
              <input
                type="text"
                value={content.stats.heading}
                onChange={(e) =>
                  setContent({
                    ...content,
                    stats: { ...content.stats, heading: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            Stat Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {content.stats.items.map((stat, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs"
              >
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Number / Metric</label>
                  <input
                    type="text"
                    value={stat.number}
                    onChange={(e) => {
                      const newItems = [...content.stats.items];
                      newItems[index].number = e.target.value;
                      setContent({
                        ...content,
                        stats: { ...content.stats, items: newItems },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) => {
                      const newItems = [...content.stats.items];
                      newItems[index].label = e.target.value;
                      setContent({
                        ...content,
                        stats: { ...content.stats, items: newItems },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-semibold transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving All Changes...' : 'Save All Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Home;