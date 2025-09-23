export type ToterGrantedPermission = Record<string, string[]>

export type ToterAuth = {
  resource: string | RegExp
  actions?: string[]
}

export interface ToterAuthParams {
  requiredPermissions?: Array<ToterAuth>
  oneOfPerm?: boolean
}

export type ToterRoute = {
  url: string
  requiredPermissions?: Array<ToterAuth>
  oneOfPerm?: boolean
}
