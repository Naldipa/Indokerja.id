ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ApplicationHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."User", public."Job", public."Application", public."ApplicationHistory" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public."User", public."Job", public."Application", public."ApplicationHistory", public."_prisma_migrations" FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public."User", public."Job", public."Application", public."ApplicationHistory", public."_prisma_migrations" FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
  END IF;
END $$;
