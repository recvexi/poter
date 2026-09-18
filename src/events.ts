import mitt from "mitt"

export const EPoterEventKeys = {
  Reset: "poter:reset",
  Init: "poter:init",
  UpdateGrantedPermission: "poter:updateGrantedPermission",
} as const

export type PoterEvents = {
  [EPoterEventKeys.Reset]: void
  [EPoterEventKeys.Init]: void
  [EPoterEventKeys.UpdateGrantedPermission]: void
}

export const poterEmitter = mitt<PoterEvents>()

export const emitPoterReset = () => poterEmitter.emit(EPoterEventKeys.Reset)
export const emitPoterInit = () => poterEmitter.emit(EPoterEventKeys.Init)
export const emitPoterUpdate = () => poterEmitter.emit(EPoterEventKeys.UpdateGrantedPermission)
