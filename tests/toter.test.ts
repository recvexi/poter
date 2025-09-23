import Taro from "@tarojs/taro"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Toter, { CToter } from "../src/instance"

import type { ToterRoute, ToterGrantedPermission } from "../src/type"

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
  const routes: ToterRoute[] = [
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

  const perms: ToterGrantedPermission = {
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
  const routes: ToterRoute[] = [
    { url: "/c", requiredPermissions: [{ resource: "c", actions: ["go"] }] },
    { url: "/d", requiredPermissions: [{ resource: "product", actions: ["read"] }] },
  ]

  beforeEach(() => {
    // 重置内部状态
    Toter._instance = undefined as unknown as CToter
    Toter._queue = [] as Array<Task>
    Toter._flushing = false as boolean
  })

  it("authentication returns true before init (safe default)", () => {
    expect(Toter.authentication("/c")).toBe(true)
  })

  it("queue calls before init and flush after init", async () => {
    const p = Toter.navigateTo({ url: "/c" })
    const d = Toter.navigateTo({ url: "/d" })
    const f = (): Promise<ToterGrantedPermission> => {
      return new Promise<ToterGrantedPermission>((resolve) => {
        setTimeout(() => {
          resolve({
            c: ["go"],
          })
        }, 1000)
      })
    }
    const perm = await f()
    const g = Toter.authenticationAsync("/d")
    Toter.init(routes, perm)
    await expect(p).resolves.toMatchObject({ ok: true })
    await expect(d).rejects.toMatchObject({ code: 401 })
    await expect(g).resolves.toBe(false)
  })
})
