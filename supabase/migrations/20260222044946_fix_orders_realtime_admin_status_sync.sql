-- ==============================================================================
-- Orders realtime sync hardening:
-- 1) enforce replica identity + realtime publication membership
-- 2) redefine strict RLS for owner/admin visibility and admin updates
-- ==============================================================================

ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END;
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
  DROP POLICY IF EXISTS "Enable insert access for all users" ON public.orders;
  DROP POLICY IF EXISTS "Enable update access for all users" ON public.orders;
  DROP POLICY IF EXISTS "Enable delete access for all users" ON public.orders;
  DROP POLICY IF EXISTS "Waitlist orders viewable by owner and merchant" ON public.orders;
  DROP POLICY IF EXISTS "Orders viewable by owner or admin" ON public.orders;
  DROP POLICY IF EXISTS "Orders insertable by authenticated" ON public.orders;
  DROP POLICY IF EXISTS "Orders updatable by admin" ON public.orders;
  DROP POLICY IF EXISTS "Orders deletable by admin" ON public.orders;

  CREATE POLICY "Orders viewable by owner or admin"
    ON public.orders
    FOR SELECT
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'merchant')
      )
    );

  CREATE POLICY "Orders insertable by authenticated"
    ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

  CREATE POLICY "Orders updatable by admin"
    ON public.orders
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'merchant')
      )
    );

  CREATE POLICY "Orders deletable by admin"
    ON public.orders
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'merchant')
      )
    );
END;
$$;
