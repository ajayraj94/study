# Progress Export / Import (RAM-only)

Progress is kept in RAM only. There is no Python server and no localStorage,
sessionStorage or IndexedDB. Export the JSON before closing or reloading the
browser; unexported progress is lost.

## Export

1. Click **☁️ Sync** (or the **⚡ In RAM** pill) in the header.
2. Click **⬇️ Export Progress JSON File**.
3. The file is downloaded as `SSC_CGL_Progress_YYYY-MM-DD.json`.

## What the export contains

- Every question record: status, selected option, ✅ right / ❌ wrong /
  ⏭ skipped, 🐢 >60s / ⚡ <60s, time spent, bookmark, doubt, due, SRS fields,
  last attempt
- All submitted mock results with section stats
- All sprint-day checkmarks
- Stats, marks scheme, version, export timestamp

## Import

1. Open the app on the target device.
2. Click **☁️ Sync**.
3. Click **📂 Choose Sync .JSON File to Import** and select the exported file.

Import merges question records into RAM and restores mock results and sprint
days without a page reload.

## Notes

- A full export contains all 4,500 question records, so importing it on a
  device with existing progress effectively overwrites each record's fields.
- The exported file is the only permanent save. Keep it somewhere safe until
  the next export.
