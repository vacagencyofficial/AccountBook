import { useCallback, useEffect, useState } from 'react'
import { getPhotoUsage } from '../lib/storageStatus'
import { formatStorageEstimate } from '../utils/storage'

async function readStorage() {
  try {
    const { getStorageEstimate } = await import('../utils/backup')
    const { usage, quota } = await getStorageEstimate()
    return { storageText: formatStorageEstimate(usage, quota), photoUsage: await getPhotoUsage() }
  } catch {
    return { storageText: '확인 불가', photoUsage: null }
  }
}

/** 설정: 이 폰에 쓰인 공간과 사진 수·용량. reload로 다시 셈 (백업·지우기 뒤) */
export function useStorageInfo() {
  const [info, setInfo] = useState({ storageText: '확인 중…', photoUsage: null })

  const reload = useCallback(async () => {
    const next = await readStorage()
    // 못 읽었을 때는 사진 칸은 지난 값 그대로 (예전과 같이)
    setInfo((prev) => ({ storageText: next.storageText, photoUsage: next.photoUsage ?? prev.photoUsage }))
  }, [])

  useEffect(() => {
    let alive = true
    readStorage().then((next) => alive && setInfo(next))
    return () => {
      alive = false
    }
  }, [])

  return { ...info, reload }
}
