import { useCallback, useEffect, useRef, useState } from "react"

import { poterEmitter, EPoterEventKeys } from "../events"
import Poter from "../instance"
import { resolvePoterResult } from "../utils"

export interface UseRoutePermissionOptions {
  /** 组件挂载后是否立即发起一次异步鉴权 */
  immediate?: boolean
  /** 初始 canAccess 值 */
  defaultValue?: boolean
}

/**
 * useRoutePermission
 * @description 针对路由 url 的权限异步鉴权 Hook
 * @param url 需要判断的路由路径
 * @param options 控制立即执行、默认值、额外依赖
 * @param deps 额外依赖：变化时重新鉴权
 */
export function useRoutePermission(
  url: string,
  options?: UseRoutePermissionOptions,
  deps: ReadonlyArray<unknown> = [],
) {
  const { immediate = true, defaultValue = false } = options || {}
  const [canAccess, setCanAccess] = useState<boolean>(defaultValue)
  const [loading, setLoading] = useState<boolean>(immediate)
  const [error, setError] = useState<unknown>(null)
  const aliveRef = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ok = await resolvePoterResult(Poter.authRoute(url, { waitInit: true }))
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

    poterEmitter.on(EPoterEventKeys.Init, refresh)
    poterEmitter.on(EPoterEventKeys.UpdateGrantedPermission, refresh)

    return () => {
      aliveRef.current = false
      poterEmitter.off(EPoterEventKeys.Init, refresh)
      poterEmitter.off(EPoterEventKeys.UpdateGrantedPermission, refresh)
    }
  }, [url, immediate, ...deps])

  return { canAccess, loading, error, refresh }
}

export default useRoutePermission
