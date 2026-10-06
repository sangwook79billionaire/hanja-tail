-- ==========================================
-- Hanja Tail (한자 꼬리) Supabase Schema
-- ==========================================

-- 1. hanja_master: 한자 기본 마스터 테이블
CREATE TABLE IF NOT EXISTS public.hanja_master (
    hanja VARCHAR(1) PRIMARY KEY,       -- 한자
    meaning VARCHAR(50) NOT NULL,       -- 뜻
    sound VARCHAR(50) NOT NULL,         -- 음
    stroke_data JSONB,                  -- 획순 데이터
    level VARCHAR(20),                  -- 급수
    quest_index INTEGER,                -- 퀘스트 순서 (추가)
    example_words JSONB DEFAULT '[]',   -- 예시 단어 (추가)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. profiles: 사용자 프로필 정보
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    nickname VARCHAR(50),
    school VARCHAR(100),
    grade INTEGER,
    city VARCHAR(50),
    total_score INTEGER DEFAULT 0,
    current_stage INTEGER DEFAULT 8,
    current_node INTEGER DEFAULT 1,
    is_admin BOOLEAN DEFAULT FALSE,
    marketing_agree BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. word_analysis_cache: AI 분석 결과 캐시
CREATE TABLE IF NOT EXISTS public.word_analysis_cache (
    word VARCHAR(100) PRIMARY KEY,
    analysis_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. quiz_bank: 퀴즈 뱅크
CREATE TABLE IF NOT EXISTS public.quiz_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(100) NOT NULL,
    hanja_combination VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    creator_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(word, hanja_combination)
);

-- 5. learning_logs: 학습 기록
CREATE TABLE IF NOT EXISTS public.learning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    word VARCHAR(100) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    viewed_stroke BOOLEAN DEFAULT FALSE,
    practiced_writing BOOLEAN DEFAULT FALSE,
    learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. user_items: 사용자가 수집한 단어 아이템
CREATE TABLE IF NOT EXISTS public.user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    word VARCHAR(100) NOT NULL,
    hanja_combination VARCHAR(100) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. monitoring_log: 시스템 오류 및 상태 모니터링 로그
CREATE TABLE IF NOT EXISTS public.monitoring_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,    -- 'invalid_word', 'api_error', 'system_error' 등
    level VARCHAR(20) DEFAULT 'INFO',   -- 'INFO', 'WARNING', 'ERROR'
    message TEXT,                       -- 로그 메시지
    word VARCHAR(100),                  -- 관련 단어 (있을 경우)
    reason TEXT,                        -- 비정상 단어 탐지 시 이유
    details JSONB,                      -- 상세 JSON 데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- RLS (Row Level Security) 설정 및 보안 정책
-- ==========================================

-- 1. profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. hanja_master RLS
ALTER TABLE public.hanja_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view hanja_master" ON public.hanja_master;
CREATE POLICY "Anyone can view hanja_master" ON public.hanja_master FOR SELECT USING (true);

-- 3. word_analysis_cache RLS
ALTER TABLE public.word_analysis_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view word_analysis_cache" ON public.word_analysis_cache;
DROP POLICY IF EXISTS "Anyone can insert word_analysis_cache" ON public.word_analysis_cache;
DROP POLICY IF EXISTS "Admins can update word_analysis_cache" ON public.word_analysis_cache;
DROP POLICY IF EXISTS "Admins can delete word_analysis_cache" ON public.word_analysis_cache;

CREATE POLICY "Anyone can view word_analysis_cache" ON public.word_analysis_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can insert word_analysis_cache" ON public.word_analysis_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update word_analysis_cache" ON public.word_analysis_cache FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete word_analysis_cache" ON public.word_analysis_cache FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 4. quiz_bank RLS
ALTER TABLE public.quiz_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view quiz_bank" ON public.quiz_bank;
DROP POLICY IF EXISTS "Anyone can view verified quizzes" ON public.quiz_bank;
DROP POLICY IF EXISTS "Anyone can insert quiz_bank" ON public.quiz_bank;
DROP POLICY IF EXISTS "Admins can update quiz_bank" ON public.quiz_bank;
DROP POLICY IF EXISTS "Admins can delete quiz_bank" ON public.quiz_bank;

CREATE POLICY "Anyone can view quiz_bank" ON public.quiz_bank FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quiz_bank" ON public.quiz_bank FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update quiz_bank" ON public.quiz_bank FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete quiz_bank" ON public.quiz_bank FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 5. learning_logs RLS
ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view learning logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can manage their own logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can update their own logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can delete their own logs" ON public.learning_logs;

CREATE POLICY "Anyone can view learning logs" ON public.learning_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert their own logs" ON public.learning_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own logs" ON public.learning_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own logs" ON public.learning_logs FOR DELETE USING (auth.uid() = user_id);

-- 6. user_items RLS
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own items" ON public.user_items;
CREATE POLICY "Users can manage their own items" ON public.user_items FOR ALL USING (auth.uid() = user_id);

-- 7. monitoring_log RLS
ALTER TABLE public.monitoring_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view logs" ON public.monitoring_log;
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.monitoring_log;
DROP POLICY IF EXISTS "Admins can update logs" ON public.monitoring_log;
DROP POLICY IF EXISTS "Admins can delete logs" ON public.monitoring_log;

CREATE POLICY "Admins can view logs" ON public.monitoring_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Anyone can insert logs" ON public.monitoring_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update logs" ON public.monitoring_log FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete logs" ON public.monitoring_log FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

