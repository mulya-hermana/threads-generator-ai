chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "schedule") {
    const when = new Date(msg.time).getTime();
    const now = Date.now();
    const delay = (when - now) / 60000;
    if (delay > 0) {
      chrome.alarms.create("scheduledPost", { delayInMinutes: delay });
    }
  } else if (msg.type === "postNow") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          chrome.storage.local.get("generatedThreads", (data) => {
            const textarea = document.querySelector("textarea");
            if (textarea && data.generatedThreads?.[0]?.lines) {
              textarea.value = data.generatedThreads[0].lines.join("\n\n");
            }
          });
        }
      });
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "scheduledPost") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Threads Scheduler",
      message: "Saatnya posting thread kamu! Sudah otomatis dipaste ke Threads."
    });

    chrome.runtime.sendMessage({ type: "postNow" });
  }
});
