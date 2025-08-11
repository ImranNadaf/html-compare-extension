// content.js

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'GET_HTML') {
    try {
      // Serialize the document to HTML. Using outerHTML on documentElement
      const html = document.documentElement.outerHTML;
      sendResponse({ok:true, html, url: location.href});
    } catch (err) {
      sendResponse({ok:false, error: String(err)});
    }
    // Return true to indicate we'll send response asynchronously (not needed here but safe)
    return true;
  }
});