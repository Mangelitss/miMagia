import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#9e1b1b' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#9e1b1b' } },
  },
  images: ['public/logo.svg'],
})
