-- SudoAI auth/profile/chat/usage security and profile provisioning

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, plan)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Profiles
 drop policy if exists profiles_select_own on public.profiles;
 drop policy if exists profiles_insert_own on public.profiles;
 drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Conversations
 drop policy if exists conversations_select_own on public.conversations;
 drop policy if exists conversations_insert_own on public.conversations;
 drop policy if exists conversations_update_own on public.conversations;
 drop policy if exists conversations_delete_own on public.conversations;
create policy conversations_select_own on public.conversations for select to authenticated using (user_id = auth.uid());
create policy conversations_insert_own on public.conversations for insert to authenticated with check (user_id = auth.uid());
create policy conversations_update_own on public.conversations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy conversations_delete_own on public.conversations for delete to authenticated using (user_id = auth.uid());

-- Messages
 drop policy if exists messages_select_own on public.messages;
 drop policy if exists messages_insert_own on public.messages;
 drop policy if exists messages_delete_own on public.messages;
create policy messages_select_own on public.messages for select to authenticated using (user_id = auth.uid());
create policy messages_insert_own on public.messages for insert to authenticated with check (user_id = auth.uid());
create policy messages_delete_own on public.messages for delete to authenticated using (user_id = auth.uid());

-- Daily usage
 drop policy if exists usage_daily_select_own on public.usage_daily;
 drop policy if exists usage_daily_insert_own on public.usage_daily;
 drop policy if exists usage_daily_update_own on public.usage_daily;
create policy usage_daily_select_own on public.usage_daily for select to authenticated using (user_id = auth.uid());
create policy usage_daily_insert_own on public.usage_daily for insert to authenticated with check (user_id = auth.uid());
create policy usage_daily_update_own on public.usage_daily for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- API settings (no API secret is stored here)
 drop policy if exists api_settings_select_own on public.api_settings;
 drop policy if exists api_settings_insert_own on public.api_settings;
 drop policy if exists api_settings_update_own on public.api_settings;
create policy api_settings_select_own on public.api_settings for select to authenticated using (user_id = auth.uid());
create policy api_settings_insert_own on public.api_settings for insert to authenticated with check (user_id = auth.uid());
create policy api_settings_update_own on public.api_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
