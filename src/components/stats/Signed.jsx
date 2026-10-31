import { formatWonShort } from '../../utils/labels'

/** 늘고 준 금액: ▲·▼와 색 (good='down'이면 줄어든 게 좋은 것) */
export default function Signed({ value, good = 'down' }) {
  if (!value) return <span className="text-ink-soft">같아요</span>
  const up = value > 0
  const isGood = good === 'down' ? !up : up
  return (
    <b className={isGood ? 'text-good' : 'text-accent-dark'}>
      {up ? '▲' : '▼'} {formatWonShort(Math.abs(value))}
    </b>
  )
}
