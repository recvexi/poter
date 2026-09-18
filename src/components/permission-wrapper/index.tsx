import React, { useEffect, useMemo, useReducer } from "react"

import { EPoterEventKeys, poterEmitter } from "@/events"
import Poter from "@/instance"

import type { PoterAuthParams } from "@/type"

type PermissionWrapperProps = PoterAuthParams & {
  backup?: React.ReactNode
  loading?: React.ReactNode
}

const PermissionWrapper = (props: React.PropsWithChildren<PermissionWrapperProps>) => {
  const { backup, loading: loadingFallback, requiredPermissions, oneOfPerm } = props
  const [revision, refresh] = useReducer((value: number) => value + 1, 0)

  // 权限顺序和 action 顺序不影响结果；正则需保留 source/flags，不能直接序列化为 {}。
  const permissionKey = JSON.stringify([
    !!oneOfPerm,
    [
      ...new Set(
        (requiredPermissions ?? []).map(({ resource, actions }) =>
          JSON.stringify([
            typeof resource === "string" ? ["string", resource] : ["regexp", resource.source, resource.flags],
            [...new Set(actions ?? [])].sort(),
          ]),
        ),
      ),
    ].sort(),
  ])
  const initialized = Poter.isInitialized()
  // 已初始化时直接同步鉴权，不经过 loading，避免子内容卸载和滚动区域高度塌陷。
  const hasPermission = useMemo(
    () => initialized && Poter.check({ requiredPermissions, oneOfPerm }),
    [permissionKey, revision, initialized],
  )
  const loading = !initialized

  useEffect(() => {
    poterEmitter.on(EPoterEventKeys.Init, refresh)
    poterEmitter.on(EPoterEventKeys.UpdateGrantedPermission, refresh)
    poterEmitter.on(EPoterEventKeys.Reset, refresh)
    // 补齐首次渲染到订阅建立之间可能发生的权限变化。
    refresh()

    return () => {
      poterEmitter.off(EPoterEventKeys.Init, refresh)
      poterEmitter.off(EPoterEventKeys.UpdateGrantedPermission, refresh)
      poterEmitter.off(EPoterEventKeys.Reset, refresh)
    }
  }, [])

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
