import React, { useEffect, useState } from "react"

import { toterEmitter } from "../../events"
import Toter from "../../index"

import type { ToterAuthParams } from "../../type"

type PermissionWrapperProps = ToterAuthParams & {
  backup?: React.ReactNode
}

const PermissionWrapper = (props: React.PropsWithChildren<PermissionWrapperProps>) => {
  const { backup, requiredPermissions, oneOfPerm } = props
  const [hasPermission, setHasPermission] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const fetchPermissions = () => {
    const p = Toter._instance?.getPermissions()
    setPermissions(p || {})
  }
  useEffect(() => {
    toterEmitter.on("toter:init", fetchPermissions)
    toterEmitter.on("toter:updateUserPermission", fetchPermissions)
  }, [])

  useEffect(() => {
    const has = Toter.check({ requiredPermissions, oneOfPerm })
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
