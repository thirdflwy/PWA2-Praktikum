import { useState, useEffect, useCallback, useRef } from 'react'
import gunService from '../services/gunService'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API.
//
// Returns { guns, loading, loadingMore, error, pagination, hasMore, loadMore, refetch }.
// When the API is unreachable the `error` string will be set and `guns`
// will remain an empty array so the UI can show a proper error state.
// ---------------------------------------------------------------------------

export function useGuns(params = {}, { paginated = false } = {}) {
  const [guns, setGuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const hasMoreRef = useRef(true)
  const seenIds = useRef(new Set())
  const requestInProgress = useRef(false)

  // Serialise params so the effect re-runs when they change.
  const paramKey = JSON.stringify(params)

  const fetchGuns = useCallback(async (reset = true) => {
    if (requestInProgress.current || (!reset && !hasMoreRef.current)) return false

    requestInProgress.current = true
    const nextPage = reset ? 1 : pageRef.current + 1
    if (reset) {
      pageRef.current = 0
      setLoading(true)
      setError(null)
      hasMoreRef.current = true
      setHasMore(true)
      seenIds.current = new Set()
    } else {
      setLoadingMore(true)
      setError(null)
    }

    try {
      const requestParams = paginated
        ? { ...params, page: nextPage }
        : params
      const response = await gunService.getGuns(requestParams)
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch products.')
      }

      const batch = Array.isArray(response.data) ? response.data : []
      const uniqueBatch = batch.filter((gun) => {
        const id = gun.id || gun.name
        if (seenIds.current.has(id)) return false
        seenIds.current.add(id)
        return true
      })
      setGuns((current) =>
        reset || !paginated ? uniqueBatch : [...current, ...uniqueBatch],
      )
      setPagination(response.pagination || null)
      pageRef.current = nextPage
      hasMoreRef.current =
        paginated && batch.length >= (params.limit || 50) && uniqueBatch.length > 0
      setHasMore(hasMoreRef.current)
      return true
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products.')
      if (reset) {
        setGuns([])
        setPagination(null)
      }
      return false
    } finally {
      requestInProgress.current = false
      setLoading(false)
      setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey, paginated])

  useEffect(() => {
    fetchGuns(true)
  }, [fetchGuns])

  const loadMore = useCallback(() => fetchGuns(false), [fetchGuns])
  const refetch = useCallback(() => fetchGuns(true), [fetchGuns])
  return { guns, loading, loadingMore, error, pagination, hasMore, loadMore, refetch }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID.
//
// Returns { gun, loading, error, refetch }.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const [gun, setGun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGun = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      const response = await gunService.getGunById(id)

      if (response.success) {
        setGun(response.data)
      } else {
        setError(response.message || 'Product not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load product details.')
      setGun(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: fetchGun }
}
