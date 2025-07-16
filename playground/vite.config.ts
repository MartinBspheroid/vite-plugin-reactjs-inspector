import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import VitePluginReactInspector from 'vite-plugin-reactjs-inspector/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePluginReactInspector({
    keyboardShortcut: 'alt+x',
    position: 'top-right',
    theme: {
      primary: '#61DBFB',
      secondary: '#20232A',
      disabled: '#6B7280'
    }
  })],
})
