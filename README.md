# ShiftReader v3

ShiftReader converts color-coded Shift Break Timetable screenshots into editable text without a backend.

## What changed in v3

Version 3 removes all manual percentage and shift-time settings.

The automatic engine:

1. Detects blue, orange, green, and purple schedule blocks using HSV color ranges.
2. Estimates pixels-per-minute from rectangle widths and the known durations of Short, Meal, WB20, and WB70 blocks.
3. OCRs a distributed sample of time labels after converting white-on-color text into enlarged black-on-white crops.
4. Keeps only labels whose recognized range agrees with the duration of the detected break type.
5. Calculates candidate clock offsets from recognized labels.
6. Uses circular robust fitting to handle both ordinary shifts and shifts crossing midnight.
7. Rejects time-label outliers that disagree with the majority.
8. Calculates every remaining break from chart geometry.
9. OCRs employee names separately with Turkish and English models.
10. Displays calibration quality and diagnostics rather than silently trusting weak output.

## Deployment

Upload the following structure to the repository root:

```text
index.html
README.md
plan.md
vendor/
  tesseract/
  tessdata/
```

Do not rename or omit the `vendor` directory. GitHub Pages must serve all files from the same repository.

## Usage

1. Paste with Ctrl+V, drag an image onto the page, or choose a file.
2. Select **Read timetable**.
3. Review calibration quality.
4. Use the diagnostics overlay if anchors or rectangles look wrong.
5. Correct occasional employee-name OCR errors in the editable result.
6. Copy or export TXT, CSV, or JSON.

## Accuracy notes

- Original-resolution screenshots work best.
- The program rejects an image when too few time labels agree. This is safer than creating plausible-looking incorrect times.
- The timeline may start at any hour and may cross midnight.
- Resolution, margins, and chart width may change.
- Known durations are Short 15 minutes, Meal 30 minutes, WB20 20 minutes, and WB70 70 minutes.
