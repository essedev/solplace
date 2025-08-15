import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	define: {
		global: "globalThis"
	},
	resolve: {
		alias: {
			buffer: "buffer"
		}
	},
	optimizeDeps: {
		include: ["buffer"]
	},
	build: {
		rollupOptions: {
			external: [],
			output: {
				globals: {}
			}
		}
	}
})
