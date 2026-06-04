# docs-factcheck

A Google Apps Script add-on for Google Docs that sends article text to an **n8n webhook** for fact-checking analysis, then highlights the returned claims inline with editorial annotations.

All AI logic lives in n8n. The AppScript contains only the Google Docs integration and the n8n client.

Originally developed for [Системный Блок](https://sysblok.ru), a Russian-language digital-technology journal.

---

## How it works

```
Google Doc  →  Apps Script  →  n8n webhook  →  (AI / any logic)
                    ↑                                    |
                    └────── [{text, reason, context}] ──┘
```

1. The editor triggers **🔍 Highlight facts for fact-checking** from the custom menu.
2. The script POSTs `{ "text": "<document text>" }` to the configured n8n webhook.
3. n8n runs whatever analysis it wants and returns a JSON array:
   ```json
   [
     { "text": "claim from the article", "reason": "assessment", "context": "supporting info" }
   ]
   ```
4. The script **highlights each matched phrase yellow** and inserts a small orange italic annotation right after it.

## Screenshot

<!-- Add a screenshot of the result here -->

## Files

| File | Purpose |
|------|---------|
| `Code.js` | Menu registration, n8n HTTP call, document highlighting |
| `appsscript.json` | Apps Script project manifest (runtime V8, Stackdriver logging) |

## Setup

### 1. Create (or open) the Apps Script project

- Open your Google Doc → **Extensions → Apps Script**
- Or use [clasp](https://github.com/google/clasp) to push from this repo:
  ```bash
  npm install -g @google/clasp
  clasp login
  clasp push
  ```

### 2. Configure the n8n webhook URL

Apps Script stores configuration in **Script Properties** — they are not committed to version control and are not copied when the document is duplicated.

1. In the Apps Script editor go to **Project Settings** (gear icon)
2. Scroll to **Script Properties** → **Add script property**
3. Set:
   - Key: `n8n-webhook-url`
   - Value: your n8n webhook URL (e.g. `https://your-n8n.example.com/webhook/...`)

### 3. Reload the document

After pushing, refresh your Google Doc — the **🛠️ Инструменты** menu will appear.

## n8n Workflow

The n8n workflow receives `{ "text": "..." }`, runs the AI analysis, and must return a **200 response** with a JSON array in the body:

```json
[
  {
    "text": "exact phrase from the article to highlight",
    "reason": "short editorial assessment",
    "context": "optional supporting context"
  }
]
```

`text` must be a verbatim substring of the document — the script uses it to locate and highlight the phrase.

<!-- Add a screenshot of the n8n workflow here -->

## License

[MIT](LICENSE)
