DROP POLICY IF EXISTS "Full access to anyone" ON public.hanja_master;
CREATE POLICY "Anyone can view hanja_master" ON public.hanja_master FOR SELECT USING (true);
