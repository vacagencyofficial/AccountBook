import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'

export default function NotFoundPage() {
  return (
    <div className="px-4 pt-10">
      <EmptyState
        title="찾는 화면이 없어요"
        description="주소가 잘못됐거나 없어진 화면이에요."
        action={
          <Link to="/" className="btn btn-primary mt-5 w-full">
            홈으로 가기
          </Link>
        }
      />
    </div>
  )
}
