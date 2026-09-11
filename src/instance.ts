import Taro from "@tarojs/taro"

import { PoterAuthError } from "@/error"
import { emitPoterInit, emitPoterUpdate } from "@/events"
import { normalizePath } from "@/utils"

import type {
  PoterAuth,
  PoterAuthParams,
  PoterAsyncOptions,
  PoterOptions,
  PoterRoute,
  PoterGrantedPermission,
} from "@/type"

/**
 * @summary 权限控制类（实例化版本）
 * @description 通过构造函数注入 routes 与 grantedPermissions
 */
export class CPoter {
  private routes: PoterRoute[]
  private grantedPermissions: PoterGrantedPermission
  private options: PoterOptions

  constructor(routes: PoterRoute[], grantedPermissions: PoterGrantedPermission, options: PoterOptions = {}) {
    this.routes = routes || []
    this.grantedPermissions = grantedPermissions || {}
    this.options = options
  }

  getPermissions() {
    return this.grantedPermissions
  }

  updateGrantedPermission = (grantedPermissions: PoterGrantedPermission) => {
    this.grantedPermissions = grantedPermissions || {}
  }

  private judge = (actions: string[], perm: string[]) => {
    if (!perm || !perm.length) {
      return false
    }
    if (perm.includes("*")) {
      return true
    }
    return actions.every((action) => perm.includes(action))
  }

  private auth = (params: PoterAuth) => {
    const userPermission = this.grantedPermissions
    const { resource, actions = [] } = params
    if (resource instanceof RegExp) {
      const permKeys = Object.keys(userPermission)
      const matchPermissions = permKeys.filter((item) => item.match(resource))
      if (!matchPermissions.length) {
        return false
      }
      return matchPermissions.every((key) => {
        const perm = userPermission[key]
        return this.judge(actions, perm)
      })
    }

    const perm = userPermission[resource]
    return this.judge(actions, perm)
  }

  check = (params: PoterAuthParams) => {
    // 在统一鉴权入口放行，使路由、组件和直接检查遵循同一开关。
    if (this.options.enable === false) return true

    const { requiredPermissions, oneOfPerm } = params
    if (Array.isArray(requiredPermissions) && requiredPermissions.length) {
      let count = 0
      for (const rp of requiredPermissions) {
        if (this.auth(rp)) {
          count++
        }
      }
      return oneOfPerm ? count > 0 : count === requiredPermissions.length
    }
    return true
  }

  authenticationPath(url: string) {
    const normalized = normalizePath(url)
    const route = this.routes.find((item) => normalizePath(item.url) === normalized)
    if (!route) return true
    return this.check({
      requiredPermissions: route.requiredPermissions,
      oneOfPerm: route.oneOfPerm,
    })
  }

  navigateTo = async (options: Taro.navigateTo.Option) => {
    const canAccess = this.authenticationPath(options.url)
    if (canAccess) {
      return Taro.navigateTo(options)
    }
    throw new PoterAuthError()
  }

  redirectTo = async (options: Taro.redirectTo.Option) => {
    const canAccess = this.authenticationPath(options.url)
    if (canAccess) {
      return Taro.redirectTo(options)
    }
    throw new PoterAuthError()
  }

  switchTab = async (options: Taro.switchTab.Option) => {
    const canAccess = this.authenticationPath(options.url)
    if (canAccess) {
      return Taro.switchTab(options)
    }
    throw new PoterAuthError()
  }

  navigateBack = async (options?: Taro.navigateBack.Option) => {
    const { fail, ...rest } = options || {}
    const fallback = this.options.navigateBackFallback
    return Taro.navigateBack({
      ...rest,
      fail: (res) => {
        if (fallback) {
          void Taro.switchTab({ url: fallback })
        }
        fail?.(res)
      },
    })
  }
}

/**
 * 单例管理器
 * - 通过 init(routes, permissions) 构造内部实例
 * - 其他方法代理到实例；未初始化时采取安全兜底
 */
const Poter = {
  _instance: undefined as CPoter | undefined,
  _options: {} as PoterOptions,
  _queue: [] as Array<() => Promise<unknown>>,
  _flushing: false,

  init(routes: PoterRoute[], grantedPermissions: PoterGrantedPermission, options?: PoterOptions) {
    this._options = options || {}
    this._instance = new CPoter(routes, grantedPermissions, this._options)
    void this._flush()
    emitPoterInit()
  },

  reset() {
    this._instance = undefined
    this._options = {}
    this._queue = []
    this._flushing = false
  },

  authenticationPath(url: string): boolean {
    return this._instance ? this._instance.authenticationPath(url) : false
  },

  updateGrantedPermission(grantedPermissions: PoterGrantedPermission) {
    if (this._instance) {
      this._instance.updateGrantedPermission(grantedPermissions)
      emitPoterUpdate()
      return
    }
    this._enqueue(async () => {
      this._instance!.updateGrantedPermission(grantedPermissions)
      emitPoterUpdate()
    })
  },

  authRoute(url: string, options?: PoterAsyncOptions): boolean | Promise<boolean> {
    const { waitInit = false, defaultValue = false } = options || {}
    if (waitInit) {
      if (this._instance) {
        return Promise.resolve(this._instance.authenticationPath(url))
      }
      return this._enqueue(async () => this._instance!.authenticationPath(url))
    }
    return this._instance ? this._instance.authenticationPath(url) : defaultValue
  },

  check(params: PoterAuthParams, options?: PoterAsyncOptions): boolean | Promise<boolean> {
    const { waitInit = false, defaultValue = false } = options || {}
    if (waitInit) {
      if (this._instance) {
        return Promise.resolve(this._instance.check(params))
      }
      return this._enqueue(async () => this._instance!.check(params))
    }
    return this._instance ? this._instance.check(params) : defaultValue
  },

  navigateTo(options: Taro.navigateTo.Option) {
    if (this._instance) return this._instance.navigateTo(options)
    return this._enqueue(() => this._instance!.navigateTo(options))
  },
  redirectTo(options: Taro.redirectTo.Option) {
    if (this._instance) return this._instance.redirectTo(options)
    return this._enqueue(() => this._instance!.redirectTo(options))
  },
  switchTab(options: Taro.switchTab.Option) {
    if (this._instance) return this._instance.switchTab(options)
    return this._enqueue(() => this._instance!.switchTab(options))
  },
  navigateBack(options?: Taro.navigateBack.Option) {
    return this._instance ? this._instance.navigateBack(options) : Taro.navigateBack(options)
  },

  _enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrapped = async () => {
        try {
          const res = await task()
          resolve(res)
        } catch (e) {
          reject(e)
        }
      }
      this._queue.push(wrapped)
      if (this._instance) {
        void this._flush()
      }
    })
  },

  async _flush() {
    if (this._flushing) return
    if (!this._instance) return

    this._flushing = true
    try {
      while (this._queue.length > 0) {
        const task = this._queue.shift()
        if (task) {
          await task()
        }
      }
    } finally {
      this._flushing = false
    }
  },
}

export default Poter
