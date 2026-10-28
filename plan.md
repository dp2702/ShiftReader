# ShiftReader Development Plan

## Completed: v3 automatic calibration

- Clipboard paste, drag-and-drop, and file input
- Local Tesseract.js with Turkish and English data
- Resolution-independent HSV color classification
- Connected-component rectangle detection
- Automatic employee-row grouping
- Scale estimation from block width and known duration
- High-contrast time-label preprocessing
- Distributed time-anchor OCR sampling
- Duration-based anchor validation
- Circular timeline fitting for midnight rollover
- Outlier rejection
- Geometry-derived times for all blocks
- Separate row-based name OCR
- Confidence state and diagnostics overlay
- TXT, CSV, and JSON export

## Safety principle

ShiftReader must fail visibly when calibration evidence is insufficient. It must not manufacture a complete-looking timetable from weak OCR.

## Next improvements

1. OCR the visible bottom-axis labels as an additional calibration source.
2. OCR the heading shift range as an additional midnight hint.
3. Automatically learn the four dominant block colors from each screenshot.
4. Add a correction grid rather than relying only on editable plain text.
5. Save user-corrected names locally and fuzzy-match them in later screenshots.
6. Add regression tests using anonymized screenshots from morning, mid, and night shifts.
7. Add Web Worker cancellation between recognition jobs.
8. Add an optional fast mode that stops anchor OCR as soon as a stable fit is established.
