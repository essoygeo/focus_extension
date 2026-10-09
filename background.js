/**
 * background.js - Manifest V3 Service Worker for Focus extension
 * Handles dynamic site blocking rules, background timers with chrome.alarms, and interactive notifications.
 */

import { Storage } from './utils/storage.js';

// Initialize extension on install or update
chrome.runtime.onInstalled.addListener(async () => {
  await Storage.initializeDefaults();
  await updateSiteBlocking();
  await syncAllTaskAlarms();
});

// Listener for startup
chrome.runtime.onStartup.addListener(async () => {
  await updateSiteBlocking();
  await syncAllTaskAlarms();
});

// Listen to storage changes to update site blocking and alarms reactively
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local') {
    if (changes.tasks || changes.blockedSites || changes.blockMode) {
      await updateSiteBlocking();
    }
    if (changes.tasks) {
      await syncAllTaskAlarms();
    }
  }
});

/**
 * Synchronize declarativeNetRequest dynamic rules based on active tasks & site settings
 */
async function updateSiteBlocking() {
  const tasks = await Storage.getTasks();
  const settings = await Storage.getSettings();

  const uncompletedTasks = tasks.filter(t => t.status !== 'done');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

  let shouldBlock = false;
  if (settings.blockMode === 'only_in_progress') {
    shouldBlock = inProgressTasks.length > 0;
  } else {
    // default 'any_uncompleted'
    shouldBlock = uncompletedTasks.length > 0;
  }

  // Get current dynamic rules to clear them before re-adding
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(r => r.id);

  if (!shouldBlock) {
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }
    return;
  }

  const enabledSites = settings.blockedSites.filter(s => s.enabled && s.domain.trim().length > 0);
  if (enabledSites.length === 0) {
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }
    return;
  }

  const redirectUrl = chrome.runtime.getURL('blocked/blocked.html');
  const newRules = enabledSites.map((site, index) => {
    let domain = site.domain.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''); // clean protocol or path

    return {
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: redirectUrl }
      },
      condition: {
        requestDomains: [domain],
        resourceTypes: ['main_frame']
      }
    };
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: newRules
  });
}

/**
 * Sync chrome.alarms for all active tasks
 */
async function syncAllTaskAlarms() {
  const tasks = await Storage.getTasks();
  const existingAlarms = await chrome.alarms.getAll();
  
  // Track valid alarm names for active tasks
  const activeAlarmNames = new Set();

  const now = Date.now();

  for (const task of tasks) {
    if (task.status === 'done') continue;

    // Check remaining time logic
    let remainingMs = 0;
    const durationMs = (task.durationMinutes || 25) * 60 * 1000;

    if (task.status === 'in_progress') {
      const currentElapsed = (task.elapsedMsBeforePause || 0) + (now - (task.startTime || now));
      remainingMs = durationMs - currentElapsed;

      // Target end alarm
      if (remainingMs > 0) {
        const endAlarmName = `end_${task.id}`;
        activeAlarmNames.add(endAlarmName);

        const scheduledTime = now + remainingMs;
        chrome.alarms.create(endAlarmName, { when: scheduledTime });

        // 10 minutes before alarm if configured
        if (task.reminders?.includes('before_10m')) {
          const tenMinMs = 10 * 60 * 1000;
          if (remainingMs > tenMinMs) {
            const remind10mName = `remind_10m_${task.id}`;
            activeAlarmNames.add(remind10mName);
            chrome.alarms.create(remind10mName, { when: scheduledTime - tenMinMs });
          }
        }
      } else {
        // Already overdue while in_progress
        if (task.status !== 'overdue') {
          task.status = 'overdue';
          await updateTaskStatusInStorage(task.id, 'overdue');
        }
      }
    }

    // Periodic reminder after end if overdue & configured
    if (task.status === 'overdue' && task.reminders?.includes('repeat_5m_after')) {
      const repeatAlarmName = `repeat_5m_${task.id}`;
      activeAlarmNames.add(repeatAlarmName);
      const alarmExists = existingAlarms.some(a => a.name === repeatAlarmName);
      if (!alarmExists) {
        chrome.alarms.create(repeatAlarmName, { periodInMinutes: 5 });
      }
    }
  }

  // Clear obsolete alarms
  for (const alarm of existingAlarms) {
    if (!activeAlarmNames.has(alarm.name)) {
      chrome.alarms.clear(alarm.name);
    }
  }
}

/**
 * Create a styled native notification
 */
function notify(id, { title, message, contextMessage, buttons, priority = 1, requireInteraction = false }) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title,
    message,
    contextMessage,
    buttons,
    priority,
    requireInteraction
  });
}

/**
 * Handle Fired Alarms
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const name = alarm.name;
  const tasks = await Storage.getTasks();

  if (name.startsWith('end_')) {
    const taskId = name.replace('end_', '');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== 'done') {
      task.status = 'overdue';
      await Storage.saveTasks(tasks);

      // Notification at end
      if (task.reminders?.includes('at_end')) {
        notify(`notif_end_${task.id}`, {
          title: '⏱️ Temps écoulé !',
          message: task.title,
          contextMessage: 'La durée allouée est terminée. Terminez la tâche ou reportez-la de 5 minutes.',
          buttons: [
            { title: '✅ Terminer' },
            { title: '⏱️ Reporter 5 min' }
          ],
          priority: 2,
          requireInteraction: true
        });
      }
    }
  } else if (name.startsWith('remind_10m_')) {
    const taskId = name.replace('remind_10m_', '');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status === 'in_progress') {
      notify(`notif_10m_${task.id}`, {
        title: '⚠️ Plus que 10 minutes',
        message: task.title,
        contextMessage: 'Il vous reste 10 minutes. Gardez le rythme pour terminer à temps.',
        priority: 1
      });
    }
  } else if (name.startsWith('repeat_5m_')) {
    const taskId = name.replace('repeat_5m_', '');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== 'done') {
      notify(`notif_repeat_${task.id}`, {
        title: '🔔 Tâche en retard',
        message: task.title,
        contextMessage: 'Cette tâche n\'est pas encore terminée. Terminez-la ou reportez-la.',
        buttons: [
          { title: '✅ Terminer' },
          { title: '⏱️ Reporter 5 min' }
        ],
        priority: 2,
        requireInteraction: true
      });
    }
  }
});

/**
 * Handle Notification Action Button Clicks
 */
chrome.notifications.onButtonClicked.addListener(async (notifId, buttonIndex) => {
  const taskId = notifId.replace(/^notif_(?:end|10m|repeat)_/, '');
  const tasks = await Storage.getTasks();
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    chrome.notifications.clear(notifId);
    return;
  }

  if (buttonIndex === 0) {
    // "Terminer" clicked
    task.status = 'done';
    task.completedAt = Date.now();
    await Storage.saveTasks(tasks);
    notify(`notif_done_${task.id}`, {
      title: '✅ Tâche terminée',
      message: task.title,
      contextMessage: 'Bravo ! Une tâche de plus d\'accomplie. Continuez sur votre lancée.',
      priority: 0
    });
  } else if (buttonIndex === 1) {
    // "Reporter de 5 minutes" clicked
    task.durationMinutes = (task.durationMinutes || 25) + 5;
    task.status = 'in_progress';
    task.startTime = Date.now();
    await Storage.saveTasks(tasks);
    notify(`notif_snooze_${task.id}`, {
      title: '⏱️ Tâche reportée',
      message: task.title,
      contextMessage: 'Votre échéance a été prolongée de 5 minutes. Bon courage !',
      priority: 0
    });
  }

  chrome.notifications.clear(notifId);
});

async function updateTaskStatusInStorage(taskId, newStatus) {
  const tasks = await Storage.getTasks();
  const t = tasks.find(x => x.id === taskId);
  if (t) {
    t.status = newStatus;
    await Storage.saveTasks(tasks);
  }
}

// Allow direct messaging from blocked page or popup if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'complete_task') {
    Storage.getTasks().then(async tasks => {
      const task = tasks.find(t => t.id === message.taskId);
      if (task) {
        task.status = 'done';
        task.completedAt = Date.now();
        await Storage.saveTasks(tasks);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    });
    return true; // Keep channel open for async response
  }
});
