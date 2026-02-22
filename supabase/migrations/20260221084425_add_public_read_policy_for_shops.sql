DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'shops'
          AND policyname = 'shops_public_read_all'
    ) THEN
        CREATE POLICY "shops_public_read_all" ON public.shops
            FOR SELECT
            USING (true);
    END IF;
END;
$$;
