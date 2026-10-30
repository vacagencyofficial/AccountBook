import { describe, it, expect, vi, beforeAll } from 'vitest'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import Dexie from 'dexie'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'fs'

const P = new URL('../', import.meta.url).pathname
const pg = new PGlite({ extensions: { pgcrypto } })
const files = new Map()
let uploads = 0
const fake = {
  async rpc(fn, args = {}) {
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
        uploads += 1
        files.set(path, blob)
        return { error: null }
      },
      getPublicUrl: (path) => ({ data: { publicUrl: 'mem://' + path } }),
      async remove(paths) {
        // 실제 저장소처럼 정책(지운 사진만)을 거쳐 지움
        const res = await pg.query(
          `delete from storage.objects where bucket_id='photos' and name = any($1) returning name`,
          [paths],
        )
        for (const row of res.rows) files.delete(row.name)
        return { data: res.rows, error: null }
      },
    }),
  },
}
globalThis.fetch = async (url) => {
  const b = files.get(url.replace('mem://', ''))
  return b ? new Response(b) : new Response(null, { status: 404 })
}
vi.mock('../src/lib/supabase.js', () => ({ isCloudConfigured: true, supabase: fake }))

/** 폰 한 대 = 따로 된 로컬 DB + localStorage */
async function makePhone() {
  vi.resetModules()
  const idb = new IDBFactory()
  Dexie.dependencies.indexedDB = idb
  Dexie.dependencies.IDBKeyRange = IDBKeyRange
  const store = {}
  const storage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
  }
  globalThis.localStorage = storage
  const phone = {
    storage,
    sync: await import(P + 'src/db/cloudSync.js'),
    db: (await import(P + 'src/db/index.js')).db,
    mut: await import(P + 'src/db/mutations.js'),
    backup: await import(P + 'src/utils/backup.js'),
  }
  return phone
}
function switchTo(phone) {
  globalThis.localStorage = phone.storage
  return phone
}
async function settle(phone) {
  switchTo(phone)
  await phone.sync.syncBidirectional()
}
const remoteOf = async (code) => (await fake.rpc('sailp_pull', { p_code: code })).data

let A, B, ws
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
  await pg.exec(fs.readFileSync(P + 'supabase/secure.sql', 'utf8'))
  await pg.exec('set role anon')
})

describe('여러 폰 동기화 (2단계)', () => {
  let itemA
  it('D07: A폰 사진 3장 → B폰에서 3장 모두 받음', async () => {
    A = switchTo(await makePhone())
    const shopId = await A.mut.createShop({ name: '미소옷장', building: '청평화' })
    itemA = await A.mut.saveItemWithPhotos({
      shopId,
      date: '2026-10-28',
      name: '니트',
      price: 15000,
      qty: 3,
      status: '구매',
      photoBlobs: [new Blob(['1']), new Blob(['2']), new Blob(['3'])],
    })
    ws = await A.sync.connectWorkspace()
    await settle(A)
    expect(uploads).toBe(3)

    B = switchTo(await makePhone())
    expect(await B.db.items.count()).toBe(0)
    expect(B.db).not.toBe(A.db)
    switchTo(A)
    expect(await A.db.items.count()).toBe(1)
    switchTo(B)
    await B.sync.connectWorkspace(ws.code)
    await settle(B)
    expect(await B.db.items.count()).toBe(1)
    expect(await B.db.photos.count()).toBe(3)
  })

  it('다시 맞춰도 중복 없음 (기록·사진)', async () => {
    await settle(A)
    await settle(B)
    await settle(A)
    const r = await remoteOf(ws.code)
    expect([r.shops.length, r.items.length, r.photos.length]).toEqual([1, 1, 3])
    expect(uploads).toBe(3)
    expect(await A.db.photos.count()).toBe(3)
  })

  it('B에서 고친 가격이 A에 반영', async () => {
    switchTo(B)
    const [item] = await B.db.items.toArray()
    await B.mut.updateItem(item.id, { price: 20000 })
    await settle(B)
    await settle(A)
    expect((await A.db.items.get(itemA)).price).toBe(20000)
  })

  it('별표가 다른 폰에도 맞춰지고, 끄면 같이 꺼짐', async () => {
    switchTo(A)
    const id = (await A.db.items.toArray())[0].id
    await A.mut.setItemStarred(id, true)
    await settle(A)
    switchTo(B)
    await settle(B)
    expect((await B.db.items.toArray())[0].starred).toBe(1)
    await B.mut.setItemStarred((await B.db.items.toArray())[0].id, false)
    await settle(B)
    switchTo(A)
    await settle(A)
    expect((await A.db.items.get(id)).starred).toBe(0)
  })

  it('결제 방법·외상 갚음이 다른 폰에도 맞춰짐', async () => {
    switchTo(A)
    const id = (await A.db.items.toArray())[0].id
    await A.mut.updateItem(id, { payment: '외상' })
    await settle(A)
    switchTo(B)
    await settle(B)
    const onB = (await B.db.items.toArray())[0]
    expect(onB.payment).toBe('외상')
    expect(onB.settled).toBe(0)
    await B.mut.setItemSettled(onB.id, true)
    await settle(B)
    switchTo(A)
    await settle(A)
    expect((await A.db.items.get(id)).settled).toBe(1)
    await A.mut.updateItem(id, { payment: '카드' })
    await settle(A)
    switchTo(B)
    await settle(B)
    const after = (await B.db.items.toArray())[0]
    expect(after.payment).toBe('카드')
    expect(after.settled).toBe(0)
  })

  it('판매가가 다른 폰에도 맞춰짐', async () => {
    switchTo(A)
    const id = (await A.db.items.toArray())[0].id
    await A.mut.updateItem(id, { salePrice: '25000' })
    await settle(A)
    switchTo(B)
    await settle(B)
    expect((await B.db.items.toArray())[0].salePrice).toBe(25000)
  })

  it('지운 기록 되돌리기: 다른 폰에도 다시 생기고 사진도 함께', async () => {
    switchTo(A)
    const item = (await A.db.items.toArray())[0]
    const snapshot = await A.mut.deleteItem(item.id)
    await settle(A)
    switchTo(B)
    await settle(B)
    expect(await B.db.items.count()).toBe(0)
    switchTo(A)
    await A.mut.restoreItem(snapshot)
    await settle(A)
    switchTo(B)
    await settle(B)
    expect(await B.db.items.count()).toBe(1)
    expect(await B.db.photos.count()).toBe(3)
    switchTo(A)
    expect(await A.db.items.count()).toBe(1)
    expect(await A.db.photos.count()).toBe(3)
  })

  it('D03: 오래된 수정이 나중에 올라와도 최신 수정을 덮지 않음', async () => {
    // A가 먼저(과거 시각) 고치고, B가 나중에 고침 → B가 먼저 올리고, A가 늦게 올려도 B 값 유지
    switchTo(A)
    await A.mut.updateItem(itemA, { price: 11111 })
    await A.db.items.update(itemA, { updatedAt: Date.now() - 60_000 })
    switchTo(B)
    const [itemB] = await B.db.items.toArray()
    await B.mut.updateItem(itemB.id, { price: 22222 })
    await settle(B)
    await settle(A)
    expect((await A.db.items.get(itemA)).price).toBe(22222)
    expect((await remoteOf(ws.code)).items[0].price).toBe(22222)
  })

  it('D04: A에서 지운 사진·기록이 B에서도 지워지고 되살아나지 않음', async () => {
    switchTo(A)
    const photos = await A.db.photos.where('itemId').equals(itemA).toArray()
    await A.mut.deletePhoto(photos[0].id)
    await settle(A)
    await settle(B)
    expect(await B.db.photos.count()).toBe(2)

    switchTo(A)
    await A.mut.deleteItem(itemA)
    await settle(A)
    await settle(B)
    await settle(A)
    expect(await A.db.items.count()).toBe(0)
    expect(await B.db.items.count()).toBe(0)
    expect(await B.db.photos.count()).toBe(0)
    expect((await remoteOf(ws.code)).items.length).toBe(0)
  })

  it('가계부: 적기·고치기·지우기가 다른 폰에도 맞춰지고 되살아나지 않음', async () => {
    switchTo(A)
    const id = await A.mut.createEntry({
      type: 'expense',
      date: '2026-10-01',
      amount: 9000,
      category: '식비',
    })
    await A.mut.createEntry({ type: 'income', date: '2026-10-02', amount: 50000, category: '판매' })
    await settle(A)
    await settle(B)
    expect(await B.db.entries.count()).toBe(2)

    switchTo(B)
    const fromA = (await B.db.entries.toArray()).find((entry) => entry.type === 'expense')
    await B.mut.updateEntry(fromA.id, { ...fromA, amount: 12000, memo: '점심' })
    await settle(B)
    await settle(A)
    expect((await A.db.entries.get(id)).amount).toBe(12000)
    expect((await A.db.entries.get(id)).memo).toBe('점심')

    switchTo(A)
    await A.mut.deleteEntry(id)
    await settle(A)
    await settle(B)
    await settle(A)
    expect(await A.db.entries.count()).toBe(1)
    expect(await B.db.entries.count()).toBe(1)
    expect((await remoteOf(ws.code)).entries.length).toBe(1)
  })

  it('D09: 가게 숨기기가 다른 폰에도 반영되고 기록은 남음', async () => {
    switchTo(A)
    const [shop] = await A.db.shops.toArray()
    await A.mut.saveItemWithPhotos({
      shopId: shop.id,
      date: '2026-10-28',
      name: '바지',
      price: 30000,
      qty: 1,
      status: '구매',
    })
    await A.mut.setShopHidden(shop.id, true)
    await settle(A)
    await settle(B)
    const [shopB] = await B.db.shops.toArray()
    expect(shopB.hidden).toBe(1)
    expect(await B.db.items.count()).toBe(1)
  })

  it('저장 직후 동기화가 겹쳐도 한 번만 올라감', async () => {
    switchTo(A)
    const [shop] = await A.db.shops.toArray()
    await A.db.items.add({
      shopId: shop.id,
      date: '2026-10-28',
      name: '겹침',
      price: 1,
      qty: 1,
      status: '구매',
      createdAt: Date.now(),
      dirty: 1,
      updatedAt: Date.now(),
    })
    await Promise.all([A.sync.syncAfterWrite(), A.sync.syncAfterWrite(), A.sync.syncAfterWrite()])
    const r = await remoteOf(ws.code)
    expect(r.items.filter((i) => i.name === '겹침').length).toBe(1)
  })

  it('예전 방식으로 올라간 사진은 다시 올리지 않고 짝지음', async () => {
    switchTo(A)
    const [shop] = await A.db.shops.toArray()
    const id = await A.mut.saveItemWithPhotos({
      shopId: shop.id,
      date: '2026-10-28',
      name: '옛사진',
      price: 1,
      qty: 1,
      status: '구매',
      photoBlobs: [new Blob(['x']), new Blob(['y'])],
    })
    await settle(A)
    const before = uploads
    // 업그레이드 직후 상태 흉내: 사진의 클라우드 연결 표시가 없고 legacy 표시만 있음
    await A.db.photos
      .where('itemId')
      .equals(id)
      .modify((p) => {
        delete p.cloudId
        p.legacy = 1
      })
    await settle(A)
    expect(uploads).toBe(before)
    const linked = await A.db.photos.where('itemId').equals(id).toArray()
    expect(linked.every((p) => p.cloudId)).toBe(true)
    expect(new Set(linked.map((p) => p.cloudId)).size).toBe(2)
  })

  it('D05: 다른 장부로 바꿀 때 「지우고 보기」는 그 장부 내용만', async () => {
    const C = switchTo(await makePhone())
    const s = await C.mut.createShop({ name: 'C의가게' })
    await C.mut.saveItemWithPhotos({
      shopId: s,
      date: '2026-10-28',
      name: 'C기록',
      price: 5,
      qty: 1,
      status: '구매',
    })
    const wsC = await C.sync.connectWorkspace()
    await settle(C)
    await C.sync.connectWorkspace(ws.code, { localMode: 'discard' })
    await settle(C)
    const names = (await C.db.shops.toArray()).map((x) => x.name)
    expect(names).toEqual(['미소옷장'])
    expect((await remoteOf(wsC.code)).items.length).toBe(1)
    expect((await remoteOf(ws.code)).shops.map((x) => x.name)).not.toContain('C의가게')
  })

  it('D05: 「함께 옮기기」는 이 폰 기록을 새 장부에 새로 올리고, 옛 장부는 그대로', async () => {
    const D = switchTo(await makePhone())
    const s = await D.mut.createShop({ name: 'D의가게' })
    await D.mut.saveItemWithPhotos({
      shopId: s,
      date: '2026-10-28',
      name: 'D기록',
      price: 7,
      qty: 1,
      status: '구매',
      photoBlobs: [new Blob(['d'])],
    })
    const wsD = await D.sync.connectWorkspace()
    await settle(D)
    await D.sync.connectWorkspace(ws.code, { localMode: 'keep' })
    await settle(D)
    const main = await remoteOf(ws.code)
    expect(main.shops.map((x) => x.name)).toContain('D의가게')
    expect(main.items.map((x) => x.name)).toContain('D기록')
    const old = await remoteOf(wsD.code)
    expect(old.items.length).toBe(1)
    // D폰에 A 장부 내용도 내려옴
    expect((await D.db.shops.toArray()).map((x) => x.name)).toContain('미소옷장')
  })

  it('「인터넷 내용으로 채우기」: 이 폰 기록을 클라우드 내용으로 바꿈', async () => {
    switchTo(B)
    await B.db.items.add({
      shopId: 999,
      date: '2026-10-28',
      name: '로컬만',
      price: 1,
      qty: 1,
      createdAt: 1,
      dirty: 0,
      updatedAt: 1,
      cloudId: 'x',
    })
    await B.sync.pullCloudToLocal({ replaceLocal: true })
    const names = (await B.db.items.toArray()).map((i) => i.name)
    expect(names).not.toContain('로컬만')
    expect(names).toContain('바지')
  })

  it('엑셀·백업 덮어쓰기: 새 내용에 없는 기록은 다른 폰에서도 지워지고 되살아나지 않음', async () => {
    switchTo(A)
    await settle(A)
    const before = (await remoteOf(ws.code)).items.length
    expect(before).toBeGreaterThan(0)
    await A.db.transaction(
      'rw',
      [A.db.shops, A.db.items, A.db.photos, A.db.entries, A.db.deletions],
      async () => {
        await A.mut.rememberReplacedRecords(new Set())
        await A.db.photos.clear()
        await A.db.items.clear()
        await A.db.shops.clear()
      },
    )
    const s = await A.mut.createShop({ name: '엑셀가게' })
    await A.mut.saveItemWithPhotos({
      shopId: s,
      date: '2026-10-28',
      name: '엑셀기록',
      price: 1,
      qty: 1,
      status: '구매',
    })
    await settle(A)
    await settle(B)
    await settle(A)
    expect((await remoteOf(ws.code)).items.map((i) => i.name)).toEqual(['엑셀기록'])
    expect((await A.db.items.toArray()).map((i) => i.name)).toEqual(['엑셀기록'])
    expect((await B.db.items.toArray()).map((i) => i.name)).toEqual(['엑셀기록'])
  })

  it('「이 폰의 모든 기록 지우기」는 연결도 끊어서 다시 내려오지 않음', async () => {
    switchTo(B)
    await B.backup.deleteAllData()
    expect(B.storage.getItem('sailp-workspace-code')).toBeNull()
    expect(await B.db.items.count()).toBe(0)
    // 다른 폰(A)·클라우드 기록은 그대로
    expect((await remoteOf(ws.code)).items.length).toBe(1)
  })

  it('지운 사진 파일은 저장소에서도 정리되고, 남은 사진 파일은 그대로', async () => {
    switchTo(A)
    const [shop] = await A.db.shops.toArray()
    const id = await A.mut.saveItemWithPhotos({
      shopId: shop.id,
      date: '2026-10-28',
      name: '정리테스트',
      price: 1,
      qty: 1,
      status: '구매',
      photoBlobs: [new Blob(['k']), new Blob(['d'])],
    })
    await settle(A)
    const photos = await A.db.photos.where('itemId').equals(id).toArray()
    const [keep, gone] = photos
    expect(files.has(keep.storagePath) && files.has(gone.storagePath)).toBe(true)
    await A.mut.deletePhoto(gone.id)
    await settle(A)
    expect(files.has(gone.storagePath)).toBe(false)
    expect(files.has(keep.storagePath)).toBe(true)
    await A.mut.deleteItem(id)
    await settle(A)
    expect(files.has(keep.storagePath)).toBe(false)
  })

  it('장부 번호 바꾸기: 새 번호로 계속 쓰고, 옛 번호 폰은 안내 문구', async () => {
    switchTo(A)
    const before = ws.code
    const next = await A.sync.rotateWorkspaceCode()
    expect(next.code).not.toBe(before)
    expect(A.storage.getItem('sailp-workspace-code')).toBe(next.code)
    await settle(A)
    const C = switchTo(await makePhone())
    C.storage.setItem('sailp-workspace-code', before)
    await expect(C.sync.syncBidirectional()).rejects.toThrow('새 초대 주소')
    ws = next
  })
})
