# ShiftReader Plan

## Current design: v2 position engine

The original per-box OCR approach was rejected because small white labels produced missing endpoints and impossible values. Version 2 uses:

1. Color segmentation to detect break blocks.
2. Horizontal chart calibration from the 16:00 and 23:00 grid lines.
3. Start-time calculation from each block's X coordinate.
4. Five-minute snapping.
5. Fixed duration by type: Short 15, Meal 30, WB20 20, WB70 70 minutes.
6. Turkish + English OCR only for employee names.
7. Editable output and alignment overlay.

## Next milestones
- Automatically detect hourly grid lines.
- Add draggable calibration lines.
- Add per-row manual correction.
- Preserve a verified employee-name dictionary locally.
- Add confidence warnings and regression fixtures.
