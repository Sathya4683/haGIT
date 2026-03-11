// haGIT Background Service Worker (Manifest V3)
// Minimal — all logic lives in the popup React app.
// This file exists to satisfy the manifest requirement.

chrome.runtime.onInstalled.addListener(() => {
  console.log("[haGIT] Extension installed.");
});

// Keep alive ping — MV3 service workers can be killed aggressively
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ping") {
    sendResponse({ pong: true });
  }
});
