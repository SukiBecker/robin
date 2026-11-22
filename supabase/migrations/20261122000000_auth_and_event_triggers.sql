-- Trigger, die der public-only Dump der Baseline nicht enthält.
--
-- 1. Neuer Auth-Nutzer -> Profil und Studyroom-Einstellungen anlegen
--    (public.handle_new_user). Der Trigger hängt an auth.users, also nicht
--    im Schema public.
-- 2. Event-Trigger "ensure_rls": aktiviert RLS auf neuen Tabellen im
--    Schema public (public.rls_auto_enable).
--
-- Beide Anweisungen sind abgesichert: Existiert in der Datenbank schon ein
-- Trigger, der dieselbe Funktion aufruft (egal unter welchem Namen), passiert
-- nichts. So läuft die Migration in Dev und Prod ohne Doppel-Trigger, und ein
-- frisches Projekt bekommt beide.
--
-- Nicht enthalten: die Event-Trigger von Supabase selbst (pgrst_*, graphql,
-- pg_cron, pg_net). Die legt jedes Supabase-Projekt von sich aus an.

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and t.tgfoid = 'public.handle_new_user()'::regprocedure
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_event_trigger e
    where e.evtfoid = 'public.rls_auto_enable()'::regprocedure
  ) then
    create event trigger ensure_rls
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end;
$$;
