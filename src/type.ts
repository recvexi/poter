export type PoterGrantedPermission = Record<string, string[]>

export type PoterAuth = {
  resource: string | RegExp
  actions?: string[]
}

export interface PoterAuthParams {
  requiredPermissions?: Array<PoterAuth>
  oneOfPerm?: boolean
}

export type PoterRoute = {
  url: string
  requiredPermissions?: Array<PoterAuth>
  oneOfPerm?: boolean
}

export type PoterOptions = {
  /** 权限总开关，默认开启；仅显式 false 时放行路由及资源权限检查 */
  enable?: boolean
  /** navigateBack 失败时跳转的 tab 页路径；未配置则不自动跳转 */
  navigateBackFallback?: string
}

export type PoterAsyncOptions = {
  /** 未初始化时是否入队等待 init 完成后再鉴权 */
  waitInit?: boolean
  /** waitInit=false 且未初始化时的返回值，默认 false */
  defaultValue?: boolean
}
