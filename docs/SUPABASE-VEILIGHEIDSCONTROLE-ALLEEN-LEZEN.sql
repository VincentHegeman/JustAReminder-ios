-- Inspectie — ALLEEN LEZEN; voert geen migraties of wijzigingen uit.
-- Controleer resultaten vóór gebruik door klanten.
-- Publieke tabellen: RLS moet aan, policies moeten per user/group scopen.
select table_schema, table_name, row_security_enabled, force_row_security
from information_schema.tables t
join lateral (
 select c.relrowsecurity as row_security_enabled, c.relforcerowsecurity as force_row_security
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relname=t.table_name and n.nspname=t.table_schema
) q on true
where table_schema = 'public' and table_type='BASE TABLE'
order by table_name;

-- Alleen policy-definities voor review (zelfs RLS=true kan onveilige true/USING policies hebben).
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
order by tablename, policyname;

-- Gebruikersfuncties met security-definer verdienen speciale aandacht.
select n.nspname schema_name, p.proname function_name, pg_get_function_identity_arguments(p.oid) arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
order by function_name;
