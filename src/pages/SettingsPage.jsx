import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import InstallGuide from '../components/InstallGuide'
import BudgetSetting from '../components/BudgetSetting'
import CategoryBudgetSetting from '../components/CategoryBudgetSetting'
import RecurringSetting from '../components/RecurringSetting'
import EntryCategorySetting from '../components/EntryCategorySetting'
import TextSizePicker from '../components/settings/TextSizePicker'
import CloudSyncSetting from '../components/settings/CloudSyncSetting'
import BackupSetting from '../components/settings/BackupSetting'
import StorageSetting from '../components/settings/StorageSetting'
import { SettingsRow, SettingsSection } from '../components/settings/SettingsParts'
import { useStorageInfo } from '../hooks/useStorageInfo'
import { getWorkspaceCode } from '../lib/workspace'

/** 설정: 칸마다 맡은 컴포넌트가 있고, 이 화면은 맨 위 알림 문구와 장부 번호만 함께 씀 */
export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const storage = useStorageInfo()
  const [message, setMessage] = useState(() =>
    searchParams.get('joined') === '1' ? '초대받은 장부와 연결했어요' : null,
  )
  const [error, setError] = useState(null)
  const [workspaceCode, setWorkspaceCode] = useState(getWorkspaceCode())

  // 초대 주소로 연결하고 넘어오면(?joined=1) 안내만 남기고 주소에서는 지움
  // (장부 번호는 연결할 때 이미 저장돼 처음 값으로 읽힘)
  useEffect(() => {
    if (searchParams.get('joined') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('joined')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <div>
      <PageHeader title="설정" />

      <section className="space-y-5 px-4 pb-6 pt-2">
        {message && (
          <div
            className="rounded-[10px] bg-good-soft px-4 py-3 text-[17px] font-bold text-good"
            aria-live="polite"
          >
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="rounded-[10px] bg-red-50 px-4 py-3 text-[17px] font-bold text-red-700" role="alert">
            {error}
          </div>
        )}

        <SettingsSection title="글씨 크기">
          <TextSizePicker />
        </SettingsSection>

        <SettingsSection title="한 달 예산">
          <BudgetSetting />
        </SettingsSection>

        <SettingsSection title="분류별 예산">
          <CategoryBudgetSetting />
        </SettingsSection>

        <SettingsSection title="매달·매주 나가는 돈·들어오는 돈">
          <RecurringSetting />
        </SettingsSection>

        <SettingsSection title="가계부 분류">
          <EntryCategorySetting />
        </SettingsSection>

        <SettingsSection title="다른 폰과 같이 쓰기">
          <CloudSyncSetting
            workspaceCode={workspaceCode}
            onWorkspaceCodeChange={setWorkspaceCode}
            onMessage={setMessage}
            onError={setError}
            onStorageChanged={storage.reload}
          />
        </SettingsSection>

        <SettingsSection title="기록 챙기기">
          <BackupSetting onMessage={setMessage} onError={setError} onStorageChanged={storage.reload} />
        </SettingsSection>

        <SettingsSection title="홈 화면에 추가">
          <InstallGuide />
        </SettingsSection>

        <SettingsSection title="사진·저장 공간">
          <StorageSetting
            storage={storage}
            workspaceCode={workspaceCode}
            onWorkspaceCodeChange={setWorkspaceCode}
            onMessage={setMessage}
            onError={setError}
          />
        </SettingsSection>

        <SettingsSection title="도움">
          <Link to="/help" className="flex min-h-[4rem] items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[18px] font-bold text-ink">도움말</p>
              <p className="mt-0.5 text-[16px] font-semibold text-ink-soft">자주 묻는 것과 쓰는 방법</p>
            </div>
            <span className="text-[24px] text-ink-soft" aria-hidden>
              ›
            </span>
          </Link>
          <SettingsRow
            label="앱 정보"
            description={`사입노트 ${import.meta.env.VITE_APP_VERSION} · ${import.meta.env.VITE_BUILD_DATE} 업데이트`}
          />
        </SettingsSection>
      </section>
    </div>
  )
}
