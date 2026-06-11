# Changelog

遵循 Keep a Changelog 格式，版本号遵循 SemVer。

## [0.3.0] - 2025-06-12

### Added

- 新增 `PoterAuthError` 错误类，导航鉴权失败时抛出标准 Error 实例
- 新增 `Poter.reset()` 用于清除单例实例与任务队列
- 新增 `PoterOptions`（含 `navigateBackFallback`）作为 `init` 第三参数
- 新增 `PoterAsyncOptions`，`check` 支持 `{ waitInit, defaultValue }` 与 `authRoute` 对齐
- `CPoter` 从包入口正式导出
- `PermissionWrapper` 新增 `loading` 属性，鉴权等待期间可自定义渲染
- 路由匹配自动去除 query/hash 并规范化末尾斜杠

### Changed

- **Breaking** `updateUserPermission` 重命名为 `updateGrantedPermission`
- **Breaking** `CPoter.authentication` 重命名为 `authenticationPath`
- **Breaking** `check` 未初始化时由返回 `true` 改为返回 `false`（与 `authenticationPath` 安全语义统一）
- **Breaking** 导航鉴权失败由抛出普通对象改为抛出 `PoterAuthError`
- **Breaking** 移除 `navigateBack` 硬编码的 `/pages/index/index` 回退，改为 `PoterOptions.navigateBackFallback` 可选配置
- 通配符判断由 `perm.join("") === "*"` 改为 `perm.includes("*")`
- `PermissionWrapper` 改用 `check({ waitInit: true })` 异步鉴权，修复未初始化时误放行 children 的问题
- `PermissionWrapper` 修复事件监听未清理的内存泄漏；改为从 `@/instance` 导入，消除与 `index` 的循环依赖

### Fixed

- `PermissionWrapper` 不再依赖私有字段 `Poter._instance`

## [0.2.0] - 2025-11-05

### Changed (0.2.0)

- 重命名 `CToter` 为 `CPoter`，并统一导出/测试用例中的引用（`src/instance.ts`、`tests/*` 已同步更新）。
- `Poter.init` 的第二个参数名称由 `userPermissions` 调整为 `grantedPermissions`（代码与注释中已同步）。
- 修改并整理单例管理器的行为：
  - 将同步鉴权方法名从 `authentication` 改为 `authenticationPath`，并调整其未初始化时的默认返回值（由原先的 `true` 改为 `false`，以便更明确地表达不同场景下的安全语义）；
  - `updateUserPermission` 在存在内部实例时将立即应用并返回；当尚未初始化时，会将更新入队列等待初始化后执行。

- 修正并明确了队列（enqueue/flush）逻辑，确保初始化后能正确串行刷新的调用顺序与错误传播。
- 更新了 `README.md`，加入迁移提示（关于 `CToter` -> `CPoter`）与测试运行说明。

### Fixed (0.2.0)

- 修复了队列刷新/入队在竞态情况下的处理细节，避免初始化期间的任务丢失或重复触发。

## [0.1.0] - 2025-10-09

### Changed (0.1.0)

- `useRoutePermission` Hook 内部改为使用 `authRoute(url,{ waitInit:true })` 实现异步等待初始化。
- 统一命名：对外与内部类型/实例统一使用 `Poter*` 前缀（移除遗留 `Toter*` 导出与示例）。
- 事件前缀统一：`toter:init` / `toter:updateGrantedPermission` 更名为 `poter:init` / `poter:updateGrantedPermission`。

### Removed (Breaking)

- 移除 `authRouteAsync`（请使用 `authRoute(url,{ waitInit:true })` 代替）。
- 移除旧的 `authenticationAsync` 说明（同语义现已由 `authRoute` 覆盖）。

### Added

- 新增单元测试覆盖 `authRoute` 在 `waitInit` 及 `defaultValue` 下的行为 (`tests/authRoute.test.ts`)。

### Notes

- 同步更新 README，增加 `authRoute` API 说明与初始化前行为差异。

## [0.0.x]

- 初始原型版本（未记录详细变更）。
