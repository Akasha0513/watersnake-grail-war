// vite.config.prod.mjs
import path from "path";
import { defineConfig } from "file:///sessions/fervent-zealous-feynman/mnt/Projects/watersnake-grail-war/node_modules/vite/dist/node/index.js";
import vue from "file:///sessions/fervent-zealous-feynman/mnt/Projects/watersnake-grail-war/node_modules/@vitejs/plugin-vue/dist/index.mjs";
var __vite_injected_original_dirname = "/sessions/fervent-zealous-feynman/mnt/Projects/watersnake-grail-war";
var vite_config_prod_default = defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@/": `${path.resolve(__vite_injected_original_dirname, "src/vue")}/`,
      "@src/": `${path.resolve(__vite_injected_original_dirname, "src")}/`
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "src/scss/v2/_init.scss";'
      }
    }
  },
  build: {
    sourcemap: true,
    outDir: "./dist/vue",
    lib: {
      entry: path.resolve(__vite_injected_original_dirname, "src/vue/index.js"),
      name: "v3ArchmageVueComponents",
      formats: ["es"],
      // also supports 'umd'
      fileName: (format) => `components.vue.${format}.js`
    },
    rollupOptions: {
      external: [
        "vue"
      ],
      output: {
        // Provide global variables to use in the UMD build
        // Add external deps here
        globals: {
          vue: "Vue"
        },
        // Map the external dependency to a local copy of Vue 3 esm.
        paths: {
          vue: `../scripts/lib/vue.esm-browser.prod.js`
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name == "style.css")
            return `styles.vue.css`;
          return assetInfo.name;
        }
      }
    }
  }
});
export {
  vite_config_prod_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcucHJvZC5tanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvZmVydmVudC16ZWFsb3VzLWZleW5tYW4vbW50L1Byb2plY3RzL3dhdGVyc25ha2UtZ3JhaWwtd2FyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvZmVydmVudC16ZWFsb3VzLWZleW5tYW4vbW50L1Byb2plY3RzL3dhdGVyc25ha2UtZ3JhaWwtd2FyL3ZpdGUuY29uZmlnLnByb2QubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy9mZXJ2ZW50LXplYWxvdXMtZmV5bm1hbi9tbnQvUHJvamVjdHMvd2F0ZXJzbmFrZS1ncmFpbC13YXIvdml0ZS5jb25maWcucHJvZC5tanNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3Z1ZSgpXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQC8nOiBgJHtwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3Z1ZScpfS9gLFxyXG4gICAgICAnQHNyYy8nOiBgJHtwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyl9L2AsXHJcbiAgICB9XHJcbiAgfSxcclxuICBjc3M6IHtcclxuICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgc2Nzczoge1xyXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhOiAnQGltcG9ydCBcInNyYy9zY3NzL3YyL19pbml0LnNjc3NcIjsnXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgc291cmNlbWFwOiB0cnVlLFxyXG4gICAgb3V0RGlyOiAnLi9kaXN0L3Z1ZScsXHJcbiAgICBsaWI6IHtcclxuICAgICAgZW50cnk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdnVlL2luZGV4LmpzJyksXHJcbiAgICAgIG5hbWU6ICd2M0FyY2htYWdlVnVlQ29tcG9uZW50cycsXHJcbiAgICAgIGZvcm1hdHM6IFsnZXMnXSwgLy8gYWxzbyBzdXBwb3J0cyAndW1kJ1xyXG4gICAgICBmaWxlTmFtZTogKGZvcm1hdCkgPT4gYGNvbXBvbmVudHMudnVlLiR7Zm9ybWF0fS5qc2AsXHJcbiAgICB9LFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBleHRlcm5hbDogW1xyXG4gICAgICAgICd2dWUnLFxyXG4gICAgICBdLFxyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAvLyBQcm92aWRlIGdsb2JhbCB2YXJpYWJsZXMgdG8gdXNlIGluIHRoZSBVTUQgYnVpbGRcclxuICAgICAgICAvLyBBZGQgZXh0ZXJuYWwgZGVwcyBoZXJlXHJcbiAgICAgICAgZ2xvYmFsczoge1xyXG4gICAgICAgICAgdnVlOiAnVnVlJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIE1hcCB0aGUgZXh0ZXJuYWwgZGVwZW5kZW5jeSB0byBhIGxvY2FsIGNvcHkgb2YgVnVlIDMgZXNtLlxyXG4gICAgICAgIHBhdGhzOiB7XHJcbiAgICAgICAgICB2dWU6IGAuLi9zY3JpcHRzL2xpYi92dWUuZXNtLWJyb3dzZXIucHJvZC5qc2BcclxuICAgICAgICB9LFxyXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XHJcbiAgICAgICAgICBpZiAoYXNzZXRJbmZvLm5hbWUgPT0gJ3N0eWxlLmNzcycpXHJcbiAgICAgICAgICAgIHJldHVybiBgc3R5bGVzLnZ1ZS5jc3NgO1xyXG4gICAgICAgICAgcmV0dXJuIGFzc2V0SW5mby5uYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1WSxPQUFPLFVBQVU7QUFDeFosU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBRmhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sMkJBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFBQSxFQUNmLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLE1BQU0sR0FBRyxLQUFLLFFBQVEsa0NBQVcsU0FBUyxDQUFDO0FBQUEsTUFDM0MsU0FBUyxHQUFHLEtBQUssUUFBUSxrQ0FBVyxLQUFLLENBQUM7QUFBQSxJQUM1QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILHFCQUFxQjtBQUFBLE1BQ25CLE1BQU07QUFBQSxRQUNKLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxJQUNSLEtBQUs7QUFBQSxNQUNILE9BQU8sS0FBSyxRQUFRLGtDQUFXLGtCQUFrQjtBQUFBLE1BQ2pELE1BQU07QUFBQSxNQUNOLFNBQVMsQ0FBQyxJQUFJO0FBQUE7QUFBQSxNQUNkLFVBQVUsQ0FBQyxXQUFXLGtCQUFrQixNQUFNO0FBQUEsSUFDaEQ7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFVBQVU7QUFBQSxRQUNSO0FBQUEsTUFDRjtBQUFBLE1BQ0EsUUFBUTtBQUFBO0FBQUE7QUFBQSxRQUdOLFNBQVM7QUFBQSxVQUNQLEtBQUs7QUFBQSxRQUNQO0FBQUE7QUFBQSxRQUVBLE9BQU87QUFBQSxVQUNMLEtBQUs7QUFBQSxRQUNQO0FBQUEsUUFDQSxnQkFBZ0IsQ0FBQyxjQUFjO0FBQzdCLGNBQUksVUFBVSxRQUFRO0FBQ3BCLG1CQUFPO0FBQ1QsaUJBQU8sVUFBVTtBQUFBLFFBQ25CO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
