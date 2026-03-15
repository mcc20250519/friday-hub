-- ============================================================
-- UNO Bot 支持补丁脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 1. 移除 uno_players.user_id 的外键约束（允许 Bot 不在 profiles 表）
alter table public.uno_players
  drop constraint if exists uno_players_user_id_fkey;

-- 2. 删除旧的 insert 策略
drop policy if exists "uno_players_insert" on public.uno_players;

-- 3. 新策略：允许登录用户插入自己的记录，或者房主插入 Bot 记录（任意 user_id）
create policy "uno_players_insert"
  on public.uno_players for insert
  with check (
    -- 正常玩家：user_id 必须是自己
    auth.uid() = user_id
    OR
    -- 房主可以插入机器人（user_id 不等于自己，但 room_id 的 host 是自己）
    exists (
      select 1 from public.uno_rooms
      where id = room_id
        and host_id = auth.uid()
    )
  );

-- 4. 删除旧的 delete 策略，允许房主删除机器人记录
drop policy if exists "uno_players_delete" on public.uno_players;

create policy "uno_players_delete"
  on public.uno_players for delete
  using (
    -- 玩家可以删除自己
    auth.uid() = user_id
    OR
    -- 房主可以删除任意玩家（包括 Bot）
    exists (
      select 1 from public.uno_rooms
      where id = room_id
        and host_id = auth.uid()
    )
  );

-- ============================================================
-- ✅ 执行完毕
-- ============================================================
