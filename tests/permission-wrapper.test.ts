import React, { useEffect, useState } from "react"
import { act, create } from "react-test-renderer"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import PermissionWrapper from "../src/components/permission-wrapper"
import { poterEmitter } from "../src/events"
import Poter from "../src/instance"

import type { PoterAuthParams } from "../src/type"
import type { ReactTestRenderer } from "react-test-renderer"

vi.mock("@tarojs/taro", () => ({ default: {} }))

let renderer: ReactTestRenderer | undefined
const params = (): PoterAuthParams => ({ requiredPermissions: [{ resource: "product", actions: ["read"] }] })
const wrapper = (permissions = params(), child: React.ReactNode = "allowed") =>
  React.createElement(PermissionWrapper, { ...permissions, loading: "loading", backup: "denied" }, child)

beforeEach(() => {
  Poter.reset()
})
afterEach(() => {
  act(() => renderer?.unmount())
  renderer = undefined
  vi.restoreAllMocks()
  Poter.reset()
})

describe("PermissionWrapper", () => {
  it("keeps child state mounted for equivalent inline permissions and authorization updates", async () => {
    Poter.init([], { product: ["read", "write"] })
    const unmount = vi.fn()
    function Child() {
      const [count, setCount] = useState(0)
      useEffect(() => unmount, [])
      return React.createElement("button", { onClick: () => setCount(count + 1) }, count)
    }
    await act(async () => {
      renderer = create(wrapper(params(), React.createElement(Child)))
    })
    act(() => renderer!.root.findByType("button").props.onClick())
    const check = vi.spyOn(Poter, "check")
    await act(async () => {
      renderer!.update(wrapper(params(), React.createElement(Child)))
    })
    expect(check).not.toHaveBeenCalled()
    await act(async () => {
      Poter.updateGrantedPermission({ product: ["read"] })
    })
    expect(renderer!.root.findByType("button").children).toEqual(["1"])
    expect(unmount).not.toHaveBeenCalled()
  })

  it("treats permission/action ordering and duplicates as equivalent", () => {
    Poter.init([], { product: ["read", "write"], order: ["read"] })
    act(() => {
      renderer = create(
        wrapper({
          requiredPermissions: [
            { resource: "product", actions: ["write", "read"] },
            { resource: "order", actions: ["read"] },
          ],
        }),
      )
    })
    const check = vi.spyOn(Poter, "check")
    act(() => {
      renderer!.update(
        wrapper({
          oneOfPerm: false,
          requiredPermissions: [
            { resource: "order", actions: ["read"] },
            { resource: "product", actions: ["read", "write", "read"] },
            { resource: "order", actions: ["read"] },
          ],
        }),
      )
    })
    expect(check).not.toHaveBeenCalled()
    expect(renderer!.toJSON()).toBe("allowed")
  })

  it("waits for initialization without queuing async checks and handles reset/reinitialization", () => {
    act(() => {
      renderer = create(wrapper())
    })
    expect(renderer!.toJSON()).toBe("loading")
    expect(Poter._queue).toHaveLength(0)
    act(() => {
      Poter.init([], { product: ["read"] })
    })
    expect(renderer!.toJSON()).toBe("allowed")
    act(() => {
      Poter.reset()
    })
    expect(renderer!.toJSON()).toBe("loading")
    act(() => {
      Poter.init([], {})
    })
    expect(renderer!.toJSON()).toBe("denied")
  })

  it("responds to changed actions, oneOfPerm, and permission revocation", () => {
    Poter.init([], { product: ["read"] })
    act(() => {
      renderer = create(wrapper())
    })
    act(() => {
      renderer!.update(wrapper({ requiredPermissions: [{ resource: "product", actions: ["write"] }] }))
    })
    expect(renderer!.toJSON()).toBe("denied")
    const permissions = [...params().requiredPermissions!, { resource: "order", actions: ["read"] }]
    act(() => {
      renderer!.update(wrapper({ requiredPermissions: permissions }))
    })
    expect(renderer!.toJSON()).toBe("denied")
    act(() => {
      renderer!.update(wrapper({ requiredPermissions: permissions, oneOfPerm: true }))
    })
    expect(renderer!.toJSON()).toBe("allowed")
    act(() => {
      Poter.updateGrantedPermission({})
    })
    expect(renderer!.toJSON()).toBe("denied")
  })

  it("compares regex source and flags while distinguishing string resources", () => {
    Poter.init([], { PRODUCT: ["read"] })
    const regexWrapper = (resource: string | RegExp) =>
      wrapper({ requiredPermissions: [{ resource, actions: ["read"] }] })
    act(() => {
      renderer = create(regexWrapper(/product/i))
    })
    expect(renderer!.toJSON()).toBe("allowed")
    const check = vi.spyOn(Poter, "check")
    act(() => {
      renderer!.update(regexWrapper(new RegExp("product", "i")))
    })
    expect(check).not.toHaveBeenCalled()
    act(() => {
      renderer!.update(regexWrapper(/product/))
    })
    expect(renderer!.toJSON()).toBe("denied")
    act(() => {
      renderer!.update(regexWrapper(/order/i))
    })
    expect(renderer!.toJSON()).toBe("denied")
    act(() => {
      renderer!.update(regexWrapper("PRODUCT"))
    })
    expect(renderer!.toJSON()).toBe("allowed")
  })

  it("removes event subscriptions when unmounted", () => {
    act(() => {
      renderer = create(wrapper())
    })
    act(() => {
      renderer!.unmount()
    })
    renderer = undefined
    for (const handlers of poterEmitter.all.values()) expect(handlers).toHaveLength(0)
    expect(Poter._queue).toHaveLength(0)
  })
})
