# Intake scaffold for Harry Han

Use this folder as the user-facing entrance for collecting target-person materials before import.

- Starter manifest: profiles/harry-han/imports/materials.template.json
- Sample text placeholder: profiles/harry-han/imports/sample.txt
- Import after editing: node src/index.js import intake --person 'harry-han' --refresh-foundation

Suggested flow:
1. Replace sample.txt with a real writing sample or point the manifest at real files.
2. Copy the entryTemplates from materials.template.json into entries and fill in real content.
3. Run the import command above to ingest materials and refresh foundation drafts.

Path rule:
- `materials.template.json` resolves every `file` relative to `profiles/harry-han/imports/`.
- Keep local screenshots or attachments next to `sample.txt` or inside a small subdirectory like `profiles/harry-han/imports/images/`.
- Example: if you save a screenshot at `profiles/harry-han/imports/images/chat.png`, use `images/chat.png` inside the manifest.

Starter entry examples:
```json
[
  {
    "type": "text",
    "file": "sample.txt",
    "notes": "long-form writing sample"
  },
  {
    "type": "message",
    "text": "Ship the thin slice first, then tighten it with real feedback.",
    "notes": "representative short message"
  },
  {
    "type": "talk",
    "text": "If we can learn it in one run today, that beats polishing a big plan all week.",
    "notes": "voice memo transcript"
  },
  {
    "type": "screenshot",
    "file": "images/chat.png",
    "notes": "chat screenshot"
  }
]
```

Recommended helper commands:
- refresh this intake scaffold: node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.'
- edit target-profile metadata without refreshing drafts: node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.'
- sync target-profile metadata and refresh drafts: node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.' --refresh-foundation

Direct import commands:
- text: node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation
- message: node src/index.js import message --person harry-han --text <message> --refresh-foundation
- talk: node src/index.js import talk --person harry-han --text <snippet> --refresh-foundation
- screenshot: node src/index.js import screenshot --person harry-han --file <image.png> --refresh-foundation
- manifest: node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation

Custom notes:
<!-- man-skill:intake-custom-notes:start -->
Add notes about where future materials should come from.
<!-- man-skill:intake-custom-notes:end -->
