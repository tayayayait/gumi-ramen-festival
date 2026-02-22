DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'menus'
          AND policyname = 'menus_auth_insert'
    ) THEN
        CREATE POLICY "menus_auth_insert" ON public.menus
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'menus'
          AND policyname = 'menus_auth_delete'
    ) THEN
        CREATE POLICY "menus_auth_delete" ON public.menus
            FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END;
$$;
