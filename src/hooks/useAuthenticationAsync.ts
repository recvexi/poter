import { useCallback, useEffect, useRef, useState } from "react"

import { toterEmitter } from "../events"
import Toter from "../instance"

export interface UseAuthenticationAsyncOptions {
  immediate?: boolean
  defaultValue?: boolean
  deps?: ReadonlyArray<unknown>
}

export function useAuthenticationAsync(url: string, options?: UseAuthenticationAsyncOptions) {
  const { immediate = true, defaultValue = false, deps = [] } = options || {}

  const [canAccess, setCanAccess] = useState<boolean>(defaultValue)
  const [loading, setLoading] = useState<boolean>(immediate)
  const [error, setError] = useState<unknown>(null)
  const aliveRef = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ok = await Toter.authenticationAsync(url)
      if (aliveRef.current) setCanAccess(ok)
      return ok
    } catch (e) {
      if (aliveRef.current) setError(e)
      throw e
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [url])

  useEffect(() => {
    aliveRef.current = true
    if (immediate) {
      void refresh()
    }

    toterEmitter.on("toter:init", refresh)
    toterEmitter.on("toter:updateUserPermission", refresh)

    return () => {
      aliveRef.current = false

      toterEmitter.off("toter:init", refresh)
      toterEmitter.off("toter:updateUserPermission", refresh)
    }
  }, [url, immediate, ...deps])

  return { canAccess, loading, error, refresh }
}
