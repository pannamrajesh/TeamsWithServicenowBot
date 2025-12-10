/**
 * offscreen.js
 * Listens for PLAY_SOUND message and plays the embedded notification.wav.
 */
const audio = document.getElementById("notifAudio");

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "PLAY_SOUND") {
    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && p.catch) p.catch(e => console.warn("audio.play() failed:", e));
    } catch (e) {
      console.warn("play error", e);
    }
  }
});

// notify background we're ready
chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }).catch(()=>{});
