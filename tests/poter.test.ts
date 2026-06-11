import Taro from "@tarojs/taro"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PoterAuthError } from "../src/error"
import Poter, { CPoter } from "../src/instance"

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

describe("CPoter instance", () => {
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
    {
      url: "/pages/detail/index",
      requiredPermissions: [{ resource: "detail", actions: ["read"] }],
    },
  ]

  const perms: PoterGrantedPermission = {
    article: ["read"],
    "sys:role": ["manage"],
    detail: ["read"],
  }

  let poter: CPoter

  beforeEach(() => {
    poter = new CPoter(routes, perms)
  })

  it("authenticationPath passes for permitted route", () => {
    expect(poter.authenticationPath("/a")).toBe(true)
  })

  it("authenticationPath matches url without query string", () => {
    expect(poter.authenticationPath("/pages/detail/index?id=1")).toBe(true)
  })

  it("authenticationPath fails when lacking permission", () => {
    expect(poter.authenticationPath("/not-exist")).toBe(true)
    poter.updateGrantedPermission({})
    expect(poter.authenticationPath("/a")).toBe(false)
  })

  it("wildcard permission via includes(*)", () => {
    poter.updateGrantedPermission({ article: ["*", "read"] })
    expect(poter.check({ requiredPermissions: [{ resource: "article", actions: ["write"] }] })).toBe(true)
  })

  it("navigateTo executes on allowed route", async () => {
    await poter.navigateTo({ url: "/a" } as Taro.navigateTo.Option)
    expect(Taro.navigateTo).toHaveBeenCalled()
  })

  it("navigateTo throws PoterAuthError on forbidden route", async () => {
    poter.updateGrantedPermission({})
    await expect(poter.navigateTo({ url: "/a" } as Taro.navigateTo.Option)).rejects.toBeInstanceOf(PoterAuthError)
  })

  it("navigateBack uses configured fallback on fail", async () => {
    const instance = new CPoter([], {}, { navigateBackFallback: "/pages/home/index" })
    vi.mocked(Taro.navigateBack).mockImplementationOnce((opts) => {
      opts?.fail?.({ errMsg: "fail" })
      return Promise.resolve({ ok: true })
    })
    await instance.navigateBack()
    expect(Taro.switchTab).toHaveBeenCalledWith({ url: "/pages/home/index" })
  })
})

describe("Poter manager singleton", () => {
  const routes: PoterRoute[] = [
    { url: "/c", requiredPermissions: [{ resource: "c", actions: ["go"] }] },
    { url: "/d", requiredPermissions: [{ resource: "product", actions: ["read"] }] },
  ]

  beforeEach(() => {
    Poter.reset()
  })

  it("authenticationPath returns false before init", () => {
    expect(Poter.authenticationPath("/c")).toBe(false)
  })

  it("check returns false before init by default", () => {
    expect(
      Poter.check({
        requiredPermissions: [{ resource: "c", actions: ["go"] }],
      }),
    ).toBe(false)
  })

  it("reset clears instance and queue", () => {
    Poter.init(routes, { c: ["go"] })
    expect(Poter.authenticationPath("/c")).toBe(true)
    Poter.reset()
    expect(Poter.authenticationPath("/c")).toBe(false)
  })

  it("queue calls before init and flush after init", async () => {
    const p = Poter.navigateTo({ url: "/c" })
    const d = Poter.navigateTo({ url: "/d" })
    const g = Poter.authRoute("/d", { waitInit: true }) as Promise<boolean>
    Poter.init(routes, { c: ["go"] })
    await expect(p).resolves.toMatchObject({ ok: true })
    await expect(d).rejects.toBeInstanceOf(PoterAuthError)
    await expect(g).resolves.toBe(false)
  })
})
