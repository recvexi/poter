# Poter · 基于资源-动作的权限控制与路由守卫

> 版本变更请查看 [CHANGELOG](./CHANGELOG.md)

一个面向 Taro + React 的轻量权限库，提供：

- 资源-动作权限模型（Record<string, string[]>），支持通配符“\*”与正则资源匹配
- 路由守卫与导航代理（navigateTo/redirectTo/switchTab），自动拦截无权限访问
- 初始化前 API 调用排队，避免“白屏/误伤渲染”与竞态问题
- React 生态集成：PermissionWrapper 组件与 useRoutePermission Hook
- 简单类型与事件机制，权限更新后自动刷新视图

## 安装

本库依赖以下 peerDependencies：

- @tarojs/taro >= 3
- react >= 17

使用你熟悉的包管理器安装：

```bash
# pnpm
pnpm add poter

# npm
npm i poter

# yarn
yarn add poter
```

导入：

```ts
import Poter, { PermissionWrapper, useRoutePermission, type PoterRoute, type PoterGrantedPermission } from "poter"
```

## 快速开始

### 1) 定义路由与用户权限并初始化

```ts
import Poter, { type PoterRoute, type PoterGrantedPermission } from "poter"

// 路由权限需求（可选 oneOfPerm：任一满足即通过；默认需要全部满足）
const routes: PoterRoute[] = [
  { url: "/pages/article/index", requiredPermissions: [{ resource: "article", actions: ["read"] }] },
  { url: "/pages/sys/index", requiredPermissions: [{ resource: /^sys:.+$/, actions: ["manage"] }], oneOfPerm: true },
]

// 当前用户已授予权限：资源 -> 动作
// 支持通配符：例如 ["*"] 代表该资源下的所有动作
const userPermissions: PoterGrantedPermission = {
  article: ["read"],
  "sys:role": ["manage"],
}

Poter.init(routes, userPermissions)
```

### 2) 在代码里做权限判断

```ts
// 根据 url 判断是否可访问（若路由未配置权限，默认放行）
const canVisit = Poter.authentication("/pages/article/index")

// 自定义校验：传入所需权限数组
const allowed = Poter.check({
  requiredPermissions: [
    { resource: "article", actions: ["read"] },
    { resource: /^sys:.+$/, actions: ["manage"] },
  ],
  oneOfPerm: true, // 任一满足即通过
})
```

### 3) 使用导航代理（自动鉴权）

```ts
try {
  await Poter.navigateTo({ url: "/pages/article/index" })
} catch (e) {
  // 无权限时抛出 { code: 401, message: "权限验证失败" }
}

// redirectTo / switchTab 同理；navigateBack 不做权限限制并立即执行
```

### 4) React 集成：Hook 与组件

```tsx
import { useRoutePermission, PermissionWrapper } from "poter"

// 路由权限鉴权 Hook（返回 canAccess/loading/error/refresh）
const { canAccess, loading, error, refresh } = useRoutePermission("/pages/article/index")

// 组件：基于权限包裹 UI
<PermissionWrapper
 requiredPermissions={[{ resource: "article", actions: ["read"] }]}
 backup={<span>无权限</span>}
>
 <YourComponent />
</PermissionWrapper>
```

## 权限模型说明

- PoterGrantedPermission：Record<资源, 动作[]>，例如：

  ```ts
  const perms = {
    article: ["read", "write"],
    "sys:role": ["manage"],
    product: ["*"], // 通配符：任意动作均可
  }
  ```

- PoterAuth.resource 支持 string 或 RegExp：
  - string：直接从用户权限中读取该 key
  - RegExp：对所有 key 做匹配，必须全部匹配项都满足 actions 要求

- actions 判断规则：
  - 若对应资源的权限数组 join("") === "_"（如 ["_"]），视为对该资源下所有动作放行
  - 否则要求 actions 中的每个动作均包含在权限数组中

- 路由未配置 requiredPermissions 时，默认放行

## API 文档

### 默认导出：Poter（单例管理器）

- init(routes: PoterRoute[], userPermissions: PoterGrantedPermission): void
  - 构造内部实例并触发事件通知（组件/Hook 会自动刷新）
  - 初始化完成后会自动刷新排队中的调用

- updateUserPermission(userPermissions: PoterGrantedPermission): void
  - 更新当前用户权限并触发刷新

- authentication(url: string): boolean
  - 根据预设 routes 判断是否可访问

- authRoute(url: string, options?: { waitInit?: boolean; defaultValue?: boolean }): boolean | Promise<boolean>
  - waitInit = false（默认）：未初始化时直接返回 defaultValue（默认 false，不入队）
  - waitInit = true：若未初始化则入队等待，最终返回真实鉴权结果（始终 Promise）

- check(params: PoterAuthParams): boolean
  - 自定义校验：传 requiredPermissions 与 oneOfPerm

- navigateTo(options: Taro.navigateTo.Option): Promise<unknown>
- redirectTo(options: Taro.redirectTo.Option): Promise<unknown>
- switchTab(options: Taro.switchTab.Option): Promise<unknown>
  - 导航前会进行权限校验，失败抛出 { code: 401, message: "权限验证失败" }

- navigateBack(options?: Taro.navigateBack.Option): Promise<unknown>
  - 不做权限限制，立即执行

> 队列语义：在 init 之前调用的鉴权/导航，会被排队等待初始化完成后串行执行，避免竞态问题。

### Hook：useRoutePermission(url, options?, deps?)

针对路由 url 的异步权限鉴权 Hook，内部监听权限初始化与更新事件自动刷新。

源码签名：`useRoutePermission(url: string, options?: { immediate?: boolean; defaultValue?: boolean }, deps: ReadonlyArray<unknown> = [])`

```ts
interface UseRoutePermissionOptions {
  immediate?: boolean // 默认 true，挂载后立即鉴权
  defaultValue?: boolean // 默认 false（初始 canAccess）
}

// 基础用法（立即鉴权）
const { canAccess, loading } = useRoutePermission("/pages/article/index")

// 自定义默认值 & 禁用挂载立即鉴权
const p = useRoutePermission("/pages/article/index", { immediate: false, defaultValue: true })

// 带额外依赖（依赖变化会重新触发 refresh）
const { canAccess, refresh } = useRoutePermission(dynamicUrl, { immediate: true }, [dynamicUrl, userId])
```

返回字段：

- canAccess: boolean 当前是否允许访问
- loading: boolean 当前是否在执行鉴权
- error: unknown 鉴权异常（通常不抛，但保留）
- refresh: () => Promise<boolean> 手动重新鉴权

### 组件：<PermissionWrapper />

```tsx
type PermissionWrapperProps = {
  requiredPermissions?: Array<{ resource: string | RegExp; actions?: string[] }>
  oneOfPerm?: boolean
  backup?: React.ReactNode // 无权限时的兜底渲染
}
```

- 根据 requiredPermissions/oneOfPerm 判定是否渲染 children，否则渲染 backup（或 null）
- 内部会在权限初始化/变更后自动刷新

### 类型导出

- PoterGrantedPermission = Record<string, string[]>
- PoterAuth = { resource: string | RegExp; actions?: string[] }
- PoterAuthParams = { requiredPermissions?: PoterAuth[]; oneOfPerm?: boolean }
- PoterRoute = { url: string; requiredPermissions?: PoterAuth[]; oneOfPerm?: boolean }

## 构建与测试

要求 Node >= 20.19。构建使用 Vite，输出 ESM 与 CJS：

- dist/poter.mjs
- dist/poter.cjs

常用脚本：

```bash
pnpm install            # 安装依赖
pnpm run test           # 运行单元测试（vitest）
pnpm run build          # 构建库（产物位于 dist/）
```

- 测试说明：项目使用 Vitest。你可以在仓库根目录运行下列命令来执行测试：

```bash
pnpm install
pnpm run test
```

## 设计细节与边界

- 未初始化行为
  - authentication 返回 false
  - authRoute(url,{waitInit:false}) 直接返回 defaultValue（默认 false，不触发排队）
  - authRoute(url,{waitInit:true}) / 导航 API 会入队等待 init 完成后再执行并返回真实结果
- 导航异常
  - 无权限时抛出 { code: 401, message: "权限验证失败" }
- 正则资源
  - 会匹配到的所有资源都需满足 actions 判定
- 通配符权限
  - 将资源权限设为 ["*"]，代表对该资源下的任意动作放行

## 许可

MIT © recvexi
