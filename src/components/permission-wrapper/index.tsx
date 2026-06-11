import React, { useCallback, useEffect, useState } from "react"

import { EPoterEventKeys, poterEmitter } from "@/events"
import Poter from "@/instance"
import { resolvePoterResult } from "@/utils"

import type { PoterAuthParams } from "@/type"

type PermissionWrapperProps = PoterAuthParams & {
  backup?: React.ReactNode
  loading?: React.ReactNode
}

const PermissionWrapper = (props: React.PropsWithChildren<PermissionWrapperProps>) => {
  const { backup, loading: loadingFallback, requiredPermissions, oneOfPerm } = props
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const ok = await resolvePoterResult(Poter.check({ requiredPermissions, oneOfPerm }, { waitInit: true }))
      setHasPermission(ok)
    } finally {
      setLoading(false)
    }
  }, [requiredPermissions, oneOfPerm])

  useEffect(() => {
    void refresh()
    poterEmitter.on(EPoterEventKeys.Init, refresh)
    poterEmitter.on(EPoterEventKeys.UpdateGrantedPermission, refresh)

    return () => {
      poterEmitter.off(EPoterEventKeys.Init, refresh)
      poterEmitter.off(EPoterEventKeys.UpdateGrantedPermission, refresh)
    }
  }, [refresh])

  if (loading) {
    if (loadingFallback) {
      return <>{convertReactElement(loadingFallback)}</>
    }
    return null
  }
  if (hasPermission) {
    return <>{convertReactElement(props.children)}</>
  }
  if (backup) {
    return <>{convertReactElement(backup)}</>
  }
  return null
}

function convertReactElement(node: React.ReactNode): React.ReactElement {
  if (!React.isValidElement(node)) {
    return <>{node}</>
  }
  return node
}

export default PermissionWrapper
