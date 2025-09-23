import Taro from "@tarojs/taro"

import type { ToterAuth, ToterAuthParams, ToterRoute, ToterGrantedPermission } from "./type"

/**
 * @summary 权限控制类（实例化版本）
 * @description  通过构造函数注入 routes 与 grantedPermissions;
 */
export class CToter {
  private routes: ToterRoute[]
  private grantedPermissions: ToterGrantedPermission

  constructor(routes: ToterRoute[], userPermissions: ToterGrantedPermission) {
    this.routes = routes || []
    this.grantedPermissions = userPermissions || {}
  }

  updateGrantedPermission = (userPermissions: ToterGrantedPermission) => {
    this.grantedPermissions = userPermissions || {}
  }

  private judge = (actions: string[], perm: string[]) => {
    if (!perm || !perm.length) {
      return false
    }
    if (perm.join("") === "*") {
      return true
    }
    return actions.every((action) => perm.includes(action))
  }

  private auth = (params: ToterAuth) => {
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

  check = (params: ToterAuthParams) => {
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

  authentication(url: string) {
    const route = this.routes.find((item) => item.url === url)
    if (!route) return true
    return this.check({
      requiredPermissions: route.requiredPermissions,
      oneOfPerm: route.oneOfPerm,
    })
  }

  navigateTo = async (options: Taro.navigateTo.Option) => {
    const canAccess = this.authentication(options.url)
    if (canAccess) {
      return Taro.navigateTo(options)
    }
    throw { code: 401, message: "权限验证失败" }
  }

  redirectTo = async (options: Taro.redirectTo.Option) => {
    const canAccess = this.authentication(options.url)
    if (canAccess) {
      return Taro.redirectTo(options)
    }
    throw { code: 401, message: "权限验证失败" }
  }

  switchTab = async (options: Taro.switchTab.Option) => {
    const canAccess = this.authentication(options.url)
    if (canAccess) {
      return Taro.switchTab(options)
    }
    throw { code: 401, message: "权限验证失败" }
  }

  navigateBack = async (options?: Taro.navigateBack.Option) => {
    return Taro.navigateBack({
      fail: () => {
        Taro.switchTab({
          url: "/pages/index/index",
        })
      },
      ...options,
    })
  }
}

/**
 * 单例管理器
 * - 通过 init(routes, permissions) 构造内部实例
 * - 其他方法代理到实例；未初始化时采取安全兜底
 */
const Toter = {
  _instance: undefined as CToter | undefined,
  // 初始化标记与任务队列
  _queue: [] as Array<() => Promise<any>>, // 任务为返回 Promise 的函数
  _flushing: false,

  init(routes: ToterRoute[], userPermissions: ToterGrantedPermission) {
    this._instance = new CToter(routes, userPermissions)
    // 初始化完成后尝试刷新队列
    void this._flush()
  },

  updateUserPermission(userPermissions: ToterGrantedPermission) {
    if (this._instance) {
      this._instance.updateGrantedPermission(userPermissions)
    } else {
      // 若未初始化，入队延后应用
      this._enqueue(async () => {
        this._instance!.updateGrantedPermission(userPermissions)
      })
    }
  },

  /**
   * @summary 鉴权：未初始化时返回 true，避免误伤渲染；
   * @param url - 目标路径
   */
  authentication(url: string): boolean {
    return this._instance ? this._instance.authentication(url) : true
  },

  /**
   * @summary 异步鉴权：未初始化时入队，初始化后返回鉴权结果
   */
  authenticationAsync(url: string): Promise<boolean> {
    if (this._instance) {
      return Promise.resolve(this._instance.authentication(url))
    }
    return this._enqueue(async () => this._instance!.authentication(url))
  },

  check(params: ToterAuthParams) {
    return this._instance ? this._instance.check(params) : true
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
    // 返回行为不依赖权限，仍然即时执行，避免卡住用户
    return this._instance ? this._instance.navigateBack(options) : Taro.navigateBack(options)
  },

  /** 将任务放入队列，返回一个在初始化后执行并可成功/失败结算的 Promise */
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
      // 若已初始化但仍未触发 flush（竞态），尝试触发
      if (this._instance) {
        void this._flush()
      }
    })
  },

  /** 刷新队列：保证串行执行；flush 过程中入队的新任务会在本轮继续处理，直到队列为空 */
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

export default Toter
