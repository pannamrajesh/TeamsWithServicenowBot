// background.js - service worker (updated with global enable/disable toggle)
const POLL_INTERVAL_MINUTES = 5;
const SERVICE_NOW_API = "https://yourinstance.servicenow.com/api/now/table/task?sysparm_limit=1";
const ENABLE_KEY = "enabled_notifications";

// default enabled value
async function isEnabled() {
  const data = await chrome.storage.local.get(ENABLE_KEY);
  if (data[ENABLE_KEY] === undefined) return true; // default ON
  return data[ENABLE_KEY];
}

async function setEnabled(val) {
  const obj = {};
  obj[ENABLE_KEY] = val;
  await chrome.storage.local.set(obj);
  // Inform background to start/stop polling
  if (val) {
    startPolling();
  } else {
    stopPolling();
  }
}

let pollAlarmCreated = false;

function startPolling() {
  if (!pollAlarmCreated) {
    chrome.alarms.create("pollTasks", { periodInMinutes: POLL_INTERVAL_MINUTES });
    pollAlarmCreated = true;
  }
  // ensure offscreen document exists for sound
  ensureOffscreen().catch(()=>{});
}

function stopPolling() {
  chrome.alarms.clear("pollTasks");
  pollAlarmCreated = false;
  // try to close offscreen document if present
  if (chrome.offscreen && chrome.offscreen.hasDocument) {
    chrome.offscreen.hasDocument().then((exists) => {
      if (exists) {
        chrome.offscreen.closeDocument().catch(()=>{});
      }
    }).catch(()=>{});
  }
}

// Ensure last seen key namespace per host
async function getLastId(key) {
  const data = await chrome.storage.local.get(key);
  return data[key];
}
async function setLastId(key, id) {
  const obj = {};
  obj[key] = id;
  await chrome.storage.local.set(obj);
}

async function ensureOffscreen() {
  try {
    const exists = await chrome.offscreen.hasDocument();
    if (!exists) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play notification sound when a new task arrives."
      });
    }
  } catch (e) {
    console.warn("offscreen API error or unsupported:", e);
  }
}

function playSound() {
  // Tell offscreen document to play the sound
  chrome.runtime.sendMessage({ type: "PLAY_SOUND" }).catch(()=>{});
}

function notify(site, title, body, url) {
  // before notifying, check enabled flag
  isEnabled().then((enabled) => {
    if (!enabled) return;
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: site + ": " + title,
      message: body,
      contextMessage: url || ""
    }, () => {
      // Play sound (attempt using offscreen)
      playSound();
    });
  }).catch((e)=>{console.warn("isEnabled error", e);});
}

// pollServiceNow - notify once summarizing multiple new tasks
async function pollServiceNow() {
  try {
    const enabled = await isEnabled();
    if (!enabled) return;

    // Fetch the latest few tasks (increase sysparm_limit if needed)
    const resp = await fetch(SERVICE_NOW_API + "&sysparm_limit=20", {
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    if (!resp.ok) {
      console.warn("ServiceNow poll returned non-OK:", resp.status);
      return;
    }
    const data = await resp.json();
    const tasks = data.result || [];
    if (tasks.length === 0) return;

    const hostKey = "lastId_servicenow";
    const lastId = await getLastId(hostKey); // may be undefined on first run

    // Collect tasks that are newer than lastId.
    // Assumes tasks array is sorted newest-first. If not, sort by sys_created_on descending.
    const newTasks = [];
    if (!lastId) {
      // First run: only notify about the single newest to avoid flood
      newTasks.push(tasks[0]);
    } else {
      for (const task of tasks) {
        if (task.sys_id === lastId) break;
        newTasks.push(task);
      }
    }

    if (newTasks.length === 0) return;

    // Summary notification for all new tasks
    const count = newTasks.length;
    const newest = newTasks[0];
    const title = count === 1 ? (newest.short_description || "New Task") : `${count} new tasks`;
    const body = count === 1 ? (`Assigned to: ${newest.assigned_to || 'unknown'}`) :
                 (`1) ${newest.short_description?.slice(0,80) || '—'}${count>1 ? `\n+ ${count-1} more` : ''}`);

    notify("ServiceNow", title, body, "");

    // Update lastSeen to the current newest task's ID to avoid duplicate notifications
    await setLastId(hostKey, tasks[0].sys_id);

  } catch (err) {
    console.error("pollServiceNow error:", err);
  }
}


// Listen for content-script messages (DOM-detected)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "NEW_TASK_DETECTED") {
    notify(msg.site || "Site", msg.title || "New Task", msg.body || "", msg.url || "");
  }
});

// Messages from popup to toggle on/off
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "SET_ENABLED") {
    setEnabled(!!message.value).then(()=>sendResponse({ok:true}));
    return true; // keep channel open for async response
  }
  if (message && message.type === "GET_ENABLED") {
    isEnabled().then((v)=>sendResponse({value:v}));
    return true;
  }
  if (message && message.type === "PLAY_SOUND") {
    // forward to offscreen
    playSound();
    sendResponse({ok:true});
    return true;
  }
  if (message && message.type === "OFFSCREEN_READY") {
    sendResponse({ok: true});
    return true;
  }
});

// On install: set alarm and try to create offscreen doc if enabled
chrome.runtime.onInstalled.addListener(async () => {
  const enabled = await isEnabled();
  if (enabled) startPolling();
});

// On startup (service worker start)
(async ()=>{
  const enabled = await isEnabled();
  if (enabled) startPolling();
  // Try an initial poll once
  pollServiceNow();
})();

// On alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pollTasks") {
    pollServiceNow();
  }
});
