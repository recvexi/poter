import React, { useEffect, useState } from "react"

import { EPoterEventKeys, poterEmitter } from "@/events"
import Poter from "@/index"

import type { PoterAuthParams } from "@/type"

type PermissionWrapperProps = PoterAuthParams & {
  backup?: React.ReactNode
}

const PermissionWrapper = (props: React.PropsWithChildren<PermissionWrapperProps>) => {
  const { backup, requiredPermissions, oneOfPerm } = props
  const [hasPermission, setHasPermission] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const fetchPermissions = () => {
    const p = Poter._instance?.getPermissions()
    setPermissions(p || {})
  }
  useEffect(() => {
    poterEmitter.on(EPoterEventKeys.Init, fetchPermissions)
    poterEmitter.on(EPoterEventKeys.UpdateGrantedPermission, fetchPermissions)
  }, [])

  useEffect(() => {
    const has = Poter.check({ requiredPermissions, oneOfPerm })
    setHasPermission(has)
  }, [requiredPermissions, oneOfPerm, permissions])

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
