import { defineConfig } from 'vite';

const legacyGoogleFontStylesheet =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600&display=swap';
const legacyGoogleFontImport = `@import url('${legacyGoogleFontStylesheet}');`;

function stripLegacyGoogleFontImport() {
  return {
    name: 'atmosfera-strip-legacy-google-font-import',
    enforce: 'pre',

    transform(code, id) {
      const normalizedId = id.replaceAll('\\', '/');
      if (!normalizedId.endsWith('/src/landing-v2.css')) return null;

      if (!code.includes(legacyGoogleFontImport)) {
        throw new Error('Expected legacy Bricolage Grotesque Google Fonts import was not found.');
      }

      return {
        code: code.replace(`${legacyGoogleFontImport}\n\n`, ''),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [stripLegacyGoogleFontImport()],
});
