-- ============================================================
-- 空房间自动删除 + 缩短清理间隔
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- ── 1. 当玩家离开后，若房间为空则自动删除 ──────────────────────

create or replace function delete_empty_uno_room()
returns trigger as $$
declare
  remaining_count int;
begin
  -- 统计该房间剩余玩家数
  select count(*) into remaining_count
  from public.uno_players
  where room_id = OLD.room_id;

  -- 若玩家已全部离开，删除房间（级联删除 game_state、actions）
  if remaining_count = 0 then
    delete from public.uno_rooms where id = OLD.room_id;
  end if;

  return OLD;
end;
$$ language plpgsql security definer;

-- 绑定到 uno_players 表的 DELETE 事件
drop trigger if exists trigger_delete_empty_room on public.uno_players;
create trigger trigger_delete_empty_room
  after delete on public.uno_players
  for each row
  execute function delete_empty_uno_room();

-- ── 2. 更新定时清理策略（缩短间隔，减少遗留脏数据）──────────────

-- 先删除旧版本清理函数
drop function if exists public.cleanup_expired_uno_rooms();

-- 新清理规则（更激进）：
--   - WAITING 状态：30 分钟无活动 → 删除
--   - PLAYING 状态：6 小时无活动 → 删除（防止游戏中断遗留）
--   - FINISHED 状态：30 分钟后 → 删除
create or replace function public.cleanup_expired_uno_rooms()
returns json as $$
declare
  deleted_waiting  int;
  deleted_playing  int;
  deleted_finished int;
begin
  delete from public.uno_rooms
  where status = 'waiting'
    and last_activity_at < now() - interval '30 minutes';
  get diagnostics deleted_waiting = row_count;

  delete from public.uno_rooms
  where status = 'playing'
    and last_activity_at < now() - interval '6 hours';
  get diagnostics deleted_playing = row_count;

  delete from public.uno_rooms
  where status = 'finished'
    and last_activity_at < now() - interval '30 minutes';
  get diagnostics deleted_finished = row_count;

  return json_build_object(
    'deleted_waiting',  deleted_waiting,
    'deleted_playing',  deleted_playing,
    'deleted_finished', deleted_finished,
    'total_deleted',    deleted_waiting + deleted_playing + deleted_finished,
    'cleaned_at',       now()
  );
end;
$$ language plpgsql security definer;

-- ── 3. 更新 pg_cron 定时任务（每 15 分钟执行一次）────────────────

-- 删除旧定时任务（如果存在）
select cron.unschedule('cleanup_uno_rooms_hourly') where exists (
  select 1 from cron.job where jobname = 'cleanup_uno_rooms_hourly'
);

-- 每 15 分钟清理一次
select cron.schedule(
  'cleanup_uno_rooms_15min',
  '*/15 * * * *',
  $$select public.cleanup_expired_uno_rooms()$$
);

-- ── 4. 立即清理现有遗留数据 ────────────────────────────────────

-- 删除没有玩家的房间（直接关闭浏览器遗留）
delete from public.uno_rooms
where id not in (
  select distinct room_id from public.uno_players
)
and status in ('waiting', 'finished');

-- 删除已过期的房间
delete from public.uno_rooms
where expires_at < now();

-- ── 验证 ───────────────────────────────────────────────────────
-- select count(*) from public.uno_rooms;
-- select count(*) from public.uno_players;
-- select count(*) from public.uno_game_state;
