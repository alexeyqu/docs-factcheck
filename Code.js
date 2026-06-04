const N8N_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('n8n-webhook-url');

function onOpen() {
  DocumentApp.getUi()
    .createMenu('🛠️ Инструменты')
    .addItem('🔍 Подсветить факты для фактчекинга', 'runFactCheck')
    .addToUi();
}

function runFactCheck() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();

  const fullText = body.getText();
  if (!fullText.trim()) {
    DocumentApp.getUi().alert('Документ пуст.');
    return;
  }

  const facts = _callN8N(fullText.trim());
  if (!facts) return;

  _highlightFacts(body, facts);
  DocumentApp.getUi().alert('Факты успешно подсвечены в тексте!');
}

function _callN8N(text) {
  if (!N8N_WEBHOOK_URL) {
    DocumentApp.getUi().alert(
      'Не задан URL вебхука n8n. ' +
        'Добавьте Script Property "n8n-webhook-url" в настройках проекта.'
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
      'Ошибка n8n: HTTP ' +
        response.getResponseCode() +
        '\n\n' +
        response.getContentText()
    );
    return null;
  }

  try {
    const facts = JSON.parse(response.getContentText());
    if (!Array.isArray(facts)) throw new Error('ожидается массив');
    return facts;
  } catch (e) {
    DocumentApp.getUi().alert(
      'Ошибка парсинга ответа n8n: ' +
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
      console.log(`Пропущен факт ${index + 1}: отсутствует text или reason`);
      return;
    }

    const found = body.findText(fact.text.trim());
    if (!found) {
      console.log(`Не найден текст для факта ${index + 1}: "${fact.text}"`);
      return;
    }

    const el = found.getElement();
    if (el.getType() !== DocumentApp.ElementType.TEXT) return;

    const textEl = el.asText();
    const start = found.getStartOffset();
    const end = found.getEndOffsetInclusive();

    textEl.setBackgroundColor(start, end, '#FFFF00');

    let comment = ` [🔍 Факт-чек: ${fact.reason}`;
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
    console.log(`Обработан факт ${index + 1}: "${fact.text}"`);
  });

  if (processed === 0) {
    DocumentApp.getUi().alert(
      'Не удалось найти в тексте ни одного из указанных фактов.'
    );
  } else {
    console.log(`Успешно обработано ${processed} из ${facts.length} фактов`);
  }
}
