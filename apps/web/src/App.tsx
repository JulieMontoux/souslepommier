import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

const LoginPage = lazy(() => import('./pages/login'))
const DashboardPage = lazy(() => import('./pages/dashboard'))
const ProduitsPage = lazy(() => import('./pages/produits'))
const ProduitNewPage = lazy(() => import('./pages/produit-new'))
const ProduitEditPage = lazy(() => import('./pages/produit-edit'))
const VendeurListPage = lazy(() => import('./pages/vendeurs'))
const VendeurDetailPage = lazy(() => import('./pages/vendeur-detail'))
const ClientListPage = lazy(() => import('./pages/clients'))
const ClientDetailPage = lazy(() => import('./pages/client-detail'))
const ClientNewPage = lazy(() => import('./pages/client-new'))
const ClientEditPage = lazy(() => import('./pages/client-edit'))
const VentesPage = lazy(() => import('./pages/ventes'))
const CloturesPage = lazy(() => import('./pages/clotures'))
const ClotureDetailPage = lazy(() => import('./pages/cloture-detail'))
const FacturesPage = lazy(() => import('./pages/factures'))
const FactureDetailPage = lazy(() => import('./pages/facture-detail'))
const FactureNewPage = lazy(() => import('./pages/facture-new'))
const StatistiquesPage = lazy(() => import('./pages/statistiques'))
const ConfigPage = lazy(() => import('./pages/configuration'))
const TvaPage = lazy(() => import('./pages/configuration-tva'))
const AuditPage = lazy(() => import('./pages/audit'))
const RgpdPage = lazy(() => import('./pages/rgpd'))
const PosPage = lazy(() => import('./pages/pos'))
const LegalRgpdPage = lazy(() => import('./pages/legal-rgpd'))

const PageLoader = () => <div className="bg-muted m-6 h-full animate-pulse rounded-xl" />

function AuthGuard() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <PageLoader />
  if (state.status === 'unauthenticated')
    return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

function GerantGuard() {
  const { state } = useAuth()
  if (state.status === 'authenticated' && state.user.role !== 'GERANT') {
    return <Navigate to="/pos" replace />
  }
  return <Outlet />
}

function DashboardLayout() {
  const { state } = useAuth()
  if (state.status !== 'authenticated') return null
  const user = state.user
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { state } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          state.status === 'authenticated' ? (
            <Navigate to={state.user.role === 'GERANT' ? '/dashboard' : '/pos'} replace />
          ) : (
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          )
        }
      />

      <Route
        path="/legal/rgpd"
        element={
          <Suspense fallback={<PageLoader />}>
            <LegalRgpdPage />
          </Suspense>
        }
      />

      <Route element={<AuthGuard />}>
        <Route
          path="/pos"
          element={
            <Suspense fallback={<PageLoader />}>
              <PosPage />
            </Suspense>
          }
        />

        <Route element={<GerantGuard />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/produits" element={<ProduitsPage />} />
            <Route path="/dashboard/produits/nouveau" element={<ProduitNewPage />} />
            <Route path="/dashboard/produits/:id" element={<ProduitEditPage />} />
            <Route path="/dashboard/vendeurs" element={<VendeurListPage />} />
            <Route path="/dashboard/vendeurs/:id" element={<VendeurDetailPage />} />
            <Route path="/dashboard/clients" element={<ClientListPage />} />
            <Route path="/dashboard/clients/nouveau" element={<ClientNewPage />} />
            <Route path="/dashboard/clients/:id" element={<ClientDetailPage />} />
            <Route path="/dashboard/clients/:id/modifier" element={<ClientEditPage />} />
            <Route path="/dashboard/ventes" element={<VentesPage />} />
            <Route path="/dashboard/clotures" element={<CloturesPage />} />
            <Route path="/dashboard/clotures/:id" element={<ClotureDetailPage />} />
            <Route path="/dashboard/factures" element={<FacturesPage />} />
            <Route path="/dashboard/factures/nouvelle" element={<FactureNewPage />} />
            <Route path="/dashboard/factures/:id" element={<FactureDetailPage />} />
            <Route path="/dashboard/statistiques" element={<StatistiquesPage />} />
            <Route path="/dashboard/configuration" element={<ConfigPage />} />
            <Route path="/dashboard/configuration/tva" element={<TvaPage />} />
            <Route path="/dashboard/audit" element={<AuditPage />} />
            <Route path="/dashboard/rgpd" element={<RgpdPage />} />
          </Route>
        </Route>
      </Route>

      <Route
        path="/"
        element={
          state.status === 'loading' ? (
            <PageLoader />
          ) : state.status === 'unauthenticated' ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate to={state.user.role === 'GERANT' ? '/dashboard' : '/pos'} replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
