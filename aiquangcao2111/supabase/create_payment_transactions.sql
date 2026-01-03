create table if not exists public.payment_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  package_id text not null,
  amount numeric not null,
  currency text default 'VND',
  status text default 'pending',
  payment_method text,
  transaction_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  verified_at timestamp with time zone,
  verified_by uuid references auth.users(id),
  notes text
);

-- Enable RLS
alter table public.payment_transactions enable row level security;

-- Policy for users to view their own transactions
create policy "Users can view their own transactions"
  on public.payment_transactions for select
  using (auth.uid() = user_id);

-- Policy for admins to view all transactions (optional, adjust as needed)
create policy "Admins can view all transactions"
  on public.payment_transactions for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
  );
