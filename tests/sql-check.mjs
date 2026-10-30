import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'fs'
const R = new URL('../supabase/', import.meta.url).pathname
const db = new PGlite({ extensions: { pgcrypto } })
let pass = 0,
  fail = 0
const ok = (c, m) => {
  if (c) {
    pass++
    console.log('  ✓', m)
  } else {
    fail++
    console.log('  ✗', m)
  }
}
async function expectErr(sql, params, m, match) {
  try {
    await db.query(sql, params)
    ok(false, m + ' (오류가 나야 하는데 성공함)')
  } catch (e) {
    ok(!match || e.message.includes(match), `${m} → ${e.message}`)
  }
}
// Supabase 흉내
await db.exec(`
create schema extensions; create extension pgcrypto schema extensions;
create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant execute on function storage.foldername(text) to anon, authenticated;
`)
await db.exec(fs.readFileSync(R + 'schema.sql', 'utf8'))
console.log('schema.sql 적용 (기존 상태)')
await db.exec('set role anon')
const leak = await db.query('select count(*) from workspaces')
ok(true, '보안 전: anon이 workspaces 직접 조회 가능 (rows=' + leak.rows[0].count + ')')
await db.exec('reset role')
// 기존 사용자 데이터 흉내 (6자리 옛 번호)
await db.exec(`insert into workspaces(code) values ('SAILP-OLD123');`)
await db.exec(fs.readFileSync(R + 'secure.sql', 'utf8'))
await db.exec(fs.readFileSync(R + 'secure.sql', 'utf8'))
console.log('secure.sql 적용 (2번 실행해도 오류 없음)')

await db.exec('set role anon')
console.log('\n[1] 표 직접 접근 차단')
for (const t of ['workspaces', 'shops', 'items', 'photos'])
  await expectErr(`select * from ${t}`, [], `${t} 직접 조회 차단`, 'permission denied')
await expectErr(
  `insert into shops(workspace_id,name) values (gen_random_uuid(),'x')`,
  [],
  'shops 직접 쓰기 차단',
  'permission denied',
)
await expectErr(
  `select sailp_require_ws('SAILP-OLD123')`,
  [],
  '내부 도우미 함수 호출 차단',
  'permission denied',
)

console.log('\n[2] 장부 만들기/열기')
const A = (await db.query('select sailp_create_workspace() as w')).rows[0].w
const B = (await db.query('select sailp_create_workspace() as w')).rows[0].w
ok(/^SAILP-[A-Z2-9]{10}$/.test(A.code) && A.code !== B.code, `새 번호 10자리: ${A.code}, ${B.code}`)
const opened = (await db.query('select sailp_open_workspace($1) as w', [A.code.toLowerCase()])).rows[0].w
ok(opened?.id === A.id, '번호로 열기(소문자 입력도 허용)')
ok(
  (await db.query('select sailp_open_workspace($1) as w', ['SAILP-OLD123'])).rows[0].w?.code ===
    'SAILP-OLD123',
  '옛 6자리 번호도 계속 열림',
)
ok(
  (await db.query('select sailp_open_workspace($1) as w', ['SAILP-NOPE99'])).rows[0].w === null,
  '없는 번호는 null',
)

console.log('\n[3] 가게·기록·사진 저장')
const shopId = (
  await db.query('select sailp_upsert_shop($1,null,$2) as id', [
    A.code,
    { name: '미소옷장', building: '청평화', last_visited_at: 1700000000000 },
  ])
).rows[0].id
const shopId2 = (
  await db.query('select sailp_upsert_shop($1,$2,$3) as id', [
    A.code,
    shopId,
    { name: '미소옷장(수정)', building: '청평화', last_visited_at: 1700000000001 },
  ])
).rows[0].id
ok(shopId === shopId2, '같은 id로 다시 보내면 수정')
const itemId = (
  await db.query('select sailp_upsert_item($1,null,$2) as id', [
    A.code,
    {
      shop_id: shopId,
      date: '2026-10-28',
      name: '니트',
      price: 15000,
      qty: 3,
      status: '구매',
      created_at: 1761600000000,
    },
  ])
).rows[0].id
ok(!!itemId, '기록 추가')
await expectErr(
  'select sailp_add_photo($1,$2,$3)',
  [A.code, itemId, B.id + '/x.jpg'],
  '다른 장부 폴더 경로로 사진 등록 차단',
  'invalid_photo_path',
)
await db.query('select sailp_add_photo($1,$2,$3)', [A.code, itemId, A.id + '/' + itemId + '/1.jpg'])
await db.query('select sailp_add_photo($1,$2,$3)', [A.code, itemId, A.id + '/' + itemId + '/2.jpg'])
ok(
  (await db.query('select sailp_item_photo_count($1,$2) as c', [A.code, itemId])).rows[0].c === 2,
  '사진 수 2',
)

console.log('\n[4] 다른 장부 침범 차단')
const pullB = (await db.query('select sailp_pull($1) as d', [B.code])).rows[0].d
ok(pullB.shops.length === 0 && pullB.items.length === 0, 'B 장부에서는 A 자료가 안 보임')
const hijack = (
  await db.query('select sailp_upsert_shop($1,$2,$3) as id', [B.code, shopId, { name: '해킹' }])
).rows[0].id
ok(hijack !== shopId, 'B 번호로 A 가게 id를 보내면 A는 안 바뀌고 B에 새로 생김')
const itemB = (
  await db.query('select sailp_upsert_item($1,null,$2) as id', [
    B.code,
    { shop_id: shopId, date: '2026-10-28', name: 'x' },
  ])
).rows[0].id
const pullB2 = (await db.query('select sailp_pull($1) as d', [B.code])).rows[0].d
ok(pullB2.items.find((i) => i.id === itemB).shop_id === null, 'B 기록에 A 가게 연결 불가')
await expectErr(
  'select sailp_item_photo_count($1,$2)',
  ['SAILP-WRONG00', itemId],
  '틀린 번호 → 오류',
  'workspace_not_found',
)
await expectErr(
  'select sailp_add_photo($1,$2,$3)',
  [B.code, itemId, B.id + '/x.jpg'],
  'B 번호로 A 기록에 사진 추가 차단',
  'item_not_found',
)

console.log('\n[5] 내려받기')
const pullA = (await db.query('select sailp_pull($1) as d', [A.code])).rows[0].d
ok(
  pullA.shops.length === 1 &&
    pullA.shops[0].name === '미소옷장(수정)' &&
    pullA.shops[0].building === '청평화',
  '가게 1곳(수정 반영)',
)
ok(
  pullA.items.length === 1 &&
    pullA.items[0].price === 15000 &&
    pullA.items[0].created_at === 1761600000000 &&
    pullA.items[0].shop_id === shopId,
  '기록 1건(금액·시간·가게 연결)',
)
ok(pullA.photos.length === 2, '사진 2장')
ok(!JSON.stringify(pullA).includes('해킹'), 'A 자료에 B 내용 없음')

console.log('\n[6] 사진 저장소')
await db.query(`insert into storage.objects(bucket_id,name) values ('photos', $1)`, [
  A.id + '/' + itemId + '/3.jpg',
])
ok(true, '실제 장부 폴더에는 올리기 허용')
await expectErr(
  `insert into storage.objects(bucket_id,name) values ('photos', 'random/x.jpg')`,
  [],
  '없는 장부 폴더에 올리기 차단',
  'row-level security',
)
ok(
  (await db.query('select count(*)::int c from storage.objects')).rows[0].c === 0,
  '저장소 목록 조회 결과 0건 (목록 차단)',
)
await db.exec('reset role')
ok(
  (await db.query(`select public from storage.buckets where id='photos'`)).rows[0].public === true,
  '사진 버킷은 공개(주소를 알아야 열림)',
)
await db.exec('set role anon')
console.log('\n[7] 지운 사진 파일 정리')
const keepPath = A.id + '/' + itemId + '/keep.jpg'
const goPath = A.id + '/' + itemId + '/go.jpg'
await db.query(`insert into storage.objects(bucket_id,name) values ('photos',$1),('photos',$2)`, [
  keepPath,
  goPath,
])
const _keepId = (await db.query('select sailp_add_photo($1,$2,$3) as id', [A.code, itemId, keepPath])).rows[0]
  .id
const goId = (await db.query('select sailp_add_photo($1,$2,$3) as id', [A.code, itemId, goPath])).rows[0].id
const paths = (await db.query('select sailp_delete($1,$2,$3) as p', [A.code, 'photo', goId])).rows[0].p
ok(JSON.stringify(paths) === JSON.stringify([goPath]), '사진 지우기 → 지울 파일 경로를 돌려줌')
const visible = (await db.query('select name from storage.objects')).rows.map((r) => r.name)
ok(visible.length === 1 && visible[0] === goPath, '저장소에서는 지운 사진 파일만 보임(나머지는 계속 숨김)')
await db.query(`delete from storage.objects where bucket_id='photos' and name = $1`, [keepPath])
await db.query(`delete from storage.objects where bucket_id='photos' and name = $1`, [goPath])
await db.exec('reset role')
const left = (await db.query('select name from storage.objects')).rows.map((r) => r.name)
ok(left.includes(keepPath) && !left.includes(goPath), '지운 사진 파일만 지워지고, 안 지운 사진 파일은 남음')
await db.exec('set role anon')

console.log('\n[7-2] 가계부(지출·수입)')
const entryId = (
  await db.query('select sailp_upsert_entry($1,null,$2) as id', [
    A.code,
    {
      type: 'expense',
      date: '2026-10-01',
      amount: 9000,
      category: '식비',
      memo: '점심',
      client_updated_at: 10,
    },
  ])
).rows[0].id
await db.query('select sailp_upsert_entry($1,$2,$3)', [
  A.code,
  entryId,
  { type: 'expense', date: '2026-10-01', amount: 7000, category: '식비', client_updated_at: 5 },
])
let pulledEntries = (await db.query('select sailp_pull($1) as p', [A.code])).rows[0].p.entries
ok(
  pulledEntries.length === 1 && Number(pulledEntries[0].amount) === 9000,
  '오래된 수정은 최신 금액을 덮지 않음',
)
const otherId = (
  await db.query('select sailp_upsert_entry($1,$2,$3) as id', [
    B.code,
    entryId,
    { type: 'income', amount: 1, client_updated_at: 99 },
  ])
).rows[0].id
pulledEntries = (await db.query('select sailp_pull($1) as p', [A.code])).rows[0].p.entries
ok(
  otherId !== entryId && Number(pulledEntries[0].amount) === 9000,
  '다른 장부 번호로는 이 장부 가계부를 고칠 수 없음',
)
ok(
  (await db.query('select sailp_pull($1) as p', [B.code])).rows[0].p.entries.every((e) => e.id !== entryId),
  '다른 장부에서는 이 장부 가계부가 안 보임',
)
await db.query('select sailp_delete($1,$2,$3)', [A.code, 'entry', entryId])
const afterDelete = (await db.query('select sailp_pull($1) as p', [A.code])).rows[0].p
ok(
  afterDelete.entries.length === 0 && afterDelete.deleted.entries.includes(entryId),
  '가계부 기록 지우기 → 지움 표시가 내려감',
)
await expectErr('select * from entries', [], '가계부 표는 직접 못 봄', 'permission denied')

console.log('\n[8] 장부 번호 바꾸기')
const rotated = (await db.query('select sailp_rotate_code($1) as w', ['SAILP-OLD123'])).rows[0].w
ok(/^SAILP-[A-Z2-9]{10}$/.test(rotated.code), `옛 6자리 → 새 10자리: ${rotated.code}`)
ok(
  (await db.query('select sailp_open_workspace($1) as w', ['SAILP-OLD123'])).rows[0].w === null,
  '옛 번호로는 더는 안 열림',
)
ok(
  (await db.query('select sailp_open_workspace($1) as w', [rotated.code])).rows[0].w.id === rotated.id,
  '새 번호로 같은 장부가 열림',
)
await expectErr(
  'select sailp_rotate_code($1)',
  ['SAILP-NOPE99'],
  '없는 번호는 바꿀 수 없음',
  'workspace_not_found',
)
await expectErr('select sailp_new_code()', [], '번호 만드는 내부 함수는 직접 호출 불가', 'permission denied')
await db.exec('reset role')

console.log(`\n결과: ${pass}개 통과 / ${fail}개 실패`)
process.exit(fail ? 1 : 0)
