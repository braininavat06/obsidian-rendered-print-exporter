import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  external: ['obsidian'],
  sourcemap: false,
  logLevel: 'info'
});
