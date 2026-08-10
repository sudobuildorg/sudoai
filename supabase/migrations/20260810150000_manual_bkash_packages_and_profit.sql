alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan = any (array['free','text_starter','pro','pro_max','ultra']));

alter table public.payment_requests drop constraint if exists payment_requests_plan_check;
alter table public.payment_requests add constraint payment_requests_plan_check check (plan = any (array['text_starter','pro','pro_max','ultra']));

alter table public.payment_requests add column if not exists user_email text;
alter table public.payment_requests add column if not exists estimated_cost_bdt numeric not null default 0;
alter table public.payment_requests add column if not exists estimated_profit_bdt numeric not null default 0;

create or replace function public.set_payment_estimates()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare cost numeric;
begin
  cost := case new.plan
    when 'text_starter' then 40
    when 'pro' then 180
    when 'pro_max' then 400
    when 'ultra' then 650
    else 0
  end;
  new.estimated_cost_bdt := cost;
  new.estimated_profit_bdt := greatest(coalesce(new.amount,0) - cost, 0);
  return new;
end;
$$;

drop trigger if exists payment_requests_set_estimates on public.payment_requests;
create trigger payment_requests_set_estimates
before insert or update of plan, amount on public.payment_requests
for each row execute function public.set_payment_estimates();

create or replace function public.sync_payment_user_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.user_email is null or btrim(new.user_email) = '' then
    select email into new.user_email from auth.users where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payment_requests_sync_email on public.payment_requests;
create trigger payment_requests_sync_email
before insert on public.payment_requests
for each row execute function public.sync_payment_user_email();

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles for select to authenticated using (is_admin());
