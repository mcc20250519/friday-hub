-- ============================================================
-- UNO 房间自动清理功能
-- 需要在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. 添加 last_activity_at 字段到 uno_rooms 表
-- 用于跟踪房间的最后活动时间
alter table public.uno_rooms
add column if not exists last_activity_at timestamptz default now();

-- 为现有数据设置初始值（uno_rooms 没有 updated_at，直接用 created_at）
update public.uno_rooms
set last_activity_at = created_at
where last_activity_at is null;

-- 创建索引加速清理查询
create index if not exists idx_uno_rooms_last_activity_at
on public.uno_rooms(last_activity_at);

-- 2. 创建自动更新 last_activity_at 的触发器函数
create or replace function update_uno_room_activity()
returns trigger as $$
begin
  -- 当房间状态变化或有玩家活动时，更新 last_activity_at
  update public.uno_rooms
  set last_activity_at = now()
  where id = new.room_id;
  return new;
end;
$$ language plpgsql;

-- 3. 为 uno_game_state 表添加触发器
-- 每次游戏状态更新时刷新房间活动时间
drop trigger if exists update_room_activity_on_game_state on public.uno_game_state;
create trigger update_room_activity_on_game_state
  after update on public.uno_game_state
  for each row
  execute function update_uno_room_activity();

-- 4. 为 uno_players 表添加触发器
-- 玩家加入/离开时刷新房间活动时间
drop trigger if exists update_room_activity_on_players on public.uno_players;
create trigger update_room_activity_on_players
  after insert or update or delete on public.uno_players
  for each row
  execute function update_uno_room_activity();

-- 5. 增强清理函数
-- 先删除旧版本（返回类型不同）
drop function if exists public.cleanup_expired_uno_rooms();

-- 清理规则：
--   - WAITING 状态：2小时无活动
--   - PLAYING 状态：24小时无活动
--   - FINISHED 状态：1小时无活动
create function cleanup_expired_uno_rooms()
returns json as $$
declare
  deleted_waiting int;
  deleted_playing int;
  deleted_finished int;
begin
  -- 清理 WAITING 状态（2小时无活动）
  delete from public.uno_rooms
  where status = 'waiting'
    and last_activity_at < now() - interval '2 hours';
  get diagnostics deleted_waiting = row_count;

  -- 清理 PLAYING 状态（24小时无活动 - 可能是游戏中断）
  delete from public.uno_rooms
  where status = 'playing'
    and last_activity_at < now() - interval '24 hours';
  get diagnostics deleted_playing = row_count;

  -- 清理 FINISHED 状态（1小时无活动）
  delete from public.uno_rooms
  where status = 'finished'
    and last_activity_at < now() - interval '1 hour';
  get diagnostics deleted_finished = row_count;

  return json_build_object(
    'deleted_waiting', deleted_waiting,
    'deleted_playing', deleted_playing,
    'deleted_finished', deleted_finished,
    'total_deleted', deleted_waiting + deleted_playing + deleted_finished,
    'cleaned_at', now()
  );
end;
$$ language plpgsql security definer;

-- 6. 设置 pg_cron 定时任务（每小时执行一次清理）
-- 注意：需要在 Supabase Dashboard 中启用 pg_cron 扩展
-- Database → Extensions → 搜索 cron → 启用

-- 如果 pg_cron 已启用，创建定时任务
-- 每小时整点执行清理
select cron.schedule(
  'cleanup_uno_rooms_hourly',
  '0 * * * *',  -- 每小时整点
  $$select cleanup_expired_uno_rooms()$$
);

-- 7. 手动测试清理函数（可选）
-- select cleanup_expired_uno_rooms();

-- ============================================================
-- 使用说明：
--
-- 1. 在 Supabase Dashboard → Database → Extensions 中启用 pg_cron
-- 2. 执行此脚本
-- 3. 定时任务会自动每小时清理过期房间
--
-- 如果 pg_cron 不可用，可以：
-- - 使用 Supabase Edge Functions 定时调用
-- - 使用外部定时任务调用 Supabase RPC
-- ============================================================
