const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'src/renderer/index.jsx')],
  bundle: true,
  outfile: path.join(__dirname, 'public/renderer.js'),
  platform: 'browser',
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'react',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  loader: {
    '.jsx': 'jsx',
    '.js': 'js',
  },
  external: [],
}).then(() => {
  console.log('Build complete.');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
