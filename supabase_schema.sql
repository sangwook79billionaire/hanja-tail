-- ==========================================
-- Hanja Tail (한자 꼬리) Supabase Schema
-- ==========================================

-- 1. hanja_master: 한자 기본 마스터 테이블
CREATE TABLE IF NOT EXISTS public.hanja_master (
    hanja VARCHAR(1) PRIMARY KEY,       -- 한자 (예: '過')
    meaning VARCHAR(50) NOT NULL,       -- 뜻 (예: '지나칠')
    sound VARCHAR(50) NOT NULL,         -- 음 (예: '과')
    stroke_data JSONB,                  -- 획순 데이터 (SVG path array 등)
    level VARCHAR(20),                  -- 급수 (예: '8급')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. user_items: 개인이 생성한 데이터 우선 저장 (격리용)
-- 관리자가 승인(is_approved = true)해야 공용 퀴즈 등으로 노출 가능
CREATE TABLE IF NOT EXISTS public.user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,              -- 작성자 ID (Supabase Auth 연동 시 auth.uid() 사용)
    word VARCHAR(100) NOT NULL,         -- 입력된 단어 (예: '과식')
    hanja_combination VARCHAR(100),     -- 한자 조합 (예: '過食')
    is_approved BOOLEAN DEFAULT FALSE,  -- 관리자 승인 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. quiz_bank: 검증된 퀴즈 데이터베이스
CREATE TABLE IF NOT EXISTS public.quiz_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(100) NOT NULL,         -- 단어 (예: '과속')
    hanja_combination VARCHAR(100),     -- 한자 조합 (예: '過速')
    description TEXT NOT NULL,          -- 퀴즈 설명 (AI 생성) (예: '자동차가 속도를 지나치게 빨리 내는 것')
    creator_id UUID,                    -- 생성자 ID (user_items의 user_id 등)
    is_verified BOOLEAN DEFAULT FALSE,  -- 검증 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. learning_logs: 사용자 학습 로그
CREATE TABLE IF NOT EXISTS public.learning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,              -- 사용자 ID
    word VARCHAR(100) NOT NULL,         -- 학습한 단어
    is_correct BOOLEAN NOT NULL,        -- 정답 여부
    learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. user_trophies: 사용자 획득 트로피
CREATE TABLE IF NOT EXISTS public.user_trophies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,              -- 사용자 ID
    trophy_tier VARCHAR(20) NOT NULL CHECK (trophy_tier IN ('Gold', 'Silver', 'Bronze')), -- 등급
    week_start_date DATE NOT NULL,      -- 획득 주차 (해당 주의 시작일 등)
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정 예시 (선택적)
-- ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can insert their own items" ON public.user_items FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can view their own items" ON public.user_items FOR SELECT USING (auth.uid() = user_id);

-- ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage their own logs" ON public.learning_logs FOR ALL USING (auth.uid() = user_id);

-- ALTER TABLE public.user_trophies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own trophies" ON public.user_trophies FOR SELECT USING (auth.uid() = user_id);
