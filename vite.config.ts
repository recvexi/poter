import path from "path"

import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => {
  const isProd = mode === "production"

  return {
    build: {
      lib: {
        entry: "src/index.ts",
        name: "poter",
        formats: ["es", "cjs"],
        fileName: () => `poter`,
      },
      rollupOptions: {
        // 在此将外部依赖标记为 external，避免被打包进入库
        external: ["@tarojs/taro", "react"],
        output: [
          {
            format: "es",
            entryFileNames: "poter.mjs",
            chunkFileNames: "chunks/[name]-[hash].mjs",
            assetFileNames: "assets/[name]-[hash][extname]",
            exports: "named",
          },
          {
            format: "cjs",
            entryFileNames: "poter.cjs",
            chunkFileNames: "chunks/[name]-[hash].cjs",
            assetFileNames: "assets/[name]-[hash][extname]",
            exports: "named",
          },
        ],
      },
      sourcemap: isProd,
      minify: isProd ? "esbuild" : false,
      outDir: "dist",
      emptyOutDir: false,
    },

    plugins: [
      dts({
        entryRoot: "src",
        outDir: "dist",
        insertTypesEntry: true,
        include: ["src"],
        exclude: ["**/__tests__/**", "node_modules"],
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".js", ".json", ".ts", ".tsx", ".jsx"],
    },
  }
})
