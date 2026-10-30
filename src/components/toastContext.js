import { createContext, useContext } from 'react'

export const ToastContext = createContext(() => {})

/** 화면 아래 알림 띄우기: toast('저장했어요') 또는 toast('지웠어요', { actionLabel: '되돌리기', onAction }) */
export function useToast() {
  return useContext(ToastContext)
}
