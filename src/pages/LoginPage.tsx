// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setSession } from '../utils/auth';

// 🔥 DYNAMIC PERMANENT FIX for Admin Login (Cleaned single slash)
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

const LoginPage: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    habits: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const nextStep = () => {
    if (step === 1 && !formData.fullName.trim()) {
      setError('Identity verification required.');
      return;
    }
    if (step === 2 && (!formData.birthday || !formData.habits.trim())) {
      setError('All security fields are required.');
      return;
    }
    setError('');
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError('');
    setStep((prev) => prev - 1);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password.trim()) {
      setError('Password is required.');
      return;
    }

    setError('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(API_BASE_URL + '/auth/admin/login', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          birthday: formData.birthday,
          habits: formData.habits,
          email: formData.email,
          password: formData.password,
        }),
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Security verification failed.'));
      }

      const token = data.access_token || data.token;
      if (!token) {
        throw new Error('Login succeeded but no token was returned.');
      }

      setSession(token);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Connection timed out. Please try again.');
      } else {
        setError(err.message || 'Connection failed. Please check backend network.');
      }
      setStep(1);
      setFormData({ ...formData, password: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 sm:px-6 font-sans text-white selection:bg-white selection:text-black box-border overflow-x-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-white/[0.02] blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-[340px] sm:max-w-sm p-6 sm:p-8 bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.9)] relative z-10 transition-all duration-500 box-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tighter leading-none select-none">
            Counci<span className="font-light text-zinc-400">Croff</span>
          </h1>
          <p className="mt-2 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            Admin Gateway
          </p>

          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={
                  'h-1 rounded-full transition-all duration-500 ' +
                  (step >= num ? 'w-6 bg-white' : 'w-2 bg-zinc-800')
                }
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium shadow-inner animate-[pulse_2s_ease-in-out_infinite]">
            {error}
          </div>
        )}

        <form
          onSubmit={
            step === 3
              ? handleFinalSubmit
              : (e) => {
                  e.preventDefault();
                  nextStep();
                }
          }
          className="space-y-5"
        >
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-semibold pl-1">
                  Step 1: Authorized Identity
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white focus:bg-white/[0.05] transition-all placeholder:text-zinc-700 box-border"
                  placeholder="Enter full name"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-semibold pl-1">
                  Step 2a: Date of Birth
                </label>
                <input
                  type="text"
                  name="birthday"
                  required
                  value={formData.birthday}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white focus:bg-white/[0.05] transition-all placeholder:text-zinc-700 box-border"
                  placeholder="Enter Your BirthDate"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-semibold pl-1">
                  Step 2b: Registered Full name
                </label>
                <input
                  type="text"
                  name="habits"
                  required
                  value={formData.habits}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white focus:bg-white/[0.05] transition-all placeholder:text-zinc-700 box-border"
                  placeholder="Enter registered parameters"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-semibold pl-1">
                  Step 3: Valid Email
                </label>
                <input
                  type="text"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white focus:bg-white/[0.05] transition-all placeholder:text-zinc-700 mb-4 box-border"
                  placeholder="Enter authorized email"
                  disabled={loading}
                />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white focus:bg-white/[0.05] transition-all placeholder:text-zinc-700 box-border"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="px-4 sm:px-5 py-4 rounded-xl font-bold uppercase tracking-[0.15em] text-[10px] text-zinc-400 bg-white/5 hover:bg-white/10 transition-all border border-white/5 cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              type={step === 3 ? 'submit' : 'button'}
              onClick={step === 3 ? undefined : nextStep}
              disabled={loading}
              className="flex-1 px-6 py-4 rounded-xl font-bold uppercase tracking-[0.15em] text-[11px] text-black bg-white hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Verifying...
                </>
              ) : step === 3 ? (
                'Initiate Session'
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
