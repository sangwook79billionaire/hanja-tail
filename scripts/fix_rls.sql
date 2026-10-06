-- ==========================================================
-- Supabase RLS (Row-Level Security) & Security Fix Migration
-- ==========================================================
-- 이 스크립트는 기존 데이터를 보존하면서 Row-Level Security를 활성화하고,
-- 모든 테이블에 대한 보안 정책을 설정하며, 누락된 모니터링 테이블을 생성합니다.
-- Supabase 대시보드 -> SQL Editor에 복사하여 실행해 주세요.

-- ----------------------------------------------------------
-- 0. 기존 레거시/취약한 공개 정책 정리
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Allow all access to learning_logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Allow all access to user_items" ON public.user_items;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.word_analysis_cache;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.quiz_bank;

-- ----------------------------------------------------------
-- 1. profiles 테이블 보안 강화
-- ----------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 모든 사용자(비로그인 포함)가 랭킹 및 프로필을 조회할 수 있도록 SELECT 허용
CREATE POLICY "Anyone can view profiles" ON public.profiles 
    FOR SELECT USING (true);

-- 본인 프로필만 신규 생성 및 수정(점수 업데이트 등)이 가능하도록 제한
CREATE POLICY "Users can insert their own profile" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

-- ----------------------------------------------------------
-- 2. hanja_master 테이블 보안 확인 및 적용
-- ----------------------------------------------------------
ALTER TABLE public.hanja_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view hanja_master" ON public.hanja_master;

-- 누구나 한자 정보를 조회할 수 있도록 SELECT 허용 (INSERT/UPDATE/DELETE는 기본 차단)
CREATE POLICY "Anyone can view hanja_master" ON public.hanja_master 
    FOR SELECT USING (true);

-- ----------------------------------------------------------
-- 3. word_analysis_cache 테이블 보안 설정
-- ----------------------------------------------------------
ALTER TABLE public.word_analysis_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view word_analysis_cache" ON public.word_analysis_cache;
DROP POLICY IF EXISTS "Anyone can insert word_analysis_cache" ON public.word_analysis_cache;
DROP POLICY IF EXISTS "Admins can update word_analysis_cache" ON public.word_analysis_cache;
DROP POLICY IF EXISTS "Admins can delete word_analysis_cache" ON public.word_analysis_cache;

-- 누구나 한자 분석 캐시를 조회 및 입력할 수 있도록 허용 (게임 도중 분석 결과 자동 캐싱 목적)
CREATE POLICY "Anyone can view word_analysis_cache" ON public.word_analysis_cache 
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert word_analysis_cache" ON public.word_analysis_cache 
    FOR INSERT WITH CHECK (true);

-- 수정 및 삭제는 오직 관리자(is_admin = true) 계정만 가능
CREATE POLICY "Admins can update word_analysis_cache" ON public.word_analysis_cache 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete word_analysis_cache" ON public.word_analysis_cache 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- ----------------------------------------------------------
-- 4. quiz_bank 테이블 보안 설정
-- ----------------------------------------------------------
ALTER TABLE public.quiz_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view quiz_bank" ON public.quiz_bank;
DROP POLICY IF EXISTS "Anyone can view verified quizzes" ON public.quiz_bank;
DROP POLICY IF EXISTS "Anyone can insert quiz_bank" ON public.quiz_bank;
DROP POLICY IF EXISTS "Admins can update quiz_bank" ON public.quiz_bank;
DROP POLICY IF EXISTS "Admins can delete quiz_bank" ON public.quiz_bank;

-- 누구나 퀴즈 은행의 데이터를 조회 및 새 단어 출제/추가할 수 있도록 허용
CREATE POLICY "Anyone can view quiz_bank" ON public.quiz_bank 
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert quiz_bank" ON public.quiz_bank 
    FOR INSERT WITH CHECK (true);

-- 퀴즈 데이터의 수정(검증 처리 포함) 및 삭제는 관리자만 가능하도록 제한
CREATE POLICY "Admins can update quiz_bank" ON public.quiz_bank 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete quiz_bank" ON public.quiz_bank 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- ----------------------------------------------------------
-- 5. learning_logs 테이블 보안 설정
-- ----------------------------------------------------------
ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view learning logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can manage their own logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can update their own logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can delete their own logs" ON public.learning_logs;

-- 누구나 최근 학습 로그 현황을 볼 수 있도록 허용 (메인 대시보드 연동용)
CREATE POLICY "Anyone can view learning logs" ON public.learning_logs 
    FOR SELECT USING (true);

-- 본인의 학습 기록만 생성, 수정 및 삭제할 수 있도록 제한
CREATE POLICY "Users can insert their own logs" ON public.learning_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs" ON public.learning_logs 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs" ON public.learning_logs 
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 6. user_items 테이블 보안 설정
-- ----------------------------------------------------------
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own items" ON public.user_items;

-- 사용자가 수집한 아이템은 본인 데이터만 접근/관리할 수 있도록 설정
CREATE POLICY "Users can manage their own items" ON public.user_items 
    FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 7. monitoring_log 테이블 생성 및 보안 설정
-- ----------------------------------------------------------
-- 테이블이 없을 경우를 대비해 생성 (reason 컬럼 포함)
CREATE TABLE IF NOT EXISTS public.monitoring_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    level VARCHAR(20) DEFAULT 'INFO',
    message TEXT,
    word VARCHAR(100),
    reason TEXT,                       -- AI 단어 필터링 시 사유 컬럼
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 테이블은 있지만 reason 컬럼이 누락된 경우 컬럼 추가
ALTER TABLE public.monitoring_log ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE public.monitoring_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view logs" ON public.monitoring_log;
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.monitoring_log;
DROP POLICY IF EXISTS "Admins can update logs" ON public.monitoring_log;
DROP POLICY IF EXISTS "Admins can delete logs" ON public.monitoring_log;

-- 모니터링 로그 조회/수정/삭제는 관리자만 가능
CREATE POLICY "Admins can view logs" ON public.monitoring_log 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update logs" ON public.monitoring_log 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete logs" ON public.monitoring_log 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 비로그인 사용자 및 모든 사용자로부터 발생한 시스템/예외 로그 저장을 위해 INSERT는 전체 허용
CREATE POLICY "Anyone can insert logs" ON public.monitoring_log 
    FOR INSERT WITH CHECK (true);
