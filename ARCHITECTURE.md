# AI 데이터 인텔리전스 전문가 과정 — 아키텍처 문서

---

## 1. 전체 구성 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 브라우저                            │
│                                                                  │
│   Next.js 16 (App Router · SSG/CSR 혼합)                        │
│   ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│   │ 정적 페이지 │  │  인증 페이지  │  │     동적 학습 뷰어         │  │
│   │ (SSG)    │  │  (CSR)       │  │     (CSR + 외부 커널)      │  │
│   └──────────┘  └──────────────┘  └──────────────────────────┘  │
└───────────────────────┬─────────────────────────┬───────────────┘
                        │                         │
          ┌─────────────▼──────────┐   ┌──────────▼───────────┐
          │      Supabase          │   │    Google Colab        │
          │  ┌──────────────────┐  │   │  (사용자 직접 실행)     │
          │  │ Auth             │  │   │  Flask + Cloudflare    │
          │  │ (email / Google) │  │   │  Tunnel (무료 · 무설치) │
          │  ├──────────────────┤  │   └──────────────────────┘
          │  │ Database         │  │
          │  │ profiles         │  │
          │  │ lesson_notebooks │  │
          │  ├──────────────────┤  │
          │  │ Storage          │  │
          │  │ notebooks/ (.json│  │
          │  │ parsed sections) │  │
          │  └──────────────────┘  │
          └────────────────────────┘
```

**왜 이 구성인가?**
- **Next.js App Router** — 커리큘럼 데이터는 빌드 타임에 정적 생성(SSG)하여 Netlify에서 빠르게 서빙. 학습 뷰어만 CSR로 운영해 번들 크기 최적화.
- **Supabase** — 별도 백엔드 없이 Auth · DB · Storage를 단일 서비스로 해결. 인증 없이도 사이트는 정상 동작(graceful degradation).
- **Google Colab + Cloudflare Tunnel** — 코드 실행 서버를 직접 운영하지 않고, 수강생이 본인 Colab에서 Flask 서버를 띄워 무료로 GPU 환경을 사용.

---

## 2. 라우트 구조

```
/                          → 과정 소개 홈 (SSG)
│  course 메타 · 학습 역량 · 커리큘럼 미리보기
│
├── /login                 → 로그인 (CSR)
│     Supabase Auth (이메일 · Google OAuth)
│
├── /curriculum            → 전체 커리큘럼 목록 (SSG)
│     카테고리별 교과목 카드 그리드
│
└── /curriculum/[id]       → 교과목 상세 (SSG + CSR)
      generateStaticParams()로 빌드 타임 프리렌더링
      CSR: 노트북 다운로드 · 코드 실행 · 관리자 기능
```

**왜 SSG인가?** 커리큘럼 데이터(`src/data/curriculum.ts`)는 정적이므로 매 요청마다 렌더링할 이유가 없음. Netlify의 CDN에서 바로 서빙되므로 TTFB가 거의 0.

---

## 3. 데이터 레이어 파이프라인

### 3-1. 커리큘럼 정적 데이터 흐름

```
src/data/curriculum.ts
│  CurriculumData (CourseInfo + Subject[])
│    └── Subject[]
│          └── Node[]
│                └── Lesson[]  (title, hours, summary, objectives, notebookPath?)
│
├──▶ app/page.tsx            홈 — 하이라이트 · 통계 · 미리보기
├──▶ app/curriculum/page.tsx 전체 목록 — 카테고리 그룹핑
└──▶ app/curriculum/[id]/    교과목 상세 — SubjectLayout에 subject 객체 전달
```

**데이터를 파일로 관리하는 이유:** DB 대신 TypeScript 파일로 관리하면 타입 안전성 보장, IDE 자동완성, 빌드 타임 검증 가능. 커리큘럼 수정도 PR로 이력 관리.

### 3-2. 노트북 파이프라인 (업로드 → 학습)

```
관리자
  │
  │  .ipynb 파일 선택
  ▼
SubjectLayout.handleFileChange()
  │
  │  FileReader로 JSON 파싱
  ▼
notebookParser.parseNotebook()       ← src/lib/notebookParser.ts
  │  Jupyter cell[] → NotebookSection[]
  │  (markdown 셀 + code 셀을 논리 단위로 묶음)
  │  이미지 출력 → base64 Data URL 추출
  ▼
JSON.stringify(sections)
  │
  ▼
supabase.uploadNotebook()            ← src/lib/supabase.ts
  │  Storage: notebooks/{subject}/{lesson}.json
  │  DB: lesson_notebooks 테이블에 메타데이터 upsert
  ▼
수강생이 "학습하기" 클릭
  │
  ▼
supabase.downloadNotebook()
  │  Storage에서 JSON 다운로드
  ▼
JSON.parse() → NotebookSection[]
  │
  ▼
LessonViewer 렌더링
  ├── 좌측: ReactMarkdown (이론 설명)
  └── 우측: SyntaxHighlighter (코드 셀)
```

**파싱을 서버가 아닌 클라이언트에서 하는 이유:** 노트북 파일이 수백 KB일 수 있어 서버에 파싱 부담을 주지 않음. Supabase Storage는 파싱된 결과(.json)만 저장해 다운로드 속도 확보.

---

## 4. 인증 파이프라인

```
브라우저 진입
  │
  ▼
AuthContext.tsx (전역 Provider)
  │  supabase.auth.getSession() → 세션 복원
  │  supabase.auth.onAuthStateChange() → 실시간 감지
  │
  ├── 비로그인 + Supabase 설정됨
  │     → /curriculum/[id] 접근 시 /login 리다이렉트
  │
  ├── 로그인 성공
  │     → profiles 테이블에서 role 조회
  │     → isAdmin = (role === 'admin')
  │
  └── Supabase 미설정 (.env 없음)
        → configured = false → 인증 UI 숨김 (사이트 정상 동작)

Header 표시
  ├── 비로그인: "로그인" 버튼
  └── 로그인: email + 역할 배지 (관리자/수강생) + 로그아웃

SubjectLayout 표시 차이
  ├── 수강생: 학습하기 버튼 (노트북 있을 때)
  └── 관리자: 노트북 연결 · 삭제 · 라이브러리 관리 기능 추가
```

---

## 5. 코드 실행 파이프라인 (Colab 연동)

```
수강생 (LessonViewer)
  │
  │  "코랩 연결" 버튼 클릭
  ▼
ColabConnect 모달
  │  셋업 코드 표시 (Flask + Cloudflare Tunnel 포함)
  │  수강생이 Colab 셀에 붙여넣고 실행
  │
  ▼
Google Colab (수강생 계정)
  │  Flask 서버 (port 5000) 백그라운드 실행
  │  Cloudflare Quick Tunnel → public URL 생성
  │  URL 출력: https://xxx.trycloudflare.com
  │
  ▼
수강생이 URL을 모달에 입력 → "연결하기"
  │
  ▼
useColabKernel.connect(url)          ← src/hooks/useColabKernel.ts
  │  GET /ping → 200 OK 확인
  │  localStorage에 URL 저장 (새로고침 후도 유지)
  │  status: 'connected'
  │
  ▼
코드 셀 실행 (▶ 버튼 or Shift+Enter)
  │
  ▼
useColabKernel.execute(code)
  │  POST /execute { code }
  │  Colab Python 환경에서 exec()
  │  stdout · stderr · matplotlib 이미지 반환
  │
  ▼
LessonViewer LiveOutputBlock
  │  텍스트 출력 · 오류 · 이미지 렌더링
  └── 실행 이력은 liveOutputs state로 관리 (새로고침 시 초기화)
```

**Colab을 사용하는 이유:** GPU가 필요한 딥러닝 실습을 별도 서버 비용 없이 제공. Cloudflare Tunnel은 계정/설치 없이 무료로 public URL을 생성하므로 수강생 진입 장벽이 낮음.

---

## 6. 컴포넌트 트리

```
RootLayout (layout.tsx)
│  Font 로드: Jost · Noto Sans KR · EB Garamond
│
├── AuthProvider (contexts/AuthContext.tsx)
│     Supabase 세션 · user · profile · isAdmin 공급
│
├── Header (components/Header.tsx)
│     로고 · 네비 · 인증 상태 표시
│
└── <main>
      ├── HomePage (app/page.tsx)
      │     course 통계 계산 · 하이라이트 그리드 · 커리큘럼 미리보기
      │
      ├── LoginPage (app/login/page.tsx)
      │     Supabase email login · Google OAuth
      │
      ├── CurriculumPage (app/curriculum/page.tsx)
      │     byCategory 그룹핑 · Subject 카드 그리드
      │
      └── SubjectPage (app/curriculum/[id]/page.tsx)
            └── SubjectLayout (components/SubjectLayout.tsx)
                  │  activeNode · activeLesson · viewer state
                  │  Supabase 노트북 목록 관리
                  │
                  ├── [Sidebar] 노드 트리 네비게이션
                  │
                  ├── [Main] 세션 목록 + 아코디언
                  │     ├── "학습하기" → LessonViewer 오버레이
                  │     └── 관리자: 노트북 업로드 버튼
                  │
                  ├── LessonViewer (components/LessonViewer.tsx)
                  │     │  localSections · activeIdx · focusedCell · showCode
                  │     │  편집/저장 localStorage 동기화
                  │     │
                  │     ├── [TOC Sidebar] 마크다운 heading 파싱 목차
                  │     ├── [Left Panel] ReactMarkdown 이론 렌더링
                  │     ├── [Right Panel] SyntaxHighlighter 코드 셀
                  │     │     복사 · Shift+Enter 실행 · 방향키 셀 이동
                  │     └── ColabConnect 모달
                  │
                  └── [Modal] 노트북 라이브러리 (관리자)
                        Supabase Storage 목록 · 삭제
```

---

## 7. 파일 구조 요약

```
curriculum-web/
├── src/
│   ├── app/                     # 라우트 (App Router)
│   │   ├── layout.tsx           # 루트 레이아웃 · 폰트 · AuthProvider
│   │   ├── globals.css          # Tailwind v4 · CSS 디자인 토큰
│   │   ├── page.tsx             # 홈
│   │   ├── login/page.tsx       # 로그인
│   │   └── curriculum/
│   │       ├── page.tsx         # 전체 목록
│   │       └── [id]/page.tsx    # 교과목 상세 (SSG)
│   │
│   ├── components/
│   │   ├── Header.tsx           # 네비게이션 · 인증 상태
│   │   ├── SubjectLayout.tsx    # 교과목 상세 UI (노드 트리 · 세션 목록)
│   │   ├── LessonViewer.tsx     # 노트북 뷰어 · 코드 실행기
│   │   ├── ColabConnect.tsx     # Colab 연결 가이드 모달
│   │   ├── CategoryBadge.tsx    # 카테고리 라벨
│   │   └── SubjectCard.tsx      # 교과목 카드 (미사용 예비)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # Supabase 인증 전역 상태
│   │
│   ├── hooks/
│   │   └── useColabKernel.ts    # Colab 커널 연결 · 코드 실행 훅
│   │
│   ├── lib/
│   │   ├── supabase.ts          # Supabase 클라이언트 · Storage · DB 헬퍼
│   │   └── notebookParser.ts    # .ipynb → NotebookSection[] 파서
│   │
│   ├── data/
│   │   └── curriculum.ts        # 전체 커리큘럼 정적 데이터 (타입 안전)
│   │
│   └── types/
│       └── curriculum.ts        # Category · Lesson · Node · Subject · CourseInfo
│
├── public/
│   └── notebooks/               # 퍼블릭 .ipynb 예제 파일
│
├── supabase-setup.sql            # DB 스키마 (profiles · lesson_notebooks)
├── netlify.toml                  # Netlify 배포 설정
└── .env.local.example            # Supabase 환경변수 템플릿
```

---

## 8. 기술 스택 선택 이유 요약

| 기술 | 이유 |
|------|------|
| **Next.js 16 App Router** | SSG로 커리큘럼 페이지 정적 서빙, 파일 기반 라우팅으로 구조 단순화 |
| **TypeScript** | 커리큘럼 데이터 구조가 크고 복잡해 타입 오류를 빌드 타임에 잡아야 함 |
| **Tailwind CSS v4** | 디자인 토큰을 CSS 변수로 관리, JIT로 미사용 스타일 자동 제거 |
| **Supabase** | 별도 백엔드 없이 Auth · DB · Storage를 단일 서비스로 운영 |
| **Google Colab** | GPU 환경 무료 제공, 서버 인프라 비용 없음 |
| **Cloudflare Tunnel** | 계정·설치 없이 Colab 로컬 서버를 public URL로 노출 (ngrok 대안) |
| **react-markdown** | Jupyter 마크다운 셀을 안전하게 HTML 렌더링 |
| **react-syntax-highlighter** | 코드 셀 언어별 하이라이팅, 커스텀 웜 라이트 테마 적용 |
| **Netlify** | Next.js SSG 배포에 최적화, CI/CD 자동화, 무료 티어로 운영 |
