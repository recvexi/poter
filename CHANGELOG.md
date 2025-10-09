# Changelog

遵循 Keep a Changelog 格式，版本号遵循 SemVer。

## [0.1.0] - 2025-10-09

### Changed

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
