alter table public.tasks add column if not exists color_status text default 'white' check (color_status in ('white','red','yellow','green'));
