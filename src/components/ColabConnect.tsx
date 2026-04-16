'use client';

import { useState } from 'react';
import type { KernelStatus } from '@/hooks/useColabKernel';

/* ── Colab 셋업 셀 코드 ───────────────────────────────
   사용자가 Colab에 붙여넣고 실행하는 코드
──────────────────────────────────────────────────── */
const SETUP_CODE = `# ✅ 웹앱 코랩 연결 셋업 — 이 셀 전체를 실행하세요 (Shift+Enter)
# Cloudflare Tunnel 사용 (무료, 계정/설치 불필요)
import subprocess, threading, re, sys, io, traceback, base64

# 패키지 설치
subprocess.run(['pip','install','flask','flask-cors','-q'], capture_output=True)

# matplotlib 백엔드를 Agg로 설정 (화면 없이 이미지 저장 가능)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.show = lambda *a, **k: None  # plt.show() 호출 시 그림이 사라지지 않도록
subprocess.run(['wget','-q','-O','/tmp/cloudflared.deb',
    'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb'],
    capture_output=True)
subprocess.run(['dpkg','-i','/tmp/cloudflared.deb'], capture_output=True)

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins='*')
_ctx = {}  # 세션 내 변수 상태 유지

@app.route('/ping')
def ping():
    return jsonify({'status': 'ok'})

@app.route('/execute', methods=['POST'])
def execute():
    code = request.json.get('code', '')
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = io.StringIO(), io.StringIO()
    success, images = True, []
    try:
        exec(compile(code, '<cell>', 'exec'), _ctx)
        try:
            import matplotlib.pyplot as plt
            for n in plt.get_fignums():
                buf = io.BytesIO()
                plt.figure(n).savefig(buf, format='png', bbox_inches='tight', dpi=100)
                images.append(base64.b64encode(buf.getvalue()).decode())
            plt.close('all')
        except: pass
    except:
        success = False
    out, err = sys.stdout.getvalue(), sys.stderr.getvalue()
    sys.stdout, sys.stderr = old_out, old_err
    return jsonify({'output': out,
                    'error': traceback.format_exc() if not success else '',
                    'success': success, 'images': images})

@app.route('/reset', methods=['POST'])
def reset():
    _ctx.clear()
    return jsonify({'status': 'ok'})

# Flask 백그라운드 실행
threading.Thread(
    target=lambda: app.run(host='0.0.0.0', port=5000, use_reloader=False, debug=False),
    daemon=True).start()

import time; time.sleep(1)

# Cloudflare Quick Tunnel (계정 불필요)
_url_ready = threading.Event()
_tunnel_url = [None]

def _start_tunnel():
    proc = subprocess.Popen(
        ['cloudflared','tunnel','--url','http://localhost:5000'],
        stderr=subprocess.PIPE, text=True)
    for line in proc.stderr:
        m = re.search(r'https://[a-zA-Z0-9-]+\\.trycloudflare\\.com', line)
        if m:
            _tunnel_url[0] = m.group(0)
            _url_ready.set()
            break

threading.Thread(target=_start_tunnel, daemon=True).start()
_url_ready.wait(timeout=30)
url = _tunnel_url[0]

print(f"\\n{'='*55}\\n✅  연결 완료!\\n🔗  URL: {url}\\n{'='*55}")
print("\\n위 URL을 웹앱의 코랩 연결 창에 붙여넣으세요.")
print("⚠️   이 Colab 탭을 닫지 마세요 (닫으면 연결 끊김)")

try:
    from google.colab import output as _o
    _o.eval_js(f"if(window.opener)window.opener.postMessage({{type:'colab-url',url:'{url}'}},'*')")
except: pass`.trim();

interface Props {
  status:   KernelStatus;
  errorMsg: string | null;
  onConnect: (url: string) => void;
  onClose:   () => void;
}

/* ── 단계 배지 ── */
function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-[11px] font-bold mt-0.5 ${
      done ? 'bg-[#1a1918] text-white' : 'bg-[#f0ede8] text-[#97938c]'
    }`}>{done ? '✓' : n}</span>
  );
}

export default function ColabConnect({ status, errorMsg, onConnect, onClose }: Props) {
  const [url,      setUrl]      = useState('');
  const [copied,   setCopied]   = useState(false);

  const isConnecting = status === 'connecting';
  const isConnected  = status === 'connected';

  function handleCopy() {
    navigator.clipboard.writeText(SETUP_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSubmit() {
    if (!url.trim()) return;
    onConnect(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded w-[580px] max-h-[90vh] flex flex-col shadow-2xl border border-[#e4e1da] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#eceae5] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1a1918]">Google Colab 연결</h2>
            <p className="text-[12px] text-[#97938c] mt-0.5">
              코드를 내 Colab에서 실행합니다 — 서버 비용 없음, GPU 무료
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#97938c] hover:text-[#1a1918] hover:bg-[#f0ede8] transition-colors text-[20px] leading-none"
          >×</button>
        </div>

        {/* ── 스텝 가이드 ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7">

          {/* STEP 1 */}
          <div className="flex gap-4">
            <StepBadge n={1} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#1a1918] mb-1">Google Colab 새 노트북 열기</p>
              <p className="text-[12px] text-[#97938c] mb-3 leading-relaxed">
                아래 버튼으로 Colab을 열고 새 노트북을 만드세요.<br/>
                <span className="text-[#c3bfb8]">기존 계정이 있으면 바로 사용 가능합니다.</span>
              </p>
              <a
                href="https://colab.research.google.com/#create=true"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#f9f8f6] border border-[#e4e1da] text-[12px] font-medium text-[#1a1918] hover:bg-[#f0ede8] transition-colors"
              >
                <span>↗</span> Colab 열기
              </a>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="flex gap-4">
            <StepBadge n={2} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#1a1918] mb-1">셋업 코드 복사 후 셀에 붙여넣고 실행</p>
              <p className="text-[12px] text-[#97938c] mb-3 leading-relaxed">
                아래 코드를 복사해서 Colab 셀에 붙여넣은 뒤<br/>
                <kbd className="bg-[#f0ede8] text-[#3a3835] px-1.5 py-0.5 rounded text-[11px] font-mono">Shift</kbd>
                {' + '}
                <kbd className="bg-[#f0ede8] text-[#3a3835] px-1.5 py-0.5 rounded text-[11px] font-mono">Enter</kbd>
                {' 또는 ▶ 버튼으로 실행하세요.'}
              </p>

              {/* 코드 블록 */}
              <div className="rounded border border-[#e4e1da] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-[#f5f3ef] border-b border-[#e4e1da]">
                  <span className="text-[10px] font-semibold text-[#97938c] uppercase tracking-[0.12em]">셋업 코드</span>
                  <button
                    onClick={handleCopy}
                    className={`text-[11px] font-medium px-3 py-1 rounded transition-colors ${
                      copied
                        ? 'bg-[#1a1918] text-white'
                        : 'bg-white border border-[#e4e1da] text-[#97938c] hover:text-[#1a1918] hover:border-[#c3bfb8]'
                    }`}
                  >
                    {copied ? '✓ 복사됨' : '복사'}
                  </button>
                </div>
                <pre className="px-4 py-3 text-[11.5px] font-mono text-[#3a3835] leading-relaxed overflow-x-auto bg-[#faf9f7] max-h-[200px] overflow-y-auto">
                  <code>{SETUP_CODE}</code>
                </pre>
              </div>

              <p className="text-[11px] text-[#97938c] mt-2">
                ※ 패키지 설치로 첫 실행은 30~60초 소요됩니다.
              </p>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="flex gap-4">
            <StepBadge n={3} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#1a1918] mb-1">출력된 URL을 여기에 붙여넣기</p>
              <p className="text-[12px] text-[#97938c] mb-3 leading-relaxed">
                Colab 셀 실행 후 아래와 같이 URL이 출력됩니다.
              </p>

              {/* URL 출력 예시 */}
              <div className="rounded bg-[#1a1918] px-4 py-3 mb-3 font-mono text-[12px] leading-relaxed">
                <span className="text-[#6a6561]">{'═'.repeat(23)}</span>
                <br/>
                <span className="text-[#4caf76]">✅  연결 완료!</span>
                <br/>
                <span className="text-[#7ab8e8]">🔗  URL: </span>
                <span className="text-[#e8c97a]">https://abc-def-123.trycloudflare.com</span>
                <br/>
                <span className="text-[#6a6561]">{'═'.repeat(23)}</span>
              </div>

              {/* URL 입력 + 연결 버튼 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="https://abc-def-123.trycloudflare.com"
                  className="flex-1 bg-[#f9f8f6] border border-[#e4e1da] rounded px-4 py-2.5 text-[13px] text-[#1a1918] placeholder-[#c3bfb8] focus:outline-none focus:border-[#1a1918] transition-colors font-mono"
                />
                <button
                  onClick={handleSubmit}
                  disabled={isConnecting || !url.trim()}
                  className={`px-5 py-2.5 rounded text-[13px] font-medium transition-colors flex items-center gap-2 ${
                    isConnecting
                      ? 'bg-[#f0ede8] text-[#97938c] cursor-not-allowed'
                      : 'border border-[#1a1918] text-[#1a1918] hover:bg-[#f0ede8] disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-[#97938c] border-t-transparent rounded-full animate-spin" />
                      연결 중
                    </>
                  ) : '연결하기'}
                </button>
              </div>

              {/* 오류 메시지 */}
              {status === 'error' && errorMsg && (
                <div className="mt-3 px-4 py-2.5 rounded bg-[#fdf5f3] border border-[#e8b4a8]">
                  <p className="text-[12px] text-[#b04030]">{errorMsg}</p>
                </div>
              )}
            </div>
          </div>

          {/* 연결 성공 */}
          {isConnected && (
            <div className="flex gap-4">
              <StepBadge n={4} done />
              <div>
                <p className="text-[13px] font-semibold text-[#1a1918] mb-1">연결 완료!</p>
                <p className="text-[12px] text-[#97938c]">
                  이제 각 코드 블록의 ▶ 실행 버튼을 눌러 Colab에서 코드를 실행할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div className="flex-shrink-0 px-7 py-4 border-t border-[#eceae5] flex items-center justify-between bg-[#faf9f7]">
          <p className="text-[11px] text-[#c3bfb8] leading-relaxed">
            Colab 탭을 닫지 않는 한 세션이 유지됩니다.<br/>
            세션이 끊기면 셋업 셀을 다시 실행하세요.
          </p>
          {isConnected && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded border border-[#1a1918] text-[#1a1918] text-[12px] font-medium hover:bg-[#f0ede8] transition-colors"
            >
              학습 시작 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
