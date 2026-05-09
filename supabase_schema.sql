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

-- RLS (Row Level Security) 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own logs" ON public.learning_logs FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.quiz_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view verified quizzes" ON public.quiz_bank FOR SELECT USING (is_verified = true OR auth.uid() IS NOT NULL);

-- 6. monitoring_log: 시스템 오류 및 상태 모니터링 로그
CREATE TABLE IF NOT EXISTS public.monitoring_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,    -- 'invalid_word', 'api_error', 'system_error' 등
    level VARCHAR(20) DEFAULT 'INFO',   -- 'INFO', 'WARNING', 'ERROR'
    message TEXT,                       -- 로그 메시지
    word VARCHAR(100),                  -- 관련 단어 (있을 경우)
    details JSONB,                      -- 상세 JSON 데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 관리자만 로그를 볼 수 있도록 설정
ALTER TABLE public.monitoring_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view logs" ON public.monitoring_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
