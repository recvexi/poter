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
