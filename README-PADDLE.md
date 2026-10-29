# ShiftReader v5: PaddleOCR medium + geometry + manual anchor

## What this adds

- Primary OCR: PP-OCRv6 medium detection and recognition in the browser.
- Automatic fallback: duration-validated block anchors and robust geometry fitting.
- Guaranteed fallback: click one readable block and enter its visible start time.
- The existing Tesseract Turkish/English model remains only for employee names.

## Build the browser assets

Copy all files from this package into the repository, commit, and open the repository’s **Actions** tab. Run **Build PaddleOCR browser assets** manually. The workflow installs `@paddleocr/paddleocr-js`, bundles it, downloads the official PP-OCRv6 medium ONNX detection/recognition models, packages the required uncompressed model tar files, copies ONNX Runtime Web assets, and commits `vendor/paddleocr/` back to the repository.

The official browser SDK accepts custom model assets containing `inference.onnx` and `inference.yml` in an uncompressed tar archive. The generated workflow follows that required structure.

## Add to index.html

Load the package and v5 add-on last:

```html
<script src="./vendor/paddleocr/paddleocr.bundle.js?v=50"></script>
<script src="./paddle-anchor-v5.js?v=50"></script>
```

Keep the existing timetable CSS/add-on if desired. `paddle-anchor-v5.js` must be the final JavaScript file so it owns the **Read timetable** button.

## First use

The first OCR run downloads the medium detector and recognizer from the same GitHub Pages site. Model files are large, so the first initialization can take time. Later loads should use browser cache.

## Switching to small

If medium is too slow, change the four model name/file references in `paddle-anchor-v5.js` from `medium` to `small`, and update the GitHub Action model repository names from `PP-OCRv6_medium_*_onnx` to `PP-OCRv6_small_*_onnx`.
