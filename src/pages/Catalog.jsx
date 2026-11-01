import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

const PAGE_SIZE = 6

/**
 * Catalog page — the main product listing.
 *
 * Data source priority:
 *   1. Live API via useGuns()
 *   2. Local static array (GUNS_LOCAL) when the API is unreachable
 *
 * Features: search, category filter, sort, CRUD actions, detail modal.
 */
export default function Catalog({ onNavigate }) {
  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)

  // ---- API data ----
  const {
    guns: apiGuns,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useGuns(
    {
      limit: PAGE_SIZE,
      category: activeCategory === 'All' ? '' : activeCategory,
      sort_by: sortKey,
      order: sortOrder,
    },
    { paginated: true },
  )
  const [useLocal, setUseLocal] = useState(false)
  const loadMoreRef = useRef(null)

  // Decide data source
  const rawGuns = useMemo(() => {
    if (useLocal || (error && apiGuns.length === 0)) {
      // Enrich local data with synthetic ids so FavoriteButton and detail work
      return GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
    }
    return apiGuns
  }, [apiGuns, error, useLocal])

  const categories = useMemo(
    () => extractCategories([...GUNS_LOCAL, ...rawGuns]),
    [rawGuns],
  )

  const filteredGuns = useMemo(() => {
    let result = rawGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [rawGuns, search, activeCategory, sortKey, sortOrder])

  const pageCount = Math.ceil(filteredGuns.length / PAGE_SIZE)
  const currentPage = Math.min(page, pageCount || 1)
  const paginatedGuns = useMemo(
    () => filteredGuns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredGuns, currentPage],
  )
  const pageNumbers = useMemo(() => {
    const visiblePageCount = Math.min(pageCount, 5)
    const firstPage = Math.max(1, Math.min(currentPage - 2, pageCount - 4))
    return Array.from({ length: visiblePageCount }, (_, index) => firstPage + index)
  }, [currentPage, pageCount])

  const loadNextBatch = useCallback(async () => {
    const loaded = await loadMore()
    if (loaded && pageCount > 0 && currentPage === pageCount) {
      setPage(currentPage + 1)
    }
  }, [loadMore, currentPage, pageCount])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (
      !sentinel ||
      typeof IntersectionObserver === 'undefined' ||
      !hasMore ||
      useLocal ||
      error ||
      loading ||
      loadingMore ||
      (pageCount > 0 && currentPage !== pageCount)
    ) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadNextBatch()
      },
      { rootMargin: '300px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    hasMore,
    useLocal,
    error,
    loading,
    loadingMore,
    pageCount,
    currentPage,
    loadNextBatch,
  ])

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- delete ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')
      await gunService.deleteGun(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => { setSelectedGun(null); setDeleteTarget(g) }}
      />
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {filteredGuns.length} piece{filteredGuns.length !== 1 ? 's' : ''}
              {hasMore && !useLocal ? ' loaded' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={(value) => { setSearch(value); setPage(1) }}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={(category) => { setActiveCategory(category); setPage(1) }}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
            setPage(1)
          }}
        />

        {/* States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          !hasMore || useLocal ? (
            <div className="state-box">
              <PackageOpen size={28} />
              <p>No products match your search.</p>
            </div>
          ) : (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No matches in the products loaded so far. Load more to continue searching.</p>
          </div>
          )
        )}

        {/* Product grid */}
        {filteredGuns.length > 0 && (
          <ul className="stock">
            {paginatedGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={(gun) => {
                  if (onNavigate) onNavigate('Detail', gun)
                  else setSelectedGun(gun)
                }}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}

        {filteredGuns.length > 0 && (
          <nav className="pagination" aria-label="Catalog pagination">
            <span className="pagination__summary">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredGuns.length)} of {filteredGuns.length}
              {hasMore && !useLocal ? ' loaded products' : ' products'}
            </span>
            <div className="pagination__controls">
              <button
                type="button"
                className="pagination__button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Go to previous page"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`pagination__button${currentPage === pageNumber ? ' pagination__button--active' : ''}`}
                  onClick={() => setPage(pageNumber)}
                  aria-label={`Go to page ${pageNumber}`}
                  aria-current={currentPage === pageNumber ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                className="pagination__button"
                onClick={() => {
                  if (currentPage === pageCount && hasMore) loadNextBatch()
                  else setPage(currentPage + 1)
                }}
                disabled={currentPage === pageCount && !hasMore}
                aria-label="Go to next page"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}

        {hasMore && !useLocal && (
          <div className="catalog-load-more">
            <div ref={loadMoreRef} className="catalog-load-more__sentinel" aria-hidden="true" />
            {error && apiGuns.length > 0 && (
              <p className="form-error" role="alert">{error}</p>
            )}
            <button
              type="button"
              className="btn btn--outline"
              onClick={loadNextBatch}
              disabled={loadingMore || loading}
            >
              {loadingMore ? (
                <><Loader size={16} className="spin" /> Loading more products…</>
              ) : error && apiGuns.length > 0 ? (
                <><RefreshCw size={16} /> Retry loading products</>
              ) : (
                'Load more products'
              )}
            </button>
          </div>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
      {deleteError && (
        <div className="toast toast--error">{deleteError}</div>
      )}
    </>
  )
}
