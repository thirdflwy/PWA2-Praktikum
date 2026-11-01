import { useEffect, useState } from 'react'
import { AlertCircle, Loader } from 'lucide-react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Catalog from './pages/Catalog.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import CreateGunPage from './pages/CreateGunPage.jsx'
import EditGunPage from './pages/EditGunPage.jsx'
import GunDetail from './components/gun/GunDetail.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import { useGunById } from './hooks/useGuns.js'
import GUNS_LOCAL from './data/guns.js'
import './App.css'

const getProductIdFromPath = () => {
  const match = window.location.pathname.match(/^\/catalog\/([^/]+)\/?$/)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

const LOCAL_GUNS_WITH_IDS = GUNS_LOCAL.map((gun, index) => ({
  ...gun,
  id: gun.id || `local-${index}`,
}))

function App() {
  const [sharedGunId, setSharedGunId] = useState(getProductIdFromPath)
  const localSharedGun = LOCAL_GUNS_WITH_IDS.find((gun) => gun.id === sharedGunId)
  const {
    gun: sharedApiGun,
    loading: sharedGunLoading,
    error: sharedGunError,
  } = useGunById(localSharedGun ? null : sharedGunId)
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState(() => sharedGunId ? 'detail' : 'list') // 'list' | 'create' | 'edit' | 'detail'
  const [selectedGun, setSelectedGun] = useState(() => localSharedGun || null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const activeSelectedGun = sharedGunId
    ? localSharedGun || sharedApiGun || selectedGun
    : selectedGun
  const clearSharedLink = () => {
    if (getProductIdFromPath()) {
      window.history.pushState({}, '', '/')
    }
    setSharedGunId(null)
  }

  useEffect(() => {
    const handlePopState = () => {
      const productId = getProductIdFromPath()
      setSharedGunId(productId)
      setSelectedGun(
        productId
          ? LOCAL_GUNS_WITH_IDS.find((gun) => gun.id === productId) || null
          : null,
      )
      setMode(productId ? 'detail' : 'list')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Detail' && payload?.id) {
      const productPath = `/catalog/${encodeURIComponent(payload.id)}`
      if (window.location.pathname !== productPath) {
        window.history.pushState({}, '', productPath)
      }
      setSharedGunId(String(payload.id))
    } else if (target !== 'Detail' || !payload?.id) {
      clearSharedLink()
    }

    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    clearSharedLink()
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        {/* Sub-page views */}
        {mode === 'create' && (
          <CreateGunPage
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'edit' && (
          <EditGunPage
            gun={editingGun}
            gunId={editingGun?.id}
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'detail' && activeSelectedGun && (
          <GunDetail
            gun={activeSelectedGun}
            onBack={handleBackToList}
            onEdit={(g) => handleNavigate('Edit', g)}
            onDelete={(g) => setDeleteTarget(g)}
          />
        )}

        {mode === 'detail' && !activeSelectedGun && (
          <div className={`state-box${sharedGunError ? ' state-box--error' : ''}`}>
            {sharedGunLoading ? <Loader size={28} className="spin" /> : <AlertCircle size={28} />}
            <p>{sharedGunLoading ? 'Loading shared product…' : sharedGunError || 'Product not found.'}</p>
            <button type="button" className="btn btn--outline" onClick={handleBackToList}>
              Back to Catalog
            </button>
          </div>
        )}

        {/* Top-level Tabs */}
        {mode === 'list' && (
          <>
            {tab === 'Catalog' && (
              <Catalog
                onNavigate={(destination, payload) => handleNavigate(destination, payload)}
              />
            )}
            {tab === 'Favorites' && (
              <FavoritesPage
                onSelectGun={(g) => handleNavigate('Detail', g)}
                onNavigateCatalog={() => setTab('Catalog')}
              />
            )}
            {tab === 'Profile' && (
              <ProfilePage onReplaySplash={() => setShowSplash(true)} />
            )}
            {tab === 'About' && <About />}
            {tab === 'Contact' && <Contact />}
          </>
        )}
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Hardware Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.deleteGun(deleteTarget.id)
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
