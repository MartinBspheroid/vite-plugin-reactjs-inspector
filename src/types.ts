export interface PluginOptions {
  keyboardShortcut?: string // Default: 'alt+x'
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' // Default: 'top-right'
  theme?: {
    primary?: string // Default: '#61DBFB'
    secondary?: string // Default: '#20232A'
    disabled?: string // Default: '#6B7280'
  }
}
