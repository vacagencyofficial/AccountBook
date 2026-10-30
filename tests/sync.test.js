import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'fs'

const P = new URL('../', import.meta.url).pathname
const store = {}
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v)
  },
  removeItem: (k) => {
    delete store[k]
  },
}

const pg = new PGlite({ extensions: { pgcrypto } })
const files = new Map()
let failPull = false
const fake = {
  async rpc(fn, args = {}) {
    if (fn === 'sailp_pull' && failPull) return { data: null, error: { message: 'network down' } }
    const keys = Object.keys(args)
    const sql = `select ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
    try {
      const res = await pg.query(
        sql,
        keys.map((k) => args[k]),
      )
      return { data: res.rows[0].r, error: null }
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } }
    }
  },
  storage: {
    from: () => ({
      async upload(path, blob) {
        try {
          await pg.query(`insert into storage.objects(bucket_id,name) values ('photos',$1)`, [path])
        } catch (e) {
          return { error: { message: e.message } }
        }
        files.set(path, blob)
        return { error: null }
      },
      getPublicUrl: (path) => ({ data: { publicUrl: 'mem://' + path } }),
    }),
  },
}
globalThis.fetch = async (url) => {
  const b = files.get(url.replace('mem://', ''))
  return b ? new Response(b) : new Response(null, { status: 404 })
}
vi.mock('../src/lib/supabase.js', () => ({ isCloudConfigured: true, supabase: fake }))

let sync, db, ws
beforeAll(async () => {
  await pg.exec(`create schema extensions; create extension pgcrypto schema extensions;
create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security; grant all on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant execute on function storage.foldername(text) to anon, authenticated;`)
  await pg.exec(fs.readFileSync(P + 'supabase/schema.sql', 'utf8'))
  await pg.exec(fs.readFileSync(P + 'supabase/secure.sql', 'utf8'))
  await pg.exec('set role anon')
  sync = await import(P + 'src/db/cloudSync.js')
  db = (await import(P + 'src/db/index.js')).db
})

describe('클라우드 동기화 (secure.sql + 새 cloudSync)', () => {
  it('폰 A: 새 장부 만들고 가게·기록·사진 2장 올리기', async () => {
    const shopId = await db.shops.add({
      name: '미소옷장',
      building: '청평화',
      floor: '3F',
      unit: 'A-1',
      phone: '',
      memo: '',
      lastVisitedAt: 1,
    })
    const itemId = await db.items.add({
      shopId,
      date: '2026-10-28',
      name: '니트',
      category: '상의',
      color: '',
      size: '',
      price: 15000,
      qty: 3,
      memo: '',
      status: '구매',
      createdAt: 1761600000000,
    })
    await db.photos.bulkAdd([
      { itemId, blob: new Blob(['p1']) },
      { itemId, blob: new Blob(['p2']) },
    ])
    ws = await sync.connectWorkspace()
    expect(ws.code).toMatch(/^SAILP-[A-Z2-9]{10}$/)
    await sync.syncBidirectional()
    expect((await db.shops.toArray())[0].cloudId).toBeTruthy()
    expect((await db.items.toArray())[0].cloudId).toBeTruthy()
    expect(files.size).toBe(2)
    expect([...files.keys()].every((k) => k.startsWith(ws.id + '/'))).toBe(true)
  })

  it('다시 동기화해도 중복 생성 없음', async () => {
    await sync.syncBidirectional()
    const remote = (await fake.rpc('sailp_pull', { p_code: ws.code })).data
    expect(remote.shops.length).toBe(1)
    expect(remote.items.length).toBe(1)
    expect(remote.photos.length).toBe(2)
    expect(await db.shops.count()).toBe(1)
    expect(await db.items.count()).toBe(1)
  })

  it('받기 실패 시 「인터넷 내용으로 채우기」가 기존 장부를 지우지 않음', async () => {
    failPull = true
    await expect(sync.pullCloudToLocal({ replaceLocal: true })).rejects.toBeTruthy()
    failPull = false
    expect(await db.items.count()).toBe(1)
    expect(await db.photos.count()).toBe(2)
  })

  it('폰 B: 초대 번호로 연결하면 같은 장부를 받음', async () => {
    await db.transaction('rw', db.shops, db.items, db.photos, async () => {
      await db.photos.clear()
      await db.items.clear()
      await db.shops.clear()
    })
    for (const k of Object.keys(store)) delete store[k]
    await sync.connectWorkspace(ws.code.toLowerCase())
    await sync.pullCloudToLocal({ replaceLocal: true })
    const [shop] = await db.shops.toArray()
    const [item] = await db.items.toArray()
    expect(shop.name).toBe('미소옷장')
    expect(item.price).toBe(15000)
    expect(item.shopId).toBe(shop.id)
    expect(await db.photos.count()).toBeGreaterThanOrEqual(1)
  })

  it('없는 번호는 알아듣기 쉬운 오류', async () => {
    await expect(sync.connectWorkspace('SAILP-ZZZZZZZZZZ')).rejects.toThrow('장부를 찾을 수 없어요')
  })

  it('앱에서 표를 직접 읽으면 거부됨', async () => {
    await expect(pg.query('select * from items')).rejects.toThrow('permission denied')
  })
})
