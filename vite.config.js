import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { createViteLicensePlugin } from 'rollup-license-plugin';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

export default defineConfig(async ({ mode }) => {
  let _ESCAPP_APP_SETTINGS = {};
  try {
    if (mode === "development") {
      _ESCAPP_APP_SETTINGS = await import("./config.js").then((mod) => mod.ESCAPP_APP_SETTINGS);
    }
  } catch(e){}

  return {
    base: './',
    server: {
      open: true,
    },
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'README.md',
            dest: ''
          },
          {
            src: 'package.json',
            dest: ''
          }
        ]
      }),
      createViteLicensePlugin({
        outputFilename: false,
        additionalFiles: {
          'LICENSE': (packages) => {
            const license = fs.readFileSync('LICENSE', 'utf8');
            const manualLicenses = fs.readFileSync('LICENSES_THIRD_PARTY', 'utf8');

            const separator =
              '\n\n-------------------------------------------------------------------------------------------------\n\n';

            const additionalLicenses = packages.map((pkg) => {
              return [
                `${pkg.name} v${pkg.version}`,
                `License: ${pkg.license}`,
                pkg.licenseText || '',
              ].join('\n');
            }).join(separator);

            return [
              license,
              manualLicenses,
              'Additional Third-Party Dependencies\n\n' + additionalLicenses,
            ].join(separator);
          },
        },
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    define: {
      ESCAPP_APP_SETTINGS: mode === "development"
        ? JSON.stringify(_ESCAPP_APP_SETTINGS)
        : "undefined",
    },
  };
});