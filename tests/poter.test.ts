import Taro from "@tarojs/taro"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Poter, { CToter } from "../src/instance"

import type { PoterRoute, PoterGrantedPermission } from "../src/type"

vi.mock("@tarojs/taro", () => {
  return {
    default: {
      navigateTo: vi.fn().mockResolvedValue({ ok: true }),
      redirectTo: vi.fn().mockResolvedValue({ ok: true }),
      switchTab: vi.fn().mockResolvedValue({ ok: true }),
      navigateBack: vi.fn().mockResolvedValue({ ok: true }),
    },
  }
})

describe("Toter instance", () => {
  const routes: PoterRoute[] = [
    {
      url: "/a",
      requiredPermissions: [{ resource: "article", actions: ["read"] }],
    },
    {
      url: "/b",
      requiredPermissions: [{ resource: /^sys:.+$/, actions: ["manage"] }],
      oneOfPerm: true,
    },
  ]

  const perms: PoterGrantedPermission = {
    article: ["read"],
    "sys:role": ["manage"],
  }

  let toter: CToter

  beforeEach(() => {
    toter = new CToter(routes, perms)
  })

  it("authentication passes for permitted route", () => {
    expect(toter.authentication("/a")).toBe(true)
  })

  it("authentication fails when lacking permission", () => {
    expect(toter.authentication("/not-exist")).toBe(true) // route not limited
    toter.updateGrantedPermission({})
    expect(toter.authentication("/a")).toBe(false)
  })

  it("navigateTo executes on allowed route", async () => {
    await toter.navigateTo({ url: "/a" } as Taro.navigateTo.Option)
    expect(Taro.navigateTo).toHaveBeenCalled()
  })

  it("navigateTo throws on forbidden route", async () => {
    toter.updateGrantedPermission({})
    await expect(toter.navigateTo({ url: "/a" } as Taro.navigateTo.Option)).rejects.toMatchObject({ code: 401 })
  })
})

describe("Toter manager singleton", () => {
  type Task = () => Promise<unknown>
  const routes: PoterRoute[] = [
    { url: "/c", requiredPermissions: [{ resource: "c", actions: ["go"] }] },
    { url: "/d", requiredPermissions: [{ resource: "product", actions: ["read"] }] },
  ]

  beforeEach(() => {
    // 重置内部状态
    Poter._instance = undefined as unknown as CToter
    Poter._queue = [] as Array<Task>
    Poter._flushing = false as boolean
  })

  it("authentication returns true before init (safe default)", () => {
    expect(Poter.authentication("/c")).toBe(true)
  })

  it("queue calls before init and flush after init", async () => {
    const p = Poter.navigateTo({ url: "/c" })
    const d = Poter.navigateTo({ url: "/d" })
    const f = (): Promise<PoterGrantedPermission> => {
      return new Promise<PoterGrantedPermission>((resolve) => {
        setTimeout(() => {
          resolve({
            c: ["go"],
          })
        }, 1000)
      })
    }
    const perm = await f()
    // 使用 authRoute(waitInit:true) 替代已移除的 authRouteAsync
    const g = Poter.authRoute("/d", { waitInit: true }) as Promise<boolean>
    Poter.init(routes, perm)
    await expect(p).resolves.toMatchObject({ ok: true })
    await expect(d).rejects.toMatchObject({ code: 401 })
    await expect(g).resolves.toBe(false)
  })
})
