# ShiftReader v2

This version no longer OCRs the tiny time labels. It detects colored blocks and calculates times from their horizontal chart position, snapping to five-minute intervals. OCR is only used for employee names, using local Turkish and English language models.

## Upload
Upload `index.html`, `README.md`, `plan.md`, and the entire `vendor` folder without changing its structure.

## Alignment
Defaults are tuned for the supplied timetable format:
- 16:00 grid line: 15.35%
- 23:00 grid line: 92.75%

Use **Show alignment**. The first red line must pass through 16:00 and the last red line through 23:00. Change the percentages if necessary, then process again.
