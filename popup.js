/* === popup.js (tambahan fitur Gemini + reset folder) === */
document.addEventListener("DOMContentLoaded", () => {
  const foldersContainer = document.getElementById("folders");
  const folderSelect = document.getElementById("folderSelect");

  chrome.storage.local.get(["apikey", "darkMode", "threadFolders"], (data) => {
    if (data.apikey) {
      document.getElementById("apikey").value = data.apikey;
      document.getElementById("saveKey").checked = true;
    }

    if (data.darkMode) {
      document.body.classList.add("dark");
      document.getElementById("themeToggle").checked = true;
    }

    if (data.threadFolders) {
      renderFolders(data.threadFolders);
      populateFolderOptions(data.threadFolders);
    }
  });

  document.getElementById("themeToggle").addEventListener("change", () => {
    const isDark = document.getElementById("themeToggle").checked;
    document.body.classList.toggle("dark", isDark);
    chrome.storage.local.set({ darkMode: isDark });
  });

  document.getElementById("addFolder").addEventListener("click", () => {
    const name = document.getElementById("newFolder").value.trim();
    if (!name) return;
    chrome.storage.local.get(["threadFolders"], (data) => {
      const folders = data.threadFolders || {};
      if (!folders[name]) folders[name] = [];
      chrome.storage.local.set({ threadFolders: folders }, () => {
        populateFolderOptions(folders);
        document.getElementById("newFolder").value = "";
      });
    });
  });

  document.getElementById("deleteFolder").addEventListener("click", () => {
    const selected = folderSelect.value;
    if (!selected) return;
    chrome.storage.local.get(["threadFolders"], (data) => {
      const folders = data.threadFolders || {};
      delete folders[selected];
      chrome.storage.local.set({ threadFolders: folders }, () => {
        populateFolderOptions(folders);
        renderFolders(folders);
      });
    });
  });

  document.getElementById("resetFolder").addEventListener("click", () => {
    const selected = folderSelect.value;
    if (!selected) return;
    chrome.storage.local.get(["threadFolders"], (data) => {
      const folders = data.threadFolders || {};
      folders[selected] = [];
      chrome.storage.local.set({ threadFolders: folders }, () => {
        renderFolders(folders);
      });
    });
  });

  document.getElementById("generate").addEventListener("click", async () => {
    const topic = document.getElementById("topic").value.trim();
    const style = document.getElementById("style").value;
    const charLimit = document.getElementById("charlimit").value.trim();
    const key = document.getElementById("apikey").value.trim();
    const saveKey = document.getElementById("saveKey").checked;
    const folder = folderSelect.value;

    if (!topic || !key || !folder) return alert("Lengkapi semua data termasuk pilih folder.");
    if (saveKey) chrome.storage.local.set({ apikey: key });

    let prompt = `Tulis thread tentang: ${topic} dengan gaya ${style}. Gunakan emoji bila perlu. Gunakan paragraf baru jika dibutuhkan. Hapus tanda "/". Format thread per baris.`;
    if (charLimit) prompt += ` Batasi maksimal ${charLimit} karakter.`;

    try {
      let response;
      if (key.startsWith("AIza")) {
        // Gemini API
        response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }]
          })
        });
        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal generate.";
        handleThreadResult(content, folder);
      } else {
        // OpenAI API
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a helpful thread writer." },
              { role: "user", content: prompt }
            ]
          })
        });
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "Gagal generate.";
        handleThreadResult(content, folder);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Gagal mengambil data dari API");
    }
  });

  function handleThreadResult(content, folder) {
    const tweets = content.split(/\n+/).map(t => t.replace(/\d+\//g, "").trim()).filter(Boolean);
    chrome.storage.local.get(["threadFolders"], (data) => {
      const folders = data.threadFolders || {};
      folders[folder] = [...(folders[folder] || []), ...tweets];
      chrome.storage.local.set({ threadFolders: folders }, () => {
        renderFolders(folders);
      });
    });
  }

  function populateFolderOptions(folders) {
    folderSelect.innerHTML = Object.keys(folders).map(name => `<option value="${name}">${name}</option>`).join("");
  }

  function renderFolders(folders) {
    const container = document.getElementById("folders");
    container.innerHTML = "";

    Object.entries(folders).forEach(([folder, tweets]) => {
      const section = document.createElement("details");
      section.className = "folder";
      section.innerHTML = `
        <summary><i class="fa-solid fa-folder"></i> ${folder}</summary>
        <div class="tweets">
          ${tweets.map(tweet => `
            <div class="tweet-box">
              <div class="tweet-text">${tweet}</div>
              <button class="copy-btn" data-text="${tweet}">Copy</button>
            </div>`).join("")}
        </div>
      `;
      container.appendChild(section);
    });

    container.querySelectorAll(".copy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.text);
        btn.innerHTML = "Copied";
        setTimeout(() => btn.innerHTML = "Copy", 1500);
      });
    });
  }
});