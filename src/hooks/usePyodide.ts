'use client';

import { useState, useRef, useCallback } from 'react';
import type { ExecResult } from './useColabKernel';

export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PyodideAPI = any;

declare global {
  interface Window {
    loadPyodide: (opts: { indexURL: string }) => Promise<PyodideAPI>;
  }
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/';

export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>('idle');
  const pyRef    = useRef<PyodideAPI | null>(null);
  const loadingP = useRef<Promise<PyodideAPI | null> | null>(null);

  const ensureLoaded = useCallback((): Promise<PyodideAPI | null> => {
    if (pyRef.current) return Promise.resolve(pyRef.current);
    if (loadingP.current) return loadingP.current;

    loadingP.current = (async () => {
      setStatus('loading');
      try {
        /* CDN 스크립트 한 번만 주입 */
        if (!window.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = `${PYODIDE_CDN}pyodide.js`;
            s.onload  = () => resolve();
            s.onerror = () => reject(new Error('Pyodide CDN 로드 실패'));
            document.head.appendChild(s);
          });
        }
        const py = await window.loadPyodide({ indexURL: PYODIDE_CDN });
        pyRef.current = py;
        setStatus('ready');
        return py;
      } catch (err) {
        console.error('Pyodide load error:', err);
        setStatus('error');
        loadingP.current = null;
        return null;
      }
    })();

    return loadingP.current;
  }, []);

  const execute = useCallback(async (code: string): Promise<ExecResult> => {
    const py = await ensureLoaded();
    if (!py) {
      return { success: false, output: '', error: 'Python 환경을 불러오지 못했습니다.', images: [] };
    }

    const stdout: string[] = [];
    const stderr: string[] = [];

    try {
      py.setStdout({ batched: (s: string) => stdout.push(s) });
      py.setStderr({ batched: (s: string) => stderr.push(s) });
    } catch { /* 일부 버전 미지원 무시 */ }

    try {
      const result = await py.runPythonAsync(code);
      const out    = stdout.join('\n');
      const repr   = (result !== undefined && result !== null) ? String(result) : '';
      /* result 가 None(undefined)이거나 이미 출력에 포함된 경우 중복 방지 */
      const full   = [out, out.includes(repr) ? '' : repr].filter(Boolean).join('\n').trimEnd();
      return { success: true, output: full, error: '', images: [] };
    } catch (err) {
      const errText = stderr.join('\n') || String(err);
      return { success: false, output: '', error: errText, images: [] };
    }
  }, [ensureLoaded]);

  return { status, execute, ensureLoaded };
}
