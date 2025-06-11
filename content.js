/* ===== content.js ===== */
// Floating button for manual paste on Threads
(function () {
  const button = document.createElement("button");
  button.textContent = "📋 Paste Generated Thread";
  button.className = "thread-generator-button";
  button.onclick = () => {
    chrome.storage.local.get(["generatedThread"], function (result) {
      const input = document.querySelector("textarea");
      if (input && result.generatedThread) {
        input.value = result.generatedThread;
      }
    });
  };
  document.body.appendChild(button);
})();
