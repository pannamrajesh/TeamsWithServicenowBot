/**
 * content_script.js
 * MutationObserver enhanced to include sys_id extraction (if present) and send it to background for deduplication.
 * Update selectors to match your instance.
 */
function sendNotificationToBackground(payload) {
  chrome.runtime.sendMessage(payload);
}

// TODO: set these to match your ServiceNow DOM
const taskListSelector = ".sn-task-list, .task-list, #task_table";
const taskItemSelector = ".task-item, .list-row, .list-record-row";

function extractSysIdFromNode(node) {
  // common attribute possibilities: data-sys-id, data-id, data-record-id, or anchor href containing sys_id
  if (!node) return null;
  if (node.getAttribute) {
    const attrs = ["data-sys-id", "data-id", "data-record-id", "data-row-id"];
    for (const a of attrs) {
      const v = node.getAttribute(a);
      if (v) return v;
    }
  }
  // try to find link with sys_id in href
  const link = node.querySelector ? node.querySelector("a[href*='sys_id']") : null;
  if (link && link.href) {
    const m = link.href.match(/sys_id=([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    const m2 = link.href.match(/\/([a-zA-Z0-9]{32})/);
    if (m2) return m2[1];
  }
  return null;
}

function handleAddedNode(node) {
  if (node.nodeType !== 1) return;
  let taskNode = null;
  if (node.matches && node.matches(taskItemSelector)) {
    taskNode = node;
  } else if (node.querySelector) {
    taskNode = node.querySelector(taskItemSelector);
  }
  if (!taskNode) return;

  const title = (taskNode.innerText || "").trim().slice(0,120);
  const sysId = extractSysIdFromNode(taskNode);
  const payload = {
    type: "NEW_TASK_DETECTED",
    site: document.location.hostname,
    title: title || "New task",
    body: "New task appeared in UI",
    url: window.location.href
  };
  if (sysId) payload.id = sysId;
  sendNotificationToBackground(payload);
}

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      try { handleAddedNode(node); } catch(e){ console.warn(e); }
    }
  }
});

function setupObserver() {
  const container = document.querySelector(taskListSelector);
  if (!container) return;
  observer.observe(container, { childList: true, subtree: true });
}

// try immediate and delayed setup (SPA)
setupObserver();
setTimeout(setupObserver, 3000);
