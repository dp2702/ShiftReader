import { build } from 'esbuild';
import { mkdir, cp } from 'node:fs/promises';
await mkdir('vendor/paddleocr/ort', { recursive: true });
await build({
  stdin: { contents: 'export { PaddleOCR } from "@paddleocr/paddleocr-js";', resolveDir: process.cwd() },
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'PaddleOCRSDK',
  platform: 'browser',
  target: ['es2022'],
  outfile: 'vendor/paddleocr/paddleocr.bundle.js'
});
await cp('node_modules/onnxruntime-web/dist', 'vendor/paddleocr/ort', { recursive: true });
console.log('Built PaddleOCR browser bundle and copied ONNX Runtime assets.');
