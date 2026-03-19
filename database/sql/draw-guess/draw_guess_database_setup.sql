-- ============================================================
-- 你说我猜游戏数据库建表脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- ============================================================
-- 1. 创建数据表
-- ============================================================

-- 游戏房间表
create table if not exists public.draw_guess_rooms (
  id           uuid primary key default gen_random_uuid(),
  room_code    varchar(6) unique not null,  -- 6 位字母数字房间码
  host_id      uuid references public.profiles(id) on delete cascade,
  status       varchar(20) default 'waiting'
               check (status in ('waiting', 'active', 'finished')),
  
  -- 游戏配置
  num_teams           int default 2 check (num_teams between 2 and 4),
  players_per_team    int default 2 check (players_per_team between 1 and 4),
  description_time_sec int default 60 check (description_time_sec between 30 and 120),
  guessing_time_sec   int default 30 check (guessing_time_sec between 15 and 90),
  target_rounds       int default 3 check (target_rounds in (3, 5, 7)),  -- BO3, BO5, BO7
  word_source         varchar(20) default 'predefined' check (word_source in ('predefined', 'custom', 'both')),
  
  -- 游戏进度
  current_round           int default 0,
  current_describer_id    uuid references public.profiles(id),
  current_word            varchar(50),
  current_phase           varchar(20) default 'waiting' check (current_phase in ('waiting', 'description', 'guessing', 'round_end')),
  phase_started_at        timestamptz,
  hints_revealed          jsonb default '[]',  -- 已揭示的提示字符位置
  
  -- 元数据
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  expires_at    timestamptz default now() + interval '3 hours',
  finished_at   timestamptz
);

-- 团队表
create table if not exists public.draw_guess_teams (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references public.draw_guess_rooms(id) on delete cascade,
  team_num     int not null check (team_num between 1 and 4),  -- 1-4
  team_name    varchar(50),
  score        int default 0,
  hints_used   int default 0,  -- 本轮已用提示数
  created_at   timestamptz default now(),
  
  unique(room_id, team_num)
);

-- 房间内玩家表
create table if not exists public.draw_guess_players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references public.draw_guess_rooms(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  team_id    uuid references public.draw_guess_teams(id) on delete set null,
  display_name varchar(50),
  status     varchar(20) default 'connected' check (status in ('connected', 'disconnected', 'left')),
  is_describer boolean default false,
  
  -- 统计
  rounds_described  int default 0,
  correct_guesses   int default 0,
  joined_at         timestamptz default now(),
  
  unique(room_id, user_id)
);

-- 轮次表
create table if not exists public.draw_guess_rounds (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references public.draw_guess_rooms(id) on delete cascade,
  round_num    int not null,
  describer_player_id uuid references public.draw_guess_players(id),
  target_word  varchar(50) not null,
  guessing_team_id uuid references public.draw_guess_teams(id),  -- 首先猜对的团队
  
  -- 绘图数据 (笔画事件列表)
  canvas_data  jsonb default '[]',
  
  -- 猜测数据
  guesses      jsonb default '[]',  -- [{user_id, guess, is_correct, timestamp}]
  correct_guess varchar(50),
  correct_guess_at timestamptz,
  hints_revealed jsonb default '[]',  -- 本轮揭示的提示
  
  round_duration_sec int,
  created_at   timestamptz default now(),
  finished_at  timestamptz,
  
  unique(room_id, round_num)
);

-- 词库表
create table if not exists public.draw_guess_words (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references public.draw_guess_rooms(id) on delete cascade,  -- NULL 为全局词库
  word         varchar(50) not null,
  category     varchar(50),
  difficulty   varchar(20) default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  lang         varchar(10) default 'zh',
  
  created_at   timestamptz default now(),
  created_by   uuid references public.profiles(id),
  
  check (length(word) between 1 and 50)
);

-- 猜测记录表 (用于实时记录和回放)
create table if not exists public.draw_guess_actions (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references public.draw_guess_rooms(id) on delete cascade,
  round_id     uuid references public.draw_guess_rounds(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,
  action_type  varchar(20) not null check (action_type in ('guess', 'hint', 'draw_stroke', 'draw_clear', 'draw_undo')),
  action_data  jsonb,  -- 具体数据
  created_at   timestamptz default now()
);

-- ============================================================
-- 2. 创建索引
-- ============================================================

create index if not exists idx_draw_guess_rooms_room_code on public.draw_guess_rooms(room_code);
create index if not exists idx_draw_guess_rooms_status on public.draw_guess_rooms(status);
create index if not exists idx_draw_guess_rooms_host_id on public.draw_guess_rooms(host_id);
create index if not exists idx_draw_guess_rooms_expires_at on public.draw_guess_rooms(expires_at);

create index if not exists idx_draw_guess_teams_room_id on public.draw_guess_teams(room_id);

create index if not exists idx_draw_guess_players_room_id on public.draw_guess_players(room_id);
create index if not exists idx_draw_guess_players_user_id on public.draw_guess_players(user_id);
create index if not exists idx_draw_guess_players_team_id on public.draw_guess_players(team_id);

create index if not exists idx_draw_guess_rounds_room_id on public.draw_guess_rounds(room_id);
create index if not exists idx_draw_guess_rounds_round_num on public.draw_guess_rounds(room_id, round_num);

create index if not exists idx_draw_guess_words_room_id on public.draw_guess_words(room_id);
create index if not exists idx_draw_guess_words_category on public.draw_guess_words(category);

create index if not exists idx_draw_guess_actions_room_id on public.draw_guess_actions(room_id);
create index if not exists idx_draw_guess_actions_round_id on public.draw_guess_actions(round_id);

-- ============================================================
-- 3. 启用 Row Level Security
-- ============================================================

alter table public.draw_guess_rooms enable row level security;
alter table public.draw_guess_teams enable row level security;
alter table public.draw_guess_players enable row level security;
alter table public.draw_guess_rounds enable row level security;
alter table public.draw_guess_words enable row level security;
alter table public.draw_guess_actions enable row level security;

-- ============================================================
-- 4. RLS 策略
-- ============================================================

-- ---- draw_guess_rooms ----
-- 所有登录用户可读房间
create policy "draw_guess_rooms_select"
  on public.draw_guess_rooms for select
  using (auth.uid() is not null);

-- 登录用户可创建房间（host_id 必须是自己）
create policy "draw_guess_rooms_insert"
  on public.draw_guess_rooms for insert
  with check (auth.uid() = host_id);

-- 仅房主可更新房间状态
create policy "draw_guess_rooms_update"
  on public.draw_guess_rooms for update
  using (auth.uid() = host_id);

-- 仅房主可删除房间
create policy "draw_guess_rooms_delete"
  on public.draw_guess_rooms for delete
  using (auth.uid() = host_id);

-- ---- draw_guess_teams ----
-- 所有登录用户可读团队信息
create policy "draw_guess_teams_select"
  on public.draw_guess_teams for select
  using (auth.uid() is not null);

-- 房间内玩家可插入团队
create policy "draw_guess_teams_insert"
  on public.draw_guess_teams for insert
  with check (
    exists (
      select 1 from public.draw_guess_rooms
      where id = room_id and host_id = auth.uid()
    )
  );

-- 房间内玩家可更新团队分数
create policy "draw_guess_teams_update"
  on public.draw_guess_teams for update
  using (
    exists (
      select 1 from public.draw_guess_players
      where room_id = draw_guess_teams.room_id and user_id = auth.uid()
    )
  );

-- ---- draw_guess_players ----
-- 所有登录用户可读玩家列表
create policy "draw_guess_players_select"
  on public.draw_guess_players for select
  using (auth.uid() is not null);

-- 登录用户可加入房间（user_id 必须是自己）
create policy "draw_guess_players_insert"
  on public.draw_guess_players for insert
  with check (auth.uid() = user_id);

-- 玩家可更新自己的记录
create policy "draw_guess_players_update"
  on public.draw_guess_players for update
  using (auth.uid() = user_id);

-- 玩家可删除自己（离开房间）
create policy "draw_guess_players_delete"
  on public.draw_guess_players for delete
  using (auth.uid() = user_id);

-- ---- draw_guess_rounds ----
-- 房间内玩家可读轮次数据
create policy "draw_guess_rounds_select"
  on public.draw_guess_rounds for select
  using (
    exists (
      select 1 from public.draw_guess_players
      where room_id = draw_guess_rounds.room_id and user_id = auth.uid()
    )
  );

-- 房间内玩家可插入轮次
create policy "draw_guess_rounds_insert"
  on public.draw_guess_rounds for insert
  with check (
    exists (
      select 1 from public.draw_guess_players
      where room_id = draw_guess_rounds.room_id and user_id = auth.uid()
    )
  );

-- 房间内玩家可更新轮次数据
create policy "draw_guess_rounds_update"
  on public.draw_guess_rounds for update
  using (
    exists (
      select 1 from public.draw_guess_players
      where room_id = draw_guess_rounds.room_id and user_id = auth.uid()
    )
  );

-- ---- draw_guess_words ----
-- 全局词库所有人可读
create policy "draw_guess_words_select"
  on public.draw_guess_words for select
  using (auth.uid() is not null);

-- 房主可添加自定义词
create policy "draw_guess_words_insert"
  on public.draw_guess_words for insert
  with check (
    room_id is null or 
    exists (
      select 1 from public.draw_guess_rooms
      where id = room_id and host_id = auth.uid()
    )
  );

-- ---- draw_guess_actions ----
-- 房间内玩家可读操作记录
create policy "draw_guess_actions_select"
  on public.draw_guess_actions for select
  using (
    exists (
      select 1 from public.draw_guess_players
      where room_id = draw_guess_actions.room_id and user_id = auth.uid()
    )
  );

-- 登录用户可插入自己的操作
create policy "draw_guess_actions_insert"
  on public.draw_guess_actions for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. 启用 Realtime
-- ============================================================

alter publication supabase_realtime add table public.draw_guess_rooms;
alter publication supabase_realtime add table public.draw_guess_teams;
alter publication supabase_realtime add table public.draw_guess_players;
alter publication supabase_realtime add table public.draw_guess_rounds;
alter publication supabase_realtime add table public.draw_guess_actions;

-- ============================================================
-- 6. 自动更新 updated_at 触发器
-- ============================================================

-- 如果 update_updated_at_column 函数不存在，先创建它
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_draw_guess_rooms_updated_at
  before update on public.draw_guess_rooms
  for each row
  execute function update_updated_at_column();

-- ============================================================
-- 7. 清理过期房间的函数
-- ============================================================

create or replace function cleanup_expired_draw_guess_rooms()
returns void as $$
begin
  delete from public.draw_guess_rooms
  where expires_at < now()
    and status != 'active';
end;
$$ language plpgsql security definer;

-- ============================================================
-- 8. 生成房间码的函数
-- ============================================================

create or replace function generate_draw_guess_room_code()
returns varchar(6) as $$
declare
  chars varchar(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result varchar(6) := '';
  i int;
  exists_flag boolean;
begin
  -- 生成随机房间码并确保唯一
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * 36 + 1)::int, 1);
    end loop;
    
    -- 检查是否已存在
    select exists(select 1 from public.draw_guess_rooms where room_code = result)
    into exists_flag;
    
    exit when not exists_flag;
  end loop;
  
  return result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 9. 初始化全局词库 (中文示例)
-- ============================================================

insert into public.draw_guess_words (word, category, difficulty, lang) values
-- 动物类
('小猫', '动物', 'easy', 'zh'),
('小狗', '动物', 'easy', 'zh'),
('兔子', '动物', 'easy', 'zh'),
('老虎', '动物', 'medium', 'zh'),
('狮子', '动物', 'medium', 'zh'),
('大象', '动物', 'medium', 'zh'),
('长颈鹿', '动物', 'medium', 'zh'),
('企鹅', '动物', 'medium', 'zh'),
('海豚', '动物', 'medium', 'zh'),
('蝴蝶', '动物', 'easy', 'zh'),
('蜜蜂', '动物', 'easy', 'zh'),
('孔雀', '动物', 'hard', 'zh'),
('熊猫', '动物', 'easy', 'zh'),
('恐龙', '动物', 'medium', 'zh'),
('独角兽', '动物', 'hard', 'zh'),

-- 食物类
('苹果', '食物', 'easy', 'zh'),
('香蕉', '食物', 'easy', 'zh'),
('西瓜', '食物', 'easy', 'zh'),
('草莓', '食物', 'easy', 'zh'),
('葡萄', '食物', 'medium', 'zh'),
('蛋糕', '食物', 'easy', 'zh'),
('冰淇淋', '食物', 'easy', 'zh'),
('披萨', '食物', 'medium', 'zh'),
('汉堡', '食物', 'medium', 'zh'),
('面条', '食物', 'easy', 'zh'),
('饺子', '食物', 'medium', 'zh'),
('火锅', '食物', 'medium', 'zh'),

-- 物品类
('手机', '物品', 'easy', 'zh'),
('电脑', '物品', 'easy', 'zh'),
('电视', '物品', 'easy', 'zh'),
('耳机', '物品', 'medium', 'zh'),
('眼镜', '物品', 'easy', 'zh'),
('雨伞', '物品', 'easy', 'zh'),
('书包', '物品', 'easy', 'zh'),
('钥匙', '物品', 'easy', 'zh'),
('闹钟', '物品', 'medium', 'zh'),
('相机', '物品', 'medium', 'zh'),
('吉他', '物品', 'medium', 'zh'),
('钢琴', '物品', 'medium', 'zh'),

-- 运动类
('足球', '运动', 'easy', 'zh'),
('篮球', '运动', 'easy', 'zh'),
('游泳', '运动', 'easy', 'zh'),
('跑步', '运动', 'easy', 'zh'),
('滑雪', '运动', 'medium', 'zh'),
('羽毛球', '运动', 'medium', 'zh'),
('乒乓球', '运动', 'medium', 'zh'),
('自行车', '运动', 'medium', 'zh'),
('滑板', '运动', 'medium', 'zh'),
('瑜伽', '运动', 'medium', 'zh'),

-- 职业类
('医生', '职业', 'easy', 'zh'),
('老师', '职业', 'easy', 'zh'),
('警察', '职业', 'easy', 'zh'),
('消防员', '职业', 'medium', 'zh'),
('厨师', '职业', 'easy', 'zh'),
('飞行员', '职业', 'medium', 'zh'),
('画家', '职业', 'medium', 'zh'),
('科学家', '职业', 'medium', 'zh'),
('宇航员', '职业', 'hard', 'zh'),
('魔术师', '职业', 'hard', 'zh'),

-- 自然类
('太阳', '自然', 'easy', 'zh'),
('月亮', '自然', 'easy', 'zh'),
('星星', '自然', 'easy', 'zh'),
('彩虹', '自然', 'medium', 'zh'),
('雪花', '自然', 'medium', 'zh'),
('闪电', '自然', 'medium', 'zh'),
('火山', '自然', 'medium', 'zh'),
('瀑布', '自然', 'medium', 'zh'),
('沙漠', '自然', 'hard', 'zh'),
('极光', '自然', 'hard', 'zh'),

-- 动作类
('跳舞', '动作', 'easy', 'zh'),
('唱歌', '动作', 'easy', 'zh'),
('睡觉', '动作', 'easy', 'zh'),
('吃饭', '动作', 'easy', 'zh'),
('打喷嚏', '动作', 'medium', 'zh'),
('做运动', '动作', 'medium', 'zh'),
('看书', '动作', 'easy', 'zh'),
('开车', '动作', 'medium', 'zh'),
('打电话', '动作', 'medium', 'zh'),
('放风筝', '动作', 'hard', 'zh')

on conflict do nothing;

-- ============================================================
-- ✅ 脚本执行完毕
-- 注意：执行完后请在 Supabase Dashboard → Database → Replication
--       确认以上表已出现在 supabase_realtime publication 中
-- ============================================================
