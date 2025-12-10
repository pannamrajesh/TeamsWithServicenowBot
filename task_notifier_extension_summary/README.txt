Task Notifier Extension (Manifest V3)
------------------------------------

What this zip contains:
- manifest.json
- background.js (service worker) -- polls every 5 minutes
- content_script.js (observes DOM for new task rows)
- offscreen.html + offscreen.js (plays notification.wav via Offscreen Document)
- notification.wav (short beep)
- icon128.png

Quick setup:
1. Edit background.js: replace SERVICE_NOW_API URL with your instance API endpoint.
   Example:
   https://yourinstance.servicenow.com/api/now/table/task?sysparm_query=active=true&sysparm_limit=1
   Make sure you have the right auth (cookie-based SSO or Bearer token). If you need Basic/Bearer auth,
   update fetch headers accordingly.

2. Edit content_script.js: set correct selectors for your ServiceNow UI:
   - taskListSelector (container holding tasks)
   - taskItemSelector (selector for each task row/item)

3. Load extension in Chrome (Developer mode):
   - Open chrome://extensions
   - Toggle 'Developer mode' ON
   - Click 'Load unpacked' and select the folder extracted from the zip OR
   - Click 'Pack extension' for distribution.

Notes about sound:
- This extension attempts to use the Chrome Offscreen Document API so the service worker can play audio.
- Offscreen documents are supported on recent Chrome versions. If offscreen is not available, sound may not play.
- If you want guaranteed sound across all cases, we can change the flow to open a small window/audio tab when a notification arrives (less ideal).

Limitations:
- Polling has up to 5-minute delay.
- If ServiceNow blocks cross-origin requests, polling from the background might fail — then use a small server/proxy or webhook.

If you want, I can:
- Customize the API call with your auth method.
- Detect multiple tasks, de-duplicate, or show multiple notifications.
- Package this into a single installable .zip (already provided) or a CRX.
