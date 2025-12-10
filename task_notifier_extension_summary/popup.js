// popup.js - simple UI to toggle notifications on/off
const checkbox = document.getElementById("toggleEnabled");
const testBtn = document.getElementById("testBtn");

function setUI(enabled) {
  checkbox.checked = enabled;
}

function getEnabledFromBackground() {
  chrome.runtime.sendMessage({ type: "GET_ENABLED" }, (resp) => {
    if (resp && resp.value !== undefined) setUI(!!resp.value);
  });
}

checkbox.addEventListener("change", () => {
  const val = checkbox.checked;
  chrome.runtime.sendMessage({ type: "SET_ENABLED", value: val }, (resp) => {
    // optional feedback
  });
});

testBtn.addEventListener("click", () => {
  // create a test notification via background (respects enabled flag)
  chrome.runtime.sendMessage({ type: "PLAY_SOUND" }, ()=>{});
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "Test: Task Notifier",
    message: checkbox.checked ? "Notifications enabled" : "Notifications are turned off"
  });
});

// initialize
getEnabledFromBackground();
