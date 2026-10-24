# study

Practice trackers (open the `.html` files directly, or through the HTML Reader plugin in Obsidian).

## Syncing marks between iPad and desktop

The marks, difficulty tags (Easy / Mod / High) and comments you add inside these trackers are kept in
the browser storage of the device you are using — they are **not** written into the `.html` file, so a
Git commit of the vault does not carry them. Use the **☁️ Sync** button in each tracker's toolbar:

1. On the device you just studied on: **☁️ Sync → Copy all** (or *Download file*).
2. Paste the JSON into a note in the vault, e.g. `_sync/phrasal-idioms.json`, then commit + push
   with obsidian-git.
3. On the other device: pull, open the same tracker, **☁️ Sync**, replace the text with the file's
   content (paste, or *Load file*) and press **Merge**.

*Merge* keeps anything filled in on either side and adds items that only exist in the file;
*Replace all* makes the pasted file win completely. Which storage keys each tracker syncs:

| Tracker | Keys |
| --- | --- |
| phrasal-idioms | `phrasalIdiomsTrackerV1`, `phrasalIdiomsSrPrefs` |
| Speed Ranker | `srqb_v1`, `srqb_notes_v1` |
| 1100 Homonyms | `homonymsMasterProgressV1` |
| Zero-Gap Grammar | `grammarMasterProgressV5` |
| doubtful vocab | `vocabMasteryV1`, `vocabEditsV1` |
