-- 1. 테이블이 존재하지만 권한이 없는 경우를 대비해 SELECT 권한 부여
GRANT SELECT ON public.hanja_master TO anon, authenticated;

-- 2. 만약 RLS가 켜져 있다면 모든 사용자(anon 포함)가 읽을 수 있도록 정책 추가
ALTER TABLE public.hanja_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view hanja_master" ON public.hanja_master;
CREATE POLICY "Anyone can view hanja_master" ON public.hanja_master FOR SELECT USING (true);

-- 3. quest_index 컬럼이 확실히 있는지 확인하고 없으면 추가
ALTER TABLE public.hanja_master ADD COLUMN IF NOT EXISTS quest_index INTEGER;
