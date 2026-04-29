'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function OnboardingPage() {
  const { user, profile, loading, isAdmin, refreshProfile } = useAuthContext();
  const router = useRouter();

  const [name,  setName]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    /* 이름이 이미 있으면 바로 통과 */
    if (profile?.name?.trim()) {
      router.replace(isAdmin ? '/admin' : '/curriculum');
    }
  }, [loading, user, profile, isAdmin, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !user) return;

    setBusy(true);
    setError('');
    try {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ name: trimmed })
        .eq('id', user.id);

      if (dbErr) throw dbErr;

      await refreshProfile();
      router.replace(isAdmin ? '/admin' : '/curriculum');
    } catch {
      setError('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || (profile?.name?.trim())) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center bg-[#f7f6f3] px-4">
      <div className="w-full max-w-[400px]">

        {/* 헤더 */}
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.22em] text-[#c3bfb8] uppercase font-medium mb-3">
            시작하기
          </p>
          <h1 className="text-[26px] font-bold text-[#1a1918] tracking-tight">
            반갑습니다
          </h1>
          <p className="text-[13px] text-[#97938c] mt-2 leading-relaxed">
            학습을 시작하기 전에 이름을 알려주세요.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e4e1da] shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 이름 입력 */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#97938c] uppercase tracking-[0.1em]">
                이름
              </label>
              <input
                type="text"
                autoFocus
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                maxLength={50}
                required
                className="w-full bg-[#f9f8f6] border border-[#e4e1da] rounded-xl px-4 py-3 text-[14px] text-[#1a1918] placeholder-[#c3bfb8] focus:outline-none focus:border-[#1a1918] transition-colors"
              />
            </div>

            {/* 이메일 표시 (읽기 전용) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#97938c] uppercase tracking-[0.1em]">
                이메일
              </label>
              <div className="w-full bg-[#f7f6f3] border border-[#e4e1da] rounded-xl px-4 py-3 text-[14px] text-[#97938c]">
                {profile?.email ?? user?.email ?? '—'}
              </div>
            </div>

            {/* 오류 */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-[#fdf5f3] border border-[#e8b4a8]">
                <p className="text-[12px] text-[#b04030]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="w-full py-3 rounded-xl bg-[#1a1918] text-white text-[14px] font-semibold tracking-[0.02em] hover:bg-[#2d2b29] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  저장 중…
                </>
              ) : '학습 시작하기 →'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#c3bfb8] mt-6">
          이름은 관리자와 수강생 관리에 활용됩니다.
        </p>
      </div>
    </div>
  );
}
