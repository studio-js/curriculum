'use client';

import { useState, useCallback, useEffect } from 'react';

export type KernelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ExecResult {
  output: string;
  error: string;
  success: boolean;
  images: string[]; // base64 PNG (matplotlib 등)
}

const STORAGE_KEY = 'colab-kernel-url';

/* ngrok 무료 플랜 경고 페이지 우회 헤더 */
const NGROK_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
};

export function useColabKernel() {
  const [status,   setStatus]   = useState<KernelStatus>('disconnected');
  const [url,      setUrl]      = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── 마운트: 저장된 URL로 재연결 시도 ── */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    (async () => {
      try {
        const res = await fetch(`${saved}/ping`, {
          headers: NGROK_HEADERS,
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          setUrl(saved);
          setStatus('connected');
          return;
        }
      } catch { /* 연결 불가 시 무시 */ }
      localStorage.removeItem(STORAGE_KEY);
    })();
  }, []);

  /* ── Colab 셋업 셀이 window.postMessage로 URL 전송 시 자동 연결 ── */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'colab-url' && typeof e.data.url === 'string') {
        connect(e.data.url);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 연결 ── */
  const connect = useCallback(async (inputUrl: string) => {
    const cleanUrl = inputUrl.trim().replace(/\/$/, '');
    setStatus('connecting');
    setErrorMsg(null);

    try {
      const res = await fetch(`${cleanUrl}/ping`, {
        headers: NGROK_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('unexpected response');

      setUrl(cleanUrl);
      setStatus('connected');
      localStorage.setItem(STORAGE_KEY, cleanUrl);
    } catch {
      setStatus('error');
      setErrorMsg('연결에 실패했습니다. Colab에서 설정 셀이 실행 중인지 확인하세요.');
    }
  }, []);

  /* ── 코드 실행 ── */
  const execute = useCallback(async (code: string): Promise<ExecResult> => {
    if (!url) {
      return { output: '', error: '코랩이 연결되지 않았습니다.', success: false, images: [] };
    }
    try {
      const res = await fetch(`${url}/execute`, {
        method: 'POST',
        headers: NGROK_HEADERS,
        body: JSON.stringify({ code }),
        signal: AbortSignal.timeout(120_000), // 최대 2분
      });
      const data = await res.json();
      return {
        output: data.output ?? '',
        error:  data.error  ?? '',
        success: data.success ?? true,
        images: data.images ?? [],
      };
    } catch {
      setStatus('error');
      return { output: '', error: '실행 중 연결이 끊겼습니다. 코랩을 다시 연결하세요.', success: false, images: [] };
    }
  }, [url]);

  /* ── 컨텍스트 초기화 ── */
  const reset = useCallback(async () => {
    if (!url) return;
    try {
      await fetch(`${url}/reset`, {
        method: 'POST',
        headers: NGROK_HEADERS,
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* 무시 */ }
  }, [url]);

  /* ── 연결 해제 ── */
  const disconnect = useCallback(() => {
    setUrl(null);
    setStatus('disconnected');
    setErrorMsg(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { status, url, errorMsg, connect, execute, reset, disconnect };
}
