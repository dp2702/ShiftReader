import { build } from 'esbuild';
import { mkdir, cp } from 'node:fs/promises';

const emptyNodeBuiltins = {
  name: 'empty-node-builtins-for-browser',
  setup(buildApi) {
    buildApi.onResolve({ filter: /^(fs|path)$/ }, args => ({
      path: args.path,
      namespace: 'empty-node-builtin'
    }));

    buildApi.onLoad({ filter: /.*/, namespace: 'empty-node-builtin' }, () => ({
      contents: 'export default {}; export const readFileSync = () => { throw new Error("Node filesystem is unavailable in the browser"); }; export const normalize = x => x;',
      loader: 'js'
    }));
  }
};

await mkdir('vendor/paddleocr/ort', { recursive: true });

await build({
  stdin: {
    contents: 'export { PaddleOCR } from "@paddleocr/paddleocr-js";',
    resolveDir: process.cwd()
  },
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'PaddleOCRSDK',
  platform: 'browser',
  target: ['es2022'],
  outfile: 'vendor/paddleocr/paddleocr.bundle.js',
  plugins: [emptyNodeBuiltins],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

await cp('node_modules/onnxruntime-web/dist', 'vendor/paddleocr/ort', {
  recursive: true
});

console.log('Built PaddleOCR browser bundle and copied ONNX Runtime assets.');
