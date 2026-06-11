/** 规范化路由路径：去除 query/hash，去掉末尾斜杠（根路径除外） */
export function normalizePath(url: string): string {
  const path = url.split("?")[0].split("#")[0]
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
}

export function resolvePoterResult(result: boolean | Promise<boolean>): Promise<boolean> {
  return Promise.resolve(result)
}
