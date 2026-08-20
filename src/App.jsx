// Root router — declares all public and admin routes; admin subtree is guarded by ProtectedRoute.
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Menu from './pages/Menu'
import Services from './pages/Services'
import About from './pages/About'
import Contact from './pages/Contact'
import Repairs from './pages/Repairs'
import Electronics from './pages/Electronics'
import Tobacco from './pages/Tobacco'
import NotFound from './pages/NotFound'

import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import ItemsManager from './pages/admin/ItemsManager'
import SpecialsManager from './pages/admin/SpecialsManager'
import AnnouncementsManager from './pages/admin/AnnouncementsManager'
import HoursManager from './pages/admin/HoursManager'
import ElectronicsManager from './pages/admin/ElectronicsManager'
import InquiriesManager from './pages/admin/InquiriesManager'
import RepairsManager from './pages/admin/RepairsManager'
import RepairMediaManager from './pages/admin/RepairMediaManager'
import BookingsManager from './pages/admin/BookingsManager'
import AdminSettings from './pages/admin/AdminSettings'
import TobaccoManager from './pages/admin/TobaccoManager'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public site */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/repairs" element={<Repairs />} />
          <Route path="/electronics" element={<Electronics />} />
          <Route path="/tobacco" element={<Tobacco />} />
        </Route>

        {/* Admin login (no auth required) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin panel (protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="items" element={<ItemsManager />} />
          <Route path="specials" element={<SpecialsManager />} />
          <Route path="announcements" element={<AnnouncementsManager />} />
          <Route path="hours" element={<HoursManager />} />
          <Route path="electronics" element={<ElectronicsManager />} />
          <Route path="inquiries" element={<InquiriesManager />} />
          <Route path="repairs" element={<RepairsManager />} />
          <Route path="repair-media" element={<RepairMediaManager />} />
          <Route path="bookings" element={<BookingsManager />} />
          <Route path="tobacco" element={<TobaccoManager />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Catch-all — must be last */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  )
}
