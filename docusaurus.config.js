// @ts-check

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Welcome to Changelog!',
  favicon: 'img/favico.ico',

  future: {
    v4: true,
  },

  url: 'https://www.scnx-changelog.de',
  baseUrl: '/',

  organizationName: 'fatih5252',
  projectName: 'Changelog',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    localeConfigs: {
      en: {
        label: 'English',
      },
      de: {
        label: 'Deutsch',
      }
    }
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          editUrl: ({ locale, docPath }) => {
            if (locale === 'de') {
              return `https://github.com/fatih5252/changelog/tree/main/i18n/de/docusaurus-plugin-content-docs/current/${docPath}`;
            }
            return `https://github.com/fatih5252/changelog/tree/main/docs/${docPath}`;
          },
          sidebarPath: './sidebars.js',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: ({ blogDirPath, blogPath, permalink }) => {
            return `https://github.com/fatih5252/changelog/tree/main/${blogDirPath}/${blogPath}`;
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/favico.ico',
      navbar: {
        title: 'Changelog',
        logo: {
          alt: 'My Site Logo',
          src: 'img/favico.ico',
        },
        items: [
          {
            label: 'Intro',
            to: '/docs/Intro',
            position: 'left',
          },
          {
            label: 'News',
            to: '/blog',
            position: 'left',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/fatih5252/changelog',
            label: 'GitHub',
            className: 'header-github-link',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Changelog',
            items: [
              {
                label: 'Privacy',
                to: '/privacy',
              },
              {
                label: 'Disclaimer',
                to: '/disclaimer',
              },
            ],
          },
          {
            title: 'Useful Links',
            items: [
              {
                label: 'Disocrd (scootkit german)',
                href: 'https://discord.gg/jzPpfjUAct',
              },
              {
                label: 'Discord (scootkit english)',
                href: 'https://discord.gg/RV4xSSdqT6'
              },
              {
                label: 'Discord (changelog)',
                href: 'https://discord.gg/XZGGb27zdE',
              },
              {
                label: 'SCNX (referral link)',
                href: 'https://scnx.app/referral?code=MHtz3IGIns4a8ntj0Dc7sk8kwnqWIP2D2SIC',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'SCNX Docs',
                href: 'https://docs.scnx.xyz',
              },
              {
                label: 'SCNX tips',
                href: 'https://scnx.tips',
              },
              {
                label: 'SCNX Faq',
                href: 'https://faq.scnx.app',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },

      algolia: {
        appId: '5TK6ZB9Z16',
        apiKey: 'c901d5acb927574ffb80164b3ac5f5d8',
        indexName: 'crawler_changeloga',
        contextualSearch: true,
        searchPagePath: 'search',
        placeholder: 'Search docs...',
        searchParameters: {},
      },
    }),
};

export default config;

