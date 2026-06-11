export class PoterAuthError extends Error {
  readonly code: number

  constructor(message = "权限验证失败", code = 401) {
    super(message)
    this.name = "PoterAuthError"
    this.code = code
  }
}
