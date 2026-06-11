import PermissionWrapper from "@/components/permission-wrapper"
import Poter, { CPoter } from "@/instance"

export { useRoutePermission } from "@/hooks/useRoutePermission"
export { PoterAuthError } from "@/error"
export type {
  PoterGrantedPermission,
  PoterAuth,
  PoterAuthParams,
  PoterRoute,
  PoterOptions,
  PoterAsyncOptions,
} from "@/type"
export default Poter
export { PermissionWrapper, CPoter }
