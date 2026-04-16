export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@nuxt/eslint", "@nuxt/fonts"],

  css: ["~/assets/css/main.css"],

  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],

  app: {
    head: {
      title: "Clarity",
      htmlAttrs: { lang: "fr" },
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Gravitas+One&display=swap",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cookie&display=swap",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Nova+Square&display=swap",
        },

        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      ],
      script: [
        {
          src: "https://challenges.cloudflare.com/turnstile/v0/api.js",
          async: true,
          defer: true,
        },
      ],
    },
  },

  runtimeConfig: {
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY,

    public: {
      apiBase: "http://localhost:3000/",

      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY,
    },
  },
  routeRules: {
    "/**": {
      headers: {
        "Content-Security-Policy":
          "script-src 'self' 'unsafe-inline' https://unpkg.com https://challenges.cloudflare.com",
      },
    },
  },

  nitro: {
    storage: {
      uploads: {
        driver: "fs",
        base: "./public/uploads",
      },
    },
    prerender: {
      crawlLinks: false,
    },
  },
});
