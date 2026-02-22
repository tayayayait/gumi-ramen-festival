DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'menus'
          AND policyname = 'menus_auth_update'
    ) THEN
        CREATE POLICY "menus_auth_update" ON public.menus
            FOR UPDATE
            TO authenticated
            USING (true);
    END IF;
END;
$$;
