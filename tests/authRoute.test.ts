import { describe, it, expect, beforeEach, vi } from "vitest"

import Poter from "../src/instance"

import type { CToter } from "../src/instance"
import type { PoterGrantedPermission, PoterRoute } from "../src/type"

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

describe("authRoute waitInit & defaultValue", () => {
  const routes: PoterRoute[] = [{ url: "/x", requiredPermissions: [{ resource: "x", actions: ["read"] }] }]

  beforeEach(() => {
    // 重置单例内部状态
    Poter._instance = undefined as unknown as CToter
    Poter._queue = [] as Array<() => Promise<unknown>>
    Poter._flushing = false as boolean
  })

  it("returns defaultValue immediately when not waitInit", () => {
    const r = Poter.authRoute("/x", { waitInit: false, defaultValue: false })
    expect(r).toBe(false) // 未初始化且 defaultValue=false
  })

  it("queues and resolves after init when waitInit=true", async () => {
    const p = Poter.authRoute("/x", { waitInit: true }) as Promise<boolean>
    // 初始化但不给权限 -> 结果应为 false
    Poter.init(routes, {} as PoterGrantedPermission)
    await expect(p).resolves.toBe(false)
  })

  it("resolves true after init with permission", async () => {
    const p = Poter.authRoute("/x", { waitInit: true }) as Promise<boolean>
    const perms: PoterGrantedPermission = { x: ["read"] }
    Poter.init(routes, perms)
    await expect(p).resolves.toBe(true)
  })
})
