import mitt from "mitt"

export const EPoterEventKeys = {
  Init: "poter:init",
  UpdateGrantedPermission: "poter:updateGrantedPermission",
} as const

export type PoterEvents = {
  [EPoterEventKeys.Init]: void
  [EPoterEventKeys.UpdateGrantedPermission]: void
}

export const poterEmitter = mitt<PoterEvents>()

export const emitPoterInit = () => poterEmitter.emit(EPoterEventKeys.Init)
export const emitPoterUpdate = () => poterEmitter.emit(EPoterEventKeys.UpdateGrantedPermission)
