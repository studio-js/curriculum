'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, loginWithGoogle, loading, user } = useAuthContext();
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/curriculum');
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      router.replace('/curriculum');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? (err.message.includes('Invalid') ? '이메일 또는 비밀번호가 올바르지 않습니다.' : err.message)
          : '로그인에 실패했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    setError('');
    try {
      await loginWithGoogle();
      /* Google OAuth는 리다이렉트 방식이므로 여기서 멈춤 */
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.');
      setGoogleBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-[#f7f6f3] px-4">
      <div className="w-full max-w-[380px]">

        {/* 헤더 */}
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.22em] text-[#c3bfb8] uppercase font-medium mb-3">
            AI 데이터 인텔리전스
          </p>
          <h1 className="text-[26px] font-bold text-[#1a1918] tracking-tight">로그인</h1>
          <p className="text-[13px] text-[#97938c] mt-2">계속하려면 로그인하세요</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e4e1da] shadow-sm p-8 space-y-5">

          {/* Google 로그인 버튼 */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleBusy || busy}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#e4e1da] bg-white hover:bg-[#f7f6f3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {googleBusy ? (
              <span className="inline-block w-4 h-4 border-2 border-[#c3bfb8] border-t-[#1a1918] rounded-full animate-spin" />
            ) : (
              /* Google 로고 SVG */
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
            )}
            <span className="text-[14px] font-medium text-[#1a1918]">
              {googleBusy ? '연결 중…' : 'Google로 로그인'}
            </span>
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e4e1da]" />
            <span className="text-[11px] text-[#c3bfb8]">또는</span>
            <div className="flex-1 h-px bg-[#e4e1da]" />
          </div>

          {/* 이메일 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#97938c] uppercase tracking-[0.1em]">
                이메일
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-[#f9f8f6] border border-[#e4e1da] rounded-xl px-4 py-3 text-[14px] text-[#1a1918] placeholder-[#c3bfb8] focus:outline-none focus:border-[#1a1918] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#97938c] uppercase tracking-[0.1em]">
                비밀번호
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#f9f8f6] border border-[#e4e1da] rounded-xl px-4 py-3 text-[14px] text-[#1a1918] placeholder-[#c3bfb8] focus:outline-none focus:border-[#1a1918] transition-colors"
              />
            </div>

            {/* 오류 메시지 */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-[#fdf5f3] border border-[#e8b4a8]">
                <p className="text-[12px] text-[#b04030]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || googleBusy || !email.trim() || !password}
              className="w-full py-3 rounded-xl border border-[#1a1918] text-[#1a1918] text-[14px] font-semibold tracking-[0.02em] hover:bg-[#1a1918] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  로그인 중…
                </>
              ) : '이메일로 로그인'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#c3bfb8] mt-6 leading-relaxed">
          계정 문의: 관리자에게 연락하세요
        </p>
      </div>
    </div>
  );
}
