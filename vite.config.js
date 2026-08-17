import { defineConfig } from 'vite';

const googleFontStylesheet =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600&display=swap';
const googleFontImport = `@import url('${googleFontStylesheet}');`;

function fontLoadingHints() {
  return {
    name: 'atmosfera-font-loading-hints',
    enforce: 'pre',

    transform(code, id) {
      const normalizedId = id.replaceAll('\\', '/');
      if (!normalizedId.endsWith('/src/landing-v2.css')) return null;

      if (!code.includes(googleFontImport)) {
        throw new Error('Expected Bricolage Grotesque Google Fonts import was not found.');
      }

      return {
        code: code.replace(`${googleFontImport}\n\n`, ''),
        map: null,
      };
    },

    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
          injectTo: 'head-prepend',
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: '',
          },
          injectTo: 'head-prepend',
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: googleFontStylesheet,
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [fontLoadingHints()],
});
