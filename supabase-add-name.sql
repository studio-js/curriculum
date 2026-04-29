-- ================================================================
-- profiles 테이블에 name 컬럼 추가
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

alter table public.profiles
  add column if not exists name text;

-- 기존 정책 업데이트: name 컬럼도 업데이트 허용
-- (기존 "Users can update own email" 정책은 role만 제한하므로 name은 이미 허용됨)
-- 별도 정책 변경 불필요
