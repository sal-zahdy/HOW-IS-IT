-- handle_new_user only runs as the auth.users trigger; nobody should call it through the API.
-- is_admin stays executable because the row-level security policies call it for every request.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
