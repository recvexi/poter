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
import Poter, {
  CPoter,
  PoterAuthError,
  PermissionWrapper,
  useRoutePermission,
  type PoterRoute,
  type PoterGrantedPermission,
  type PoterOptions,
} from "poter"
```

## 快速开始

### 1) 定义路由与用户权限并初始化

```ts
import Poter, { type PoterRoute, type PoterGrantedPermission, type PoterOptions } from "poter"

const routes: PoterRoute[] = [
  { url: "/pages/article/index", requiredPermissions: [{ resource: "article", actions: ["read"] }] },
  { url: "/pages/sys/index", requiredPermissions: [{ resource: /^sys:.+$/, actions: ["manage"] }], oneOfPerm: true },
]

const grantedPermissions: PoterGrantedPermission = {
  article: ["read"],
  "sys:role": ["manage"],
}

const options: PoterOptions = {
  navigateBackFallback: "/pages/index/index", // 可选：navigateBack 失败时跳转的 tab 页
}

Poter.init(routes, grantedPermissions, options)
```

### 2) 在代码里做权限判断

```ts
// 根据 url 判断是否可访问（自动去除 query/hash；若路由未配置权限，默认放行）
const canVisit = Poter.authenticationPath("/pages/article/index")

// 自定义校验（未初始化时默认返回 false）
const allowed = Poter.check({
  requiredPermissions: [
    { resource: "article", actions: ["read"] },
    { resource: /^sys:.+$/, actions: ["manage"] },
  ],
  oneOfPerm: true,
})

// 需要等待 init 完成后再鉴权
const allowedAsync = await Poter.check(
  { requiredPermissions: [{ resource: "article", actions: ["read"] }] },
  { waitInit: true },
)
```

### 3) 使用导航代理（自动鉴权）

```ts
import { PoterAuthError } from "poter"

try {
  await Poter.navigateTo({ url: "/pages/article/index" })
} catch (e) {
  if (e instanceof PoterAuthError) {
    // code === 401
  }
}

// redirectTo / switchTab 同理；navigateBack 不做权限限制并立即执行
```

### 4) React 集成：Hook 与组件

```tsx
import { useRoutePermission, PermissionWrapper } from "poter"

const { canAccess, loading, error, refresh } = useRoutePermission("/pages/article/index")

<PermissionWrapper
  requiredPermissions={[{ resource: "article", actions: ["read"] }]}
  backup={<span>无权限</span>}
  loading={<span>加载中...</span>}
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
  - 若权限数组包含 `"*"`，视为对该资源下所有动作放行
  - 否则要求 actions 中的每个动作均包含在权限数组中

- 路由匹配会自动去除 query/hash，并忽略末尾斜杠（根路径除外）

- 路由未配置 requiredPermissions 时，默认放行

## API 文档

### 默认导出：Poter（单例管理器）

- init(routes: PoterRoute[], grantedPermissions: PoterGrantedPermission, options?: PoterOptions): void
  - 构造内部实例并触发事件通知（组件/Hook 会自动刷新）
  - 初始化完成后会自动刷新排队中的调用

- reset(): void
  - 清除实例与任务队列（主要用于测试或登出重置）

- updateGrantedPermission(grantedPermissions: PoterGrantedPermission): void
  - 更新当前用户权限并触发刷新
  - 若尚未初始化，会将更新入队，待 `init` 完成后执行

- authenticationPath(url: string): boolean
  - 根据预设 routes 判断是否可访问
  - 未初始化时返回 `false`

- authRoute(url: string, options?: PoterAsyncOptions): boolean | Promise<boolean>
  - waitInit = false（默认）：未初始化时直接返回 defaultValue（默认 false，不入队）
  - waitInit = true：若未初始化则入队等待，最终返回真实鉴权结果（始终 Promise）

- check(params: PoterAuthParams, options?: PoterAsyncOptions): boolean | Promise<boolean>
  - 自定义校验：传 requiredPermissions 与 oneOfPerm
  - 未初始化且 waitInit = false 时返回 defaultValue（默认 false）
  - waitInit = true 时入队等待 init 后返回真实结果

- navigateTo / redirectTo / switchTab
  - 导航前会进行权限校验，失败抛出 `PoterAuthError`（code: 401）

- navigateBack(options?: Taro.navigateBack.Option): Promise<unknown>
  - 不做权限限制，立即执行
  - 若在 `PoterOptions.navigateBackFallback` 中配置了路径，`navigateBack` 失败时会 `switchTab` 到该页

> 队列语义：在 init 之前调用的鉴权/导航，会被排队等待初始化完成后串行执行，避免竞态问题。

### 类：CPoter

可直接实例化，适合非单例场景或单元测试：

```ts
import { CPoter } from "poter"

const poter = new CPoter(routes, grantedPermissions, { navigateBackFallback: "/pages/index/index" })
poter.authenticationPath("/pages/article/index")
poter.updateGrantedPermission({ article: ["read"] })
```

### Hook：useRoutePermission(url, options?, deps?)

```ts
interface UseRoutePermissionOptions {
  immediate?: boolean // 默认 true
  defaultValue?: boolean // 默认 false
}
```

返回：`canAccess`、`loading`、`error`、`refresh`

### 组件：<PermissionWrapper />

```tsx
type PermissionWrapperProps = {
  requiredPermissions?: Array<{ resource: string | RegExp; actions?: string[] }>
  oneOfPerm?: boolean
  backup?: React.ReactNode // 无权限时的兜底渲染
  loading?: React.ReactNode // 鉴权等待中的兜底渲染
}
```

- 内部通过 `check({ waitInit: true })` 异步鉴权，init 前不会误放行 children
- 权限初始化/变更后自动刷新

### 类型与错误导出

- PoterGrantedPermission、PoterAuth、PoterAuthParams、PoterRoute
- PoterOptions、PoterAsyncOptions
- PoterAuthError

## 构建与测试

要求 Node >= 20.19。

```bash
pnpm install
pnpm run test
pnpm run build
```

## 迁移指南

### 0.2.x → 0.3.0

- `updateUserPermission` 重命名为 `updateGrantedPermission`
- `CPoter.authentication` 重命名为 `authenticationPath`
- `check` 未初始化时由返回 `true` 改为返回 `false`；支持 `{ waitInit, defaultValue }` 选项
- 导航失败改为抛出 `PoterAuthError` 实例（仍含 `code: 401`）
- `navigateBack` 不再硬编码 `/pages/index/index`，改为通过 `PoterOptions.navigateBackFallback` 配置
- 新增 `Poter.reset()`；`CPoter` 从包入口正式导出

### 0.1.x → 0.2.0

- 单例同步鉴权方法由 `authentication` 重命名为 `authenticationPath`
- `init` 第二参数命名为 `grantedPermissions`
- 内部类由 `CToter` 重命名为 `CPoter`

## 设计细节与边界

- 未初始化行为（默认均为保守策略）
  - `authenticationPath` / `check`（waitInit=false）/ `authRoute`（waitInit=false）均返回 `false`
  - `check` / `authRoute` 设置 `waitInit: true` 时入队等待
  - 导航 API 与 `updateGrantedPermission` 会入队等待 init
- 导航异常：抛出 `PoterAuthError`
- 正则资源：匹配到的所有资源都需满足 actions 判定
- 通配符：权限数组包含 `"*"` 即放行该资源的所有动作

## 许可

MIT © recvexi

### 权限总开关

通过初始化选项 `enable` 统一控制权限检查，省略时默认开启，兼容已有行为：

```ts
Poter.init(routes, grantedPermissions, {
  enable: false,
  navigateBackFallback: "/pages/index/index",
})
```

- `enable: false`：路由跳转、`authenticationPath`、`authRoute`、`check`、`PermissionWrapper` 和 `useRoutePermission` 均放行。
- `enable: true` 或省略：按配置的权限检查。
- 关闭开关不会修改用户权限或清空路由；重新调用 `init` 开启后恢复检查，组件和 Hook 会收到初始化事件并重新计算。
- 初始化前仍保留原有等待或拒绝行为。该开关仅控制前端权限，不改变后端鉴权。
- 业务自行缓存的鉴权结果需要重新计算，不会由库直接更新。
