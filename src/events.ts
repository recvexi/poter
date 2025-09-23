import mitt from "mitt"

export type ToterEvents = {
  "toter:init": void
  "toter:updateUserPermission": void
}

export const toterEmitter = mitt<ToterEvents>()

export const emitToterInit = () => toterEmitter.emit("toter:init")
export const emitToterUpdate = () => toterEmitter.emit("toter:updateUserPermission")
