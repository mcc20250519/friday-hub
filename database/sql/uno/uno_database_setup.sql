-- ============================================================
-- UNO 游戏数据库建表脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- ============================================================
-- 1. 创建数据表
-- ============================================================

-- 游戏房间表
create table if not exists public.uno_rooms (
  id           uuid primary key default gen_random_uuid(),
  room_code    varchar(6) unique not null,
  host_id      uuid references public.profiles(id) on delete cascade,
  status       varchar(20) default 'waiting'
               check (status in ('waiting', 'playing', 'finished')),
  max_players  int default 4 check (max_players between 2 and 4),
  created_at   timestamptz default now(),
  expires_at   timestamptz default now() + interval '2 hours'
);

-- 房间内玩家表
create table if not exists public.uno_players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references public.uno_rooms(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  seat_index int check (seat_index between 0 and 3),
  is_ready   boolean default false,
  joined_at  timestamptz default now(),
  unique(room_id, user_id),
  unique(room_id, seat_index)
);

-- 游戏核心状态表
create table if not exists public.uno_game_state (
  id                   uuid primary key default gen_random_uuid(),
  room_id              uuid references public.uno_rooms(id) on delete cascade unique,
  current_player_index int default 0,
  direction            int default 1 check (direction in (1, -1)),
  current_color        varchar(10) check (current_color in ('red', 'yellow', 'green', 'blue', 'black')),
  top_card             jsonb,
  draw_pile            jsonb default '[]',
  discard_pile         jsonb default '[]',
  hands                jsonb default '{}',
  pending_draw_count   int default 0,
  winner_id            uuid references public.profiles(id),
  updated_at           timestamptz default now()
);

-- 操作日志表
create table if not exists public.uno_actions (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references public.uno_rooms(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,
  action_type  varchar(20) check (action_type in ('play', 'draw', 'uno', 'skip')),
  card         jsonb,
  chosen_color varchar(10),
  created_at   timestamptz default now()
);

-- ============================================================
-- 2. 创建索引
-- ============================================================

create index if not exists idx_uno_rooms_room_code on public.uno_rooms(room_code);
create index if not exists idx_uno_rooms_status on public.uno_rooms(status);
create index if not exists idx_uno_rooms_expires_at on public.uno_rooms(expires_at);
create index if not exists idx_uno_players_room_id on public.uno_players(room_id);
create index if not exists idx_uno_players_user_id on public.uno_players(user_id);
create index if not exists idx_uno_game_state_room_id on public.uno_game_state(room_id);
create index if not exists idx_uno_actions_room_id on public.uno_actions(room_id);

-- ============================================================
-- 3. 启用 Row Level Security
-- ============================================================

alter table public.uno_rooms enable row level security;
alter table public.uno_players enable row level security;
alter table public.uno_game_state enable row level security;
alter table public.uno_actions enable row level security;

-- ============================================================
-- 4. RLS 策略
-- ============================================================

-- ---- uno_rooms ----
-- 所有登录用户可读房间
create policy "uno_rooms_select"
  on public.uno_rooms for select
  using (auth.uid() is not null);

-- 登录用户可创建房间（host_id 必须是自己）
create policy "uno_rooms_insert"
  on public.uno_rooms for insert
  with check (auth.uid() = host_id);

-- 仅房主可更新房间状态
create policy "uno_rooms_update"
  on public.uno_rooms for update
  using (auth.uid() = host_id);

-- 仅房主可删除房间
create policy "uno_rooms_delete"
  on public.uno_rooms for delete
  using (auth.uid() = host_id);

-- ---- uno_players ----
-- 所有登录用户可读玩家列表
create policy "uno_players_select"
  on public.uno_players for select
  using (auth.uid() is not null);

-- 登录用户可加入房间（user_id 必须是自己）
create policy "uno_players_insert"
  on public.uno_players for insert
  with check (auth.uid() = user_id);

-- 玩家可更新自己的记录
create policy "uno_players_update"
  on public.uno_players for update
  using (auth.uid() = user_id);

-- 玩家可删除自己（离开房间）
create policy "uno_players_delete"
  on public.uno_players for delete
  using (auth.uid() = user_id);

-- ---- uno_game_state ----
-- 房间内玩家可读游戏状态
create policy "uno_game_state_select"
  on public.uno_game_state for select
  using (
    exists (
      select 1 from public.uno_players
      where room_id = uno_game_state.room_id
        and user_id = auth.uid()
    )
  );

-- 房主可创建初始状态
create policy "uno_game_state_insert"
  on public.uno_game_state for insert
  with check (
    exists (
      select 1 from public.uno_rooms
      where id = room_id
        and host_id = auth.uid()
    )
  );

-- 房间内玩家可更新游戏状态（前端校验 + 乐观更新）
create policy "uno_game_state_update"
  on public.uno_game_state for update
  using (
    exists (
      select 1 from public.uno_players
      where room_id = uno_game_state.room_id
        and user_id = auth.uid()
    )
  );

-- ---- uno_actions ----
-- 房间内玩家可读操作日志
create policy "uno_actions_select"
  on public.uno_actions for select
  using (
    exists (
      select 1 from public.uno_players
      where room_id = uno_actions.room_id
        and user_id = auth.uid()
    )
  );

-- 登录用户可插入自己的操作
create policy "uno_actions_insert"
  on public.uno_actions for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. 启用 Realtime（在 Supabase Dashboard 配置）
-- 以下为 SQL 方式启用
-- ============================================================

-- 启用 Realtime 发布
alter publication supabase_realtime add table public.uno_rooms;
alter publication supabase_realtime add table public.uno_players;
alter publication supabase_realtime add table public.uno_game_state;
alter publication supabase_realtime add table public.uno_actions;

-- ============================================================
-- 6. 自动更新 updated_at 触发器（复用现有函数）
-- ============================================================

-- 如果 update_updated_at_column 函数不存在，先创建它
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_uno_game_state_updated_at
  before update on public.uno_game_state
  for each row
  execute function update_updated_at_column();

-- ============================================================
-- 7. 清理过期房间的函数（可配合 pg_cron 定时调用）
-- ============================================================

create or replace function cleanup_expired_uno_rooms()
returns void as $$
begin
  delete from public.uno_rooms
  where expires_at < now()
    and status != 'playing';
end;
$$ language plpgsql security definer;

-- ============================================================
-- ✅ 脚本执行完毕
-- 注意：执行完后请在 Supabase Dashboard → Database → Replication
--       确认以上 4 张表已出现在 supabase_realtime publication 中
-- ============================================================
