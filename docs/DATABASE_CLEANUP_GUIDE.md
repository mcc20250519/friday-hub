# 数据库自动清理指南

## 已实现的清理机制

### 1. 即时清理（前端 + 数据库触发器）

**当玩家离开房间时：**
- 前端检测：没有真实玩家剩余 → 删除整个房间
- 数据库触发器：`uno_players` 表为空 → 自动删除房间
- 级联删除：`uno_game_state`、`uno_actions` 等关联表自动清理

**无需手动操作**，玩家正常离开或关闭浏览器后，房间数据会自动清理。

---

### 2. 定时清理（pg_cron）

**清理策略：**
- **WAITING 状态**：30 分钟无活动 → 删除
- **PLAYING 状态**：6 小时无活动 → 删除
- **FINISHED 状态**：30 分钟后 → 删除

**执行频率：** 每 15 分钟自动运行一次

---

## 应用数据库清理脚本

### 步骤

1. **登录 Supabase Dashboard**  
   访问你的项目：https://supabase.com/dashboard

2. **执行 SQL 脚本**  
   - 导航到 **SQL Editor**
   - 打开 `database/sql/migrations/004_auto_delete_empty_rooms.sql`
   - 复制全部内容并粘贴到 SQL Editor
   - 点击 **Run** 执行

3. **启用 pg_cron 扩展**（如果尚未启用）
   - 导航到 **Database → Extensions**
   - 搜索 `pg_cron`
   - 点击 **Enable** 启用

4. **验证定时任务已创建**
   ```sql
   select * from cron.job;
   ```
   应该能看到 `cleanup_uno_rooms_15min` 任务

---

## 清理现有遗留数据

脚本会自动清理以下情况：
- ✅ 没有玩家的房间（直接关闭浏览器遗留）
- ✅ 已过期的房间（超过 `expires_at` 时间）

执行脚本后，旧数据会立即被清理。

---

## 监控与测试

### 手动触发清理（用于测试）
```sql
select public.cleanup_expired_uno_rooms();
```

### 查看当前房间数据
```sql
-- 房间总数
select count(*) as total_rooms from public.uno_rooms;

-- 按状态统计
select status, count(*) 
from public.uno_rooms 
group by status;

-- 查看空房间（没有玩家）
select r.*
from public.uno_rooms r
left join public.uno_players p on r.id = p.room_id
where p.id is null;
```

---

## 故障排查

### 定时任务未执行？

检查 pg_cron 状态：
```sql
select * from cron.job_run_details 
where jobid = (select jobid from cron.job where jobname = 'cleanup_uno_rooms_15min')
order by start_time desc
limit 10;
```

### 手动清理所有空房间
```sql
delete from public.uno_rooms
where id not in (
  select distinct room_id from public.uno_players
);
```

---

## 注意事项

- ⚠️ 数据删除**不可恢复**，确保备份重要数据
- ✅ 所有删除操作使用 `ON DELETE CASCADE`，关联数据会自动清理
- ✅ 真实玩家离开后，Bot 玩家会随房间一起被清除
- ✅ 房主离开时，会自动转让给其他真实玩家（如果有）

---

## 开发环境

如果不需要定时清理（避免开发时数据被意外删除），可以：

```sql
-- 暂停定时任务
select cron.unschedule('cleanup_uno_rooms_15min');

-- 恢复定时任务
select cron.schedule(
  'cleanup_uno_rooms_15min',
  '*/15 * * * *',
  $$select public.cleanup_expired_uno_rooms()$$
);
```
