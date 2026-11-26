'use strict';
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN',
            files: ['size-sync.js', 'bridge.js', 'widget.js'] });
        await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    } catch (error) {
        await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#b42318' });
        await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
        await chrome.action.setTitle({ tabId: tab.id,
            title: `Không thể mở tiện ích: ${error.message}. Hãy mở tab job CVAT.` });
    }
});
