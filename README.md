# ShiftReader

A browser-only GitHub Pages tool that converts a color-coded shift timetable screenshot into editable text, CSV, and JSON.

## Quick start

1. Upload `index.html`, `plan.md`, and `README.md` to the repository root.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the branch and `/ (root)`, then save.
5. Open the published site and choose a timetable screenshot.

## How to use

1. Choose or drop a screenshot.
2. Adjust **Name column** if the vertical divider after the names is not near the detected crop boundary.
3. Press **Read timetable**.
4. Review the debug overlay and warnings.
5. Correct any OCR mistakes in the editable result.
6. Copy or export the result.

## Privacy

The selected image is processed in the browser. The application itself does not upload the image to an application server. The starter loads Tesseract.js from jsDelivr; see `plan.md` for the later vendoring option.

## Important

OCR can make mistakes. Verify generated schedules against the screenshot before relying on them.
