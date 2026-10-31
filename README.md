# ShiftReader

A browser-based tool that turns a shift/timetable screenshot into something a human can actually read.

ShiftReader accepts an image, runs it through one of two OCR pipelines, tries to reconstruct employee names, breaks, times, and timetable positions, then displays the result as a searchable schedule. It also includes favorites, reminders, exports, diagnostics, and several layers of fixes that should probably have been one coherent application but are not.

It works. That is the important part.

## What it does

- Accepts timetable screenshots by:
  - pasting with `Ctrl+V`
  - dragging and dropping an image
  - choosing an image file
- Uses two OCR approaches:
  - a fast legacy reader for normal screenshots
  - PaddleOCR for screenshots that need a slower and more reliable pass
- Can automatically choose an OCR mode from the detected image quality
- Extracts employee names and their scheduled breaks
- Reconstructs the timetable using visible labels, anchors, and grid lines
- Displays the result as a readable timeline/table
- Lets you search for employees
- Lets you pin favorites to the top
- Saves favorites in the current browser
- Provides per-employee break alarms while the page remains open
- Can show OCR/debug information and the detected overlay
- Can copy or export the extracted result as text, TXT, or CSV
- Runs as a static browser application and can be hosted on GitHub Pages

## How it works

The short version:

1. You give the app a timetable screenshot.
2. ShiftReader examines the image and chooses the fast OCR path or PaddleOCR.
3. OCR reads the visible employee names, labels, and time information.
4. Additional parsing code tries to determine rows, timeline anchors, grid positions, and break blocks.
5. The extracted data is normalized into employee schedules.
6. The UI renders a readable timetable and enables search, favorites, alarms, editing, copying, and export.

The longer and less flattering version:

ShiftReader is not a clean pipeline. It is an accumulation of the original reader, a second OCR engine, layout corrections, timeline corrections, anchor corrections, alarm add-ons, UI replacements, and emergency fixes. Several scripts and stylesheets were added later to correct or override behavior from earlier ones. The final result depends partly on load order and on the newest patch winning an argument with the previous patch.

In other words, the architecture is approximately:

```text
original app
    + OCR attempt
    + better OCR attempt
    + timetable add-on
    + timeline fix
    + anchor fix
    + UI fix
    + layout fix
    + another layout fix
    + "do not touch it, it works now"
```

This is not presented as good engineering. It is presented as an accurate description.

## OCR modes

### Auto

Auto mode inspects the image and chooses the OCR path it believes is appropriate. It normally prefers the faster reader when the screenshot appears clear enough.

Use this first.

### Force PaddleOCR

Runs the slower PaddleOCR path. Use it when:

- names are missing or badly recognized
- break markers are shifted
- visible times are wrong
- the fast reader produces an incomplete table
- Auto mode was confident but clearly wrong

This mode is slower, but it may recover difficult screenshots more successfully.

### Do not use PaddleOCR

Forces the fast legacy reader. Use this when:

- the screenshot is already clear
- PaddleOCR is taking too long
- the fast reader gives the correct result
- you only need a quick extraction

## How to use

1. Open the hosted ShiftReader page.
2. Paste, drop, or select a timetable screenshot.
3. Leave OCR mode on **Auto** for the first attempt.
4. Select **Read timetable**.
5. Check several visible names and break times against the original screenshot.
6. If rows, times, or breaks are wrong, select **Force PaddleOCR** and run it again.
7. Use search or favorites to find the employees you care about.
8. Arm an employee's alarms if required.
9. Keep the page open, the device awake, and the volume enabled for alarms to work.
10. Copy or export the result if you need it elsewhere.

## Important limitations

- OCR is not guaranteed to be correct.
- The timetable format, image crop, scaling, compression, colors, and screenshot quality can all affect extraction.
- A successful-looking result can still contain incorrect times.
- Always compare several extracted values with the source image.
- Browser alarms only work while the page is open and the browser allows them to run.
- Favorites and similar preferences are stored locally in the browser, not in an account.
- The app is designed around the timetable layouts it was built and patched against. A significantly different layout may fail.
- A browser update, OCR asset problem, or innocent-looking CSS change may break something unrelated.

## Project structure, more or less

The repository contains the main page, OCR assets and source files, plus multiple independently added fixes and add-ons. Files with names such as `timeline-core-fix`, `block-anchor-fix`, `paddle-anchor`, `timetable-addon`, and `shiftreader-layout-fix` are exactly what they sound like: later layers applied to make earlier layers behave.

Some similarly named files are different revisions. The newer file does not necessarily replace the older file cleanly; it may depend on it, override part of it, or simply load after it.

Do not delete a file merely because another file has a higher version number unless you have tested the entire app afterward.

## Why the code is shitty

Because this was built by solving the next visible problem instead of repeatedly rebuilding the whole application around a clean design.

More specifically:

- Features were added after the original structure was already in place.
- Fixes were layered on top of previous fixes.
- Multiple scripts can modify the same UI or timetable behavior.
- Multiple stylesheets can compete over the same elements.
- Some behavior depends on script and stylesheet load order.
- Old implementations remain because removing them could break a newer patch.
- The two OCR paths do not naturally produce identical data, so extra normalization and special cases are required.
- OCR and visual timetable reconstruction are messy even in a well-designed project.
- The app was optimized for getting a useful result, not for architectural purity.

It is technical debt with a user interface.

## Why it will stay shitty

Because it currently works well enough for its intended job, and rewriting it would create a large amount of work with very little immediate benefit.

A proper rewrite would require:

- defining one stable internal data model
- separating OCR, image analysis, parsing, rendering, alarms, storage, and export
- merging or removing overlapping add-ons
- replacing CSS overrides with a deliberate layout system
- creating repeatable tests using many real timetable screenshots
- validating both OCR engines against the same expected output
- retesting every browser feature and edge case

That is a real project, not a quick cleanup.

Until somebody wants to spend that time, the sensible maintenance policy is:

> If it works, do not refactor it for emotional reasons.

Bug fixes may still be added. Small features may still be added. They may even be added as another override. This README will not pretend otherwise.

## Maintenance rules

If you decide to change the app despite the warnings:

1. Make a backup or a new branch first.
2. Test with several known screenshots, not just one.
3. Test all three OCR selections: Auto, forced PaddleOCR, and fast-only mode.
4. Check names, break types, break times, row alignment, and timeline labels.
5. Test paste, drag-and-drop, and file selection.
6. Test search, favorites, alarms, overlay, copy, TXT, and CSV.
7. Test on both desktop and mobile widths.
8. Do not casually reorder scripts or stylesheets.
9. Assume an ugly file may be holding the entire application together.
10. If your cleanup makes the code prettier but the extraction worse, revert it.

## Running it

ShiftReader is intended to run as a static web application. Host the repository with GitHub Pages or serve it using any normal static HTTP server.

For local testing, a simple server is safer than opening `index.html` directly because browsers may restrict local asset loading.

Example with Python:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Contributing

Contributions are welcome if they improve actual timetable extraction or usability without breaking existing behavior.

Please test changes against real screenshots and explain:

- what was broken
- which OCR mode was affected
- what changed
- which screenshots or layouts were tested
- whether script or stylesheet order changed

Large refactors should demonstrate that they preserve the current working behavior. "The code looks cleaner" is not sufficient if the timetable stops working.

## Final status

- Is it clean? No.
- Is it maintainable? Debatable.
- Does it contain patches that override other patches? Absolutely.
- Does it work? Somehow, yes.
- Is it being rewritten? No.

ShiftReader has reached the most stable phase of software development: **the owner is done touching it.**
