import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'LintRoll',
    description: 'Detect and remove page ads for a cleaner browsing experience.',
    permissions: ['storage', 'declarativeNetRequest', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
  },
});
