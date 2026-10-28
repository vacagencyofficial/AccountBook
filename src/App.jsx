import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ShopsPage from './pages/ShopsPage'
import ShopDetailPage from './pages/ShopDetailPage'
import ShopNewPage from './pages/ShopNewPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import CapturePage from './pages/CapturePage'
import JoinPage from './pages/JoinPage'
import ItemDetailPage from './pages/ItemDetailPage'

export default function App() {
  return (
    <Routes>
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/capture" element={<CapturePage />} />
      <Route path="/shops/new" element={<ShopNewPage />} />
      <Route path="/shops/:shopId" element={<ShopDetailPage />} />
      <Route path="/items/:itemId" element={<ItemDetailPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shops" element={<ShopsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
