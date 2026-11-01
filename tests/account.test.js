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
let currentUser = null
const origRpc = fake.rpc
fake.rpc = async (fn, args) => {
  await pg.exec('reset role')
  await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [currentUser ?? ''])
  await pg.exec(currentUser ? 'set role authenticated' : 'set role anon')
  return origRpc(fn, args)
}
fake.auth = {
  async getSession() {
    return { data: { session: currentUser ? { user: { id: currentUser } } : null } }
  },
  async signOut() {
    currentUser = null
    return { error: null }
  },
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
}
vi.mock('../src/lib/supabase.js', () => ({ isCloudConfigured: true, supabase: fake }))

const U1 = '11111111-1111-1111-1111-111111111111'
let sync, account, db
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
grant execute on function storage.foldername(text) to anon, authenticated;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;`)
  await pg.exec(fs.readFileSync(P + 'supabase/schema.sql', 'utf8'))
  await pg.exec(fs.readFileSync(P + 'supabase/secure.sql', 'utf8'))
  await pg.exec(fs.readFileSync(P + 'supabase/auth.sql', 'utf8'))
  await pg.query('insert into auth.users(id) values ($1)', [U1])
  sync = await import(P + 'src/db/cloudSync.js')
  account = await import(P + 'src/db/account.js')
  db = (await import(P + 'src/db/index.js')).db
})

const addEntry = (memo) =>
  db.entries.add({
    type: 'expense',
    date: '2026-11-01',
    amount: 3000,
    category: '식비',
    memo,
    payment: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    dirty: 1,
  })

describe('간편 로그인 ↔ 장부 연결', () => {
  let firstCode
  it('게스트로 쓰던 기록 → 처음 로그인하면 계정에 새 장부가 생기고 기록이 올라감', async () => {
    await addEntry('게스트 점심')
    currentUser = U1
    const r = await account.linkAccountWorkspace()
    expect(r.status).toBe('created')
    firstCode = r.workspace.code
    const remote = await fake.rpc('sailp_pull', { p_code: firstCode })
    expect(remote.data.entries.map((e) => e.memo)).toContain('게스트 점심')
  })

  it('로그아웃하면 이 폰 기록이 지워지고 계정 장부는 남음', async () => {
    await account.signOutAndForget()
    expect(await db.entries.count()).toBe(0)
    expect(localStorage.getItem('sailp-workspace-code')).toBeNull()
    currentUser = U1
    expect((await fake.rpc('sailp_my_workspace')).data.code).toBe(firstCode)
  })

  it('새 폰(빈 폰)에서 로그인하면 계정 장부를 그대로 불러옴', async () => {
    const r = await account.linkAccountWorkspace()
    expect(r.status).toBe('opened')
    expect((await db.entries.toArray()).map((e) => e.memo)).toContain('게스트 점심')
  })

  it('다른 장부를 쓰던 폰에서 로그인하면 먼저 물어봄 → 합치기', async () => {
    await account.signOutAndForget()
    await addEntry('다른 폰 기록')
    await sync.connectWorkspace() // 게스트로 새 장부
    await sync.syncBidirectional()
    currentUser = U1
    const r = await account.linkAccountWorkspace()
    expect(r.status).toBe('choose')
    await account.openAccountWorkspace(r.workspace.code, 'keep')
    expect(localStorage.getItem('sailp-workspace-code')).toBe(firstCode)
    const memos = (await db.entries.toArray()).map((e) => e.memo)
    expect(memos).toEqual(expect.arrayContaining(['게스트 점심', '다른 폰 기록']))
  })

  it('카드 할부 개월 수가 클라우드에 올라갔다가 그대로 내려옴', async () => {
    const id = await db.entries.add({
      type: 'expense',
      date: '2026-11-01',
      amount: 120000,
      category: '임대료',
      memo: '할부 테스트',
      payment: '카드',
      installment: 6,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dirty: 1,
    })
    await sync.syncBidirectional()
    const remote = await fake.rpc('sailp_pull', { p_code: firstCode })
    expect(remote.data.entries.find((e) => e.memo === '할부 테스트').installment).toBe(6)
    await db.entries.delete(id)
    await sync.pullCloudToLocal({ replaceLocal: true })
    expect((await db.entries.toArray()).find((e) => e.memo === '할부 테스트').installment).toBe(6)
  })

  it('회원 탈퇴하면 장부와 계정이 지워지고 이 폰도 비워짐', async () => {
    await account.deleteAccount()
    expect(await db.entries.count()).toBe(0)
    await pg.exec('reset role')
    expect(
      (await pg.query('select count(*)::int as n from workspaces where code = $1', [firstCode])).rows[0].n,
    ).toBe(0)
    expect((await pg.query('select count(*)::int as n from auth.users')).rows[0].n).toBe(0)
  })
})
