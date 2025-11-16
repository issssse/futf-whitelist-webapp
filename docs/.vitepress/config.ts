import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Web2 Documentation',
  description: 'Comprehensive documentation for the FUTF Minecraft web platform',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Setup', link: '/setup' },
      {
        text: 'Guide',
        items: [
          { text: 'Chapter 1 – Foundations', link: '/guide/chapter-1-foundations' },
          { text: 'Chapter 2 – Frontend Experience', link: '/guide/chapter-2-frontend' },
          { text: 'Chapter 3 – Backend Services', link: '/guide/chapter-3-backend' },
          { text: 'Chapter 4 – Deploy & Operate', link: '/guide/chapter-4-devops' },
          { text: 'Chapter 5 – Troubleshoot & Extend', link: '/guide/chapter-5-troubleshooting' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'File & Module Map', link: '/reference/file-map' },
          { text: 'Frontend Reference', link: '/reference/frontend' },
          { text: 'Backend Reference', link: '/reference/backend' }
        ]
      }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Product Guide',
          items: [
            { text: 'Chapter 1 – Foundations', link: '/guide/chapter-1-foundations' },
            { text: 'Chapter 2 – Frontend Experience', link: '/guide/chapter-2-frontend' },
            { text: 'Chapter 3 – Backend Services', link: '/guide/chapter-3-backend' },
            { text: 'Chapter 4 – Deploy & Operate', link: '/guide/chapter-4-devops' },
            { text: 'Chapter 5 – Troubleshoot & Extend', link: '/guide/chapter-5-troubleshooting' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference Library',
          items: [
            { text: 'File & Module Map', link: '/reference/file-map' },
            { text: 'Frontend Reference', link: '/reference/frontend' },
            { text: 'Backend Reference', link: '/reference/backend' }
          ]
        }
      ],
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Welcome', link: '/' },
            { text: 'Setup Checklist', link: '/setup' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/theodor' }
    ],
    footer: {
      message: 'Maintained by FUTF IT',
      copyright: 'Copyright © 2024–2025 FUTF'
    }
  }
})
