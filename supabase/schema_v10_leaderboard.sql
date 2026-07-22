-- ============================================================
-- UniEmbassy 增量 schema v10：貢獻積分排行榜（2026-07-22）
-- 分數「動態計算、不落地存」——每次查即時算，審核退回自動掉分、永不失同步、零新表。
-- 計分：心得+20/篇(每人每計畫只算1篇) · 情報採用+10 · 提報計畫上架+30 · 建名片+10 · 發起活動+15
-- 兩個 security definer RPC，只回聚合與公開欄位（不外洩 email）；公開可讀。
-- 在 Supabase SQL Editor 貼上整段執行一次（前面 schema 都跑過後才跑這個）。
-- ============================================================

-- ---------- 排行榜 Top N（公開）----------
create or replace function leaderboard(limit_n int default 10)
returns table(
  user_id uuid, score bigint,
  nickname text, avatar_url text,
  profile_id uuid, school text, badges text[]
) as $$
  with src as (
    -- 心得：每人每計畫算一篇 × 20
    select user_id, count(distinct program_id) * 20 as pts, min(created_at) as first_at
      from reviews where status = 'live' group by user_id
    union all
    -- 計畫情報被採用 × 10
    select user_id, count(*) * 10, min(created_at)
      from program_notes where status = 'accepted' group by user_id
    union all
    -- 提報計畫且上架 × 30（登入者投稿）
    select submitted_by, count(*) * 30, min(created_at)
      from programs where status = 'live' and submitted_by is not null group by submitted_by
    union all
    -- 建名片通過 +10（每人一張 live 名片）
    select user_id, 10, min(created_at)
      from profiles where status = 'live' group by user_id
    union all
    -- 發起活動通過 × 15
    select host_user_id, count(*) * 15, min(created_at)
      from events where status = 'live' group by host_user_id
  ),
  scores as (
    select user_id, sum(pts) as score, min(first_at) as first_at
      from src group by user_id
  )
  select s.user_id, s.score,
    coalesce(a.nickname, p.nickname, '大使') as nickname,
    coalesce(a.avatar_url, p.avatar_url) as avatar_url,
    p.id as profile_id, p.school, p.badges
  from scores s
  left join accounts a on a.user_id = s.user_id
  left join profiles p on p.user_id = s.user_id and p.status = 'live'
  where s.score > 0
  order by s.score desc, s.first_at asc
  limit greatest(1, least(limit_n, 100));
$$ language sql stable security definer;

-- ---------- 我的積分（登入者自己）----------
create or replace function my_score() returns json as $$
  select json_build_object(
    'reviews',  r.n, 'notes', nt.n, 'programs', pg.n, 'profile', pf.n, 'events', ev.n,
    'score', r.n * 20 + nt.n * 10 + pg.n * 30 + pf.n * 10 + ev.n * 15
  )
  from
    (select count(distinct program_id) n from reviews where status='live' and user_id = auth.uid()) r,
    (select count(*) n from program_notes where status='accepted' and user_id = auth.uid()) nt,
    (select count(*) n from programs where status='live' and submitted_by = auth.uid()) pg,
    (select count(*) n from profiles where status='live' and user_id = auth.uid()) pf,
    (select count(*) n from events where status='live' and host_user_id = auth.uid()) ev;
$$ language sql stable security definer;
