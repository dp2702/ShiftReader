# ShiftReader Development Plan

## 1. Project goal

ShiftReader is a static GitHub Pages application that converts a screenshot of the **Shift Break Timetable** into editable, readable text.

Example output:

```text
Yunus Emre Hancer
16:45-17:00 Short
18:25-18:40 Short
19:25-19:40 Short
20:30-21:00 Meal
22:40-23:00 WB20
```

The first version targets screenshots with the same structure as the supplied example:

- employee names in a fixed column on the left;
- one employee per horizontal row;
- blue boxes for `Short`;
- orange boxes for `Meal`;
- green boxes for `WB20`;
- purple boxes for `WB70`;
- white time labels inside colored boxes.

## 2. Deployment constraints

- Static hosting on GitHub Pages
- No backend, database, account, or paid API
- Processing stays in the browser
- CPU-only OCR
- PNG, JPG, JPEG, and WebP input
- Mobile and desktop support

## 3. Processing strategy

The application does not OCR the entire chart at full detail. It uses a targeted pipeline:

1. Load the screenshot into a canvas.
2. Scale very large images to a configurable processing width.
3. Detect colored break rectangles by pixel color and connected-component analysis.
4. Classify each rectangle by nearest reference color.
5. Group rectangles into employee rows using vertical position.
6. OCR only the left name region.
7. OCR each detected colored rectangle separately.
8. Normalize OCR results into `HH:MM-HH:MM`.
9. Match names and break boxes by row position.
10. Present editable results before export.

Targeted OCR should be faster and more reliable than processing the complete screenshot as one page.

## 4. Current milestone: browser MVP

The initial project includes:

- drag-and-drop, clipboard paste, or file-picker input;
- image preview;
- configurable name-column width;
- configurable OCR processing width;
- colored-box detection;
- recognition of Short, Meal, WB20, and WB70 blocks;
- targeted Tesseract.js OCR;
- progress and diagnostic messages;
- editable result text;
- employee view and chronological view;
- copy, TXT, CSV, and JSON export;
- a debug canvas showing detected boxes;
- local settings saved in `localStorage`;
- no upload of timetable images to an application server.

## 5. Accuracy safeguards

The browser must not silently present uncertain OCR as correct. The interface therefore:

- keeps the generated text editable;
- displays warnings for unreadable names or times;
- gives fallback employee labels such as `Employee 01`;
- preserves detected boxes even when OCR is incomplete;
- exposes a debug overlay for visual verification;
- includes settings for layout differences.

## 6. Planned improvements

### Milestone 2: stronger row/name matching

- OCR names line-by-line with bounding boxes
- associate each OCR line with the nearest detected row
- merge fragmented names
- Turkish character normalization without damaging valid names
- confidence indicator per employee and break

### Milestone 3: calibration

- interactive crop handles for the name column and chart area
- color-picker calibration from a sample box
- reusable presets for different screenshot resolutions
- manual row correction and drag-to-reassign a break

### Milestone 4: usability

- filter by employee or break type
- meal-only and next-break views
- per-employee cards
- automatic date/shift extraction from the heading
- saved recent results in IndexedDB
- optional installable PWA mode

### Milestone 5: testing and hardening

- build a set of anonymized fixture screenshots
- test scaled and compressed screenshots
- benchmark desktop and low-memory systems
- validate exports against manually verified schedules
- add deterministic unit tests for time parsing, color classification, grouping, and CSV escaping

## 7. Known limitations

- OCR is not guaranteed to be exact. Users must verify results before operational use.
- The initial detector assumes a white/light background and colors close to the supplied chart.
- Screenshots with a substantially different theme or layout require calibration.
- Tesseract.js, the worker, OCR core, and English language data are stored in the repository under `vendor`, avoiding runtime CDN access.
- Very large screenshots can use significant memory. ShiftReader scales them before analysis.
- Names may be the hardest OCR target because the text is smaller than the time text.

## 8. File structure

```text
ShiftReader/
├── index.html
├── plan.md
├── README.md
└── vendor/
    ├── tesseract/
    └── tessdata/
```

The starter deliberately uses one HTML file so it is easy to upload, inspect, and host on GitHub Pages.

## 9. Acceptance criteria for MVP

The MVP is successful when it can:

1. Open, drop, or paste the supplied timetable screenshot.
2. Detect most colored break boxes without detecting the legend.
3. Assign detected boxes to the correct horizontal employee rows.
4. Classify the four break types correctly.
5. OCR usable employee names and time ranges.
6. Produce editable text and CSV/JSON exports.
7. Run from GitHub Pages without a custom backend.

## 10. Immediate next steps

1. Upload the three starter files to the repository root.
2. Enable GitHub Pages for the branch containing `index.html`.
3. Test with the original full-resolution screenshot.
4. Use the debug overlay and diagnostics to identify misses.
5. Tune color thresholds, minimum component size, name-column width, and row grouping from real results.
6. Keep the complete `vendor` directory and its paths unchanged when uploading.
