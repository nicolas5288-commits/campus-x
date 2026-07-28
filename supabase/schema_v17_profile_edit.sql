-- ============================================================
-- schema_v17_profile_edit.sql — 2026-07-28
-- 目的：大使能自助編輯名片。已上架的改完直接生效（不下架重審），
--       只在後台留「修改過」標記供抽查；被退回的看得到原因。
--
-- ⚠️ 同時修既有漏洞：prof_update_own 允許本人 update 任何欄位（含 status），
--    等於懂技術的人可直接打 API 把自己名片改成 live 跳過審核。
--    修法＝寫入全走 security definer RPC（status 由後端決定），收掉本人直接寫的 policy。
--
-- 冪等：全部 if not exists / create or replace / drop if exists，可重複執行。
-- ============================================================

-- 1) 兩個新欄位
alter table profiles add column if not exists edited_at timestamptz;      -- 上架後被本人修改的時間（後台抽查用）
alter table profiles add column if not exists reject_reason text;          -- 退回原因（大使在會員頁看得到）

-- 2) 名片寫入唯一入口：status 由後端決定，前端傳什麼都沒用
--    無名片 → pending；rejected → 轉 pending 並清原因；pending → 維持 pending；
--    live → 維持 live 並蓋 edited_at（＝直接生效策略）
create or replace function save_my_profile(form jsonb)
returns text as $$
declare
  uid uuid := auth.uid();
  cur text;
  next_status text;
begin
  if uid is null then
    raise exception '請先登入';
  end if;

  select status into cur from profiles where user_id = uid;

  if cur is null then
    next_status := 'pending';
  elsif cur = 'live' then
    next_status := 'live';
  else
    next_status := 'pending';   -- pending 維持待審；rejected 重送轉回待審
  end if;

  insert into profiles (
    user_id, nickname, avatar, avatar_url, school, grade, headline,
    skills, experiences, ig_url, contact_open, status, edited_at, reject_reason
  ) values (
    uid,
    form->>'nickname',
    coalesce(nullif(form->>'avatar', ''), '👤'),
    nullif(form->>'avatar_url', ''),
    form->>'school',
    form->>'grade',
    form->>'headline',
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(form->'skills', '[]'::jsonb)) x), '{}'),
    coalesce(form->'experiences', '[]'::jsonb),
    nullif(form->>'ig_url', ''),
    coalesce((form->>'contact_open')::boolean, false),
    next_status,
    case when next_status = 'live' then now() else null end,
    null
  )
  on conflict (user_id) do update set
    nickname     = excluded.nickname,
    avatar       = excluded.avatar,
    -- 沒重傳照片就沿用舊的（前端不傳 avatar_url 時不該把既有照片清掉）
    avatar_url   = coalesce(excluded.avatar_url, profiles.avatar_url),
    school       = excluded.school,
    grade        = excluded.grade,
    headline     = excluded.headline,
    skills       = excluded.skills,
    experiences  = excluded.experiences,
    ig_url       = excluded.ig_url,
    contact_open = excluded.contact_open,
    status       = excluded.status,
    edited_at    = excluded.edited_at,
    reject_reason = null;

  return next_status;
end;
$$ language plpgsql security definer;

-- 3) 收掉本人直接寫入的權限（讀取 prof_read、管理員 prof_admin 保留）
drop policy if exists prof_upsert on profiles;
drop policy if exists prof_update_own on profiles;
