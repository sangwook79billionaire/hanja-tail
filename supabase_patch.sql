-- ==========================================
-- supabase_patch.sql
-- supabase_schema.sql 을 먼저 실행한 뒤, 이 파일을 이어서 실행하세요.
-- 앱 코드(actions.ts)가 쓰는 컬럼 중 기본 스키마에 없던 것들을 추가합니다.
-- 여러 번 실행해도 안전합니다 (IF NOT EXISTS).
-- ==========================================

-- profiles: 연속 학습, 쿠폰(도토리), 보너스 점수, 미션 시각
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_streak_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coupons INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_points NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_mission_at TIMESTAMP WITH TIME ZONE;

-- learning_logs: 연관 단어(꼬리 물기) 추적, 복습 여부
ALTER TABLE public.learning_logs ADD COLUMN IF NOT EXISTS parent_word VARCHAR(100);
ALTER TABLE public.learning_logs ADD COLUMN IF NOT EXISTS is_review BOOLEAN DEFAULT FALSE;

-- quiz_bank: 난이도 (AI 생성 퀴즈 저장 시 사용)
ALTER TABLE public.quiz_bank ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1;
