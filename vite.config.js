import { defineConfig } from 'vite';

const siteUrl = 'https://www.atmosferastudio.cl/';
const title = 'Diseño web para pequeños negocios en Santiago | Atmósfera';
const description = 'Diseñamos y desarrollamos páginas web en Santiago para pequeños negocios y profesionales independientes, con agenda integrada cuando el proyecto la necesita.';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
      url: siteUrl,
      name: 'Atmósfera',
      alternateName: ['Atmosfera', 'Atmósfera Studio'],
      inLanguage: 'es-CL',
      publisher: {
        '@id': `${siteUrl}#organization`,
      },
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}#organization`,
      name: 'Atmósfera',
      alternateName: 'Atmósfera Studio',
      url: siteUrl,
      email: 'hola@atmosferastudio.cl',
      description: 'Diseño y desarrollo de páginas web para pequeños negocios y profesionales independientes, con agenda integrada cuando el proyecto la necesita.',
      areaServed: {
        '@type': 'City',
        name: 'Santiago, Chile',
      },
    },
  ],
};

function seoFoundation() {
  return {
    name: 'atmosfera-seo-foundation',
    transformIndexHtml(html) {
      const transformedHtml = html
        .replace('<html lang="es">', '<html lang="es-CL">')
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
        .replace(
          /<meta\s+name="description"[\s\S]*?\/>/i,
          `<meta name="description" content="${description}" />`,
        )
        .replace(
          '<p class="hero-kicker">Web - agenda</p>',
          '<p class="hero-kicker">Diseño web · agenda</p>',
        )
        .replace(
          /<p class="hero-description">[\s\S]*?<\/p>/i,
          `<p class="hero-description">\n              Desde Santiago, diseñamos y desarrollamos páginas web que se sienten propias para pequeños negocios y profesionales independientes. Si necesitas recibir reservas, la agenda vive dentro de la misma página.\n            </p>`,
        )
        .replace(
          'Partimos de los elementos que ya tienes y definimos cómo debe verse y organizarse tu página según lo que necesitas comunicar y facilitar.',
          'Partimos de los elementos que ya tienes y definimos cómo debe verse y organizarse tu página web según lo que necesitas comunicar y facilitar.',
        );

      return {
        html: transformedHtml,
        tags: [
          {
            tag: 'meta',
            attrs: {
              name: 'robots',
              content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
            },
            injectTo: 'head',
          },
          {
            tag: 'link',
            attrs: {
              rel: 'canonical',
              href: siteUrl,
            },
            injectTo: 'head',
          },
          {
            tag: 'link',
            attrs: {
              rel: 'icon',
              href: '/favicon.svg',
              type: 'image/svg+xml',
            },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { property: 'og:type', content: 'website' },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { property: 'og:locale', content: 'es_CL' },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { property: 'og:site_name', content: 'Atmósfera' },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { property: 'og:title', content: title },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { property: 'og:description', content: description },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { property: 'og:url', content: siteUrl },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { name: 'twitter:card', content: 'summary' },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { name: 'twitter:title', content: title },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { name: 'twitter:description', content: description },
            injectTo: 'head',
          },
          {
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            children: JSON.stringify(structuredData),
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [seoFoundation()],
});
