const N8N_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('n8n-webhook-url');

function onOpen() {
  DocumentApp.getUi()
    .createMenu('🛠️ Tools')
    .addItem('🔍 Highlight facts for fact-checking', 'runFactCheck')
    .addToUi();
}

function runFactCheck() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();

  const fullText = body.getText();
  if (!fullText.trim()) {
    DocumentApp.getUi().alert('The document is empty.');
    return;
  }

  const facts = _callN8N(fullText.trim());
  if (!facts) return;

  _highlightFacts(body, facts);
  DocumentApp.getUi().alert('Facts highlighted successfully!');
}

function _callN8N(text) {
  if (!N8N_WEBHOOK_URL) {
    DocumentApp.getUi().alert(
      'n8n webhook URL is not set. ' +
        'Add the Script Property "n8n-webhook-url" in your project settings.'
    );
    return null;
  }

  const response = UrlFetchApp.fetch(N8N_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    DocumentApp.getUi().alert(
      'n8n error: HTTP ' +
        response.getResponseCode() +
        '\n\n' +
        response.getContentText()
    );
    return null;
  }

  try {
    const facts = JSON.parse(response.getContentText());
    if (!Array.isArray(facts)) throw new Error('expected an array');
    return facts;
  } catch (e) {
    DocumentApp.getUi().alert(
      'Failed to parse n8n response: ' +
        e.message +
        '\n\n' +
        response.getContentText()
    );
    return null;
  }
}

function _highlightFacts(body, facts) {
  let processed = 0;

  facts.forEach((fact, index) => {
    if (!fact.text || !fact.reason) {
      console.log(`Skipping fact ${index + 1}: missing text or reason`);
      return;
    }

    const found = body.findText(fact.text.trim());
    if (!found) {
      console.log(`Could not find text for fact ${index + 1}: "${fact.text}"`);
      return;
    }

    const el = found.getElement();
    if (el.getType() !== DocumentApp.ElementType.TEXT) return;

    const textEl = el.asText();
    const start = found.getStartOffset();
    const end = found.getEndOffsetInclusive();

    textEl.setBackgroundColor(start, end, '#FFFF00');

    let comment = ` [🔍 Fact-check: ${fact.reason}`;
    if (fact.context && fact.context.trim()) {
      comment += ` | 📝 ${fact.context}`;
    }
    comment += ']';

    textEl.insertText(end + 1, comment);

    const commentEnd = end + comment.length;
    textEl.setForegroundColor(end + 1, commentEnd, '#FF6B35');
    textEl.setFontSize(end + 1, commentEnd, 10);
    textEl.setItalic(end + 1, commentEnd, true);

    processed++;
    console.log(`Processed fact ${index + 1}: "${fact.text}"`);
  });

  if (processed === 0) {
    DocumentApp.getUi().alert(
      'None of the returned facts could be located in the document text.'
    );
  } else {
    console.log(`Successfully processed ${processed} of ${facts.length} facts`);
  }
}
