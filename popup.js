document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const compareBtn = document.getElementById('compareBtn');
  const statusEl = document.getElementById('status');

  captureBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        statusEl.textContent = 'No active tab';
        return;
      }
      const html = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML
      });

      const urlKey = 'history_' + tab.url;
      chrome.storage.local.get([urlKey], (result) => {
        const history = result[urlKey] || [];
        history.push({
          timestamp: Date.now(),
          html: html[0].result
        });
        chrome.storage.local.set({ [urlKey]: history }, () => {
          statusEl.textContent = `Baseline saved for: ${tab.url} at ${new Date().toLocaleString()}`;
        });
      });
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error capturing page: ' + err.message;
    }
  });

  compareBtn.addEventListener('click', async () => {
    try {
      statusEl.textContent = 'Comparing...';
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        statusEl.textContent = 'No active tab';
        return;
      }
      const html = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML
      });

      const urlKey = 'history_' + tab.url;
      chrome.storage.local.get([urlKey], (result) => {
        const history = result[urlKey] || [];
        if (history.length === 0) {
          statusEl.textContent = `No baseline history found for: ${tab.url}`;
          return;
        }

        const latestBaseline = history[history.length - 1].html;

        const baselineNorm = normalizeHtml(latestBaseline);
        const currentNorm = normalizeHtml(html[0].result);

        let ops = [];
        if (typeof diff_match_patch !== 'undefined') {
          try {
            const dmp = new diff_match_patch();
            const diffs = dmp.diff_main(baselineNorm, currentNorm);
            dmp.diff_cleanupSemantic(diffs);
            diffs.forEach(([op, data]) => {
              if (op === 0) ops.push({ type: 'equal', text: data });
              else if (op === -1) ops.push({ type: 'del', text: data });
              else if (op === 1) ops.push({ type: 'add', text: data });
            });
          } catch (e) {
            console.warn('diff_match_patch failed, falling back.', e);
            ops = fallbackChunkDiff(baselineNorm, currentNorm);
          }
        } else {
          ops = fallbackChunkDiff(baselineNorm, currentNorm);
        }

        showOutputFromOps(ops);
        statusEl.textContent = `Compared to baseline saved at ${new Date(history[history.length - 1].timestamp).toLocaleString()}`;
      });
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error comparing: ' + err.message;
    }
  });
});

// ---------- Helpers ----------

// Remove insignificant whitespace differences
function normalizeHtml(str) {
  return str
    .replace(/[ \t]+$/gm, '')  // remove trailing spaces/tabs per line
    .replace(/\r/g, '')        // remove carriage returns
    .replace(/\n\s*\n/g, '\n') // remove extra blank lines
    .trim();
}

// Fallback line-based diff
function fallbackChunkDiff(aStr, bStr) {
  const aLines = aStr.split(/\r?\n/);
  const bLines = bStr.split(/\r?\n/);
  const n = aLines.length, m = bLines.length;
  const table = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; --i) {
    for (let j = m - 1; j >= 0; --j) {
      if (aLines[i] === bLines[j]) table[i][j] = 1 + table[i + 1][j + 1];
      else table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      ops.push({ type: 'equal', text: aLines[i] + '\n' });
      i++; j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ type: 'del', text: aLines[i] + '\n' });
      i++;
    } else {
      ops.push({ type: 'add', text: bLines[j] + '\n' });
      j++;
    }
  }
  while (i < n) { ops.push({ type: 'del', text: aLines[i] + '\n' }); i++; }
  while (j < m) { ops.push({ type: 'add', text: bLines[j] + '\n' }); j++; }
  return ops;
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

// Inline word highlighting
function highlightWords(oldText, newText) {
  const tokenize = (s) => (s.match(/(?:\s+|[^\s]+)/g) || []);
  const oldT = tokenize(oldText);
  const newT = tokenize(newText);
  const n = oldT.length, m = newT.length;
  const table = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; --i) {
    for (let j = m - 1; j >= 0; --j) {
      if (oldT[i] === newT[j]) table[i][j] = 1 + table[i + 1][j + 1];
      else table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  let i = 0, j = 0;
  const oldHtmlParts = [];
  const newHtmlParts = [];
  while (i < n && j < m) {
    if (oldT[i] === newT[j]) {
      const t = escapeHtml(oldT[i]);
      oldHtmlParts.push(t);
      newHtmlParts.push(t);
      i++; j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      oldHtmlParts.push('<span class="word-del">' + escapeHtml(oldT[i]) + '</span>');
      i++;
    } else {
      newHtmlParts.push('<span class="word-add">' + escapeHtml(newT[j]) + '</span>');
      j++;
    }
  }
  while (i < n) {
    oldHtmlParts.push('<span class="word-del">' + escapeHtml(oldT[i]) + '</span>');
    i++;
  }
  while (j < m) {
    newHtmlParts.push('<span class="word-add">' + escapeHtml(newT[j]) + '</span>');
    j++;
  }
  return { old: oldHtmlParts.join(''), new: newHtmlParts.join('') };
}

// Show side-by-side output
function showOutputFromOps(ops) {
  const oldEl = document.getElementById('output-old');
  const newEl = document.getElementById('output-new');
  if (!oldEl || !newEl) return;
  oldEl.innerHTML = '';
  newEl.innerHTML = '';

  ops.forEach(op => {
    const oldDiv = document.createElement('div');
    const newDiv = document.createElement('div');

    if (op.type === 'equal') {
      oldDiv.className = 'diff-equal';
      newDiv.className = 'diff-equal';
      oldDiv.innerHTML = escapeHtml(op.text);
      newDiv.innerHTML = escapeHtml(op.text);
    } else if (op.type === 'add') {
      const highlighted = highlightWords('', op.text);
      oldDiv.className = 'diff-equal';
      oldDiv.innerHTML = '';
      newDiv.className = 'diff-add';
      newDiv.innerHTML = highlighted.new;
    } else if (op.type === 'del') {
      const highlighted = highlightWords(op.text, '');
      oldDiv.className = 'diff-del';
      oldDiv.innerHTML = highlighted.old;
      newDiv.className = 'diff-equal';
      newDiv.innerHTML = '';
    }
    oldEl.appendChild(oldDiv);
    newEl.appendChild(newDiv);
  });
}
