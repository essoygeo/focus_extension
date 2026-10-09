/**
 * blocked/blocked.js - Focus Blocked Page Controller
 */

import { Storage } from '../utils/storage.js';

let tasks = [];
let settings = {};

const blockedTaskList = document.getElementById('blockedTaskList');
const unlockedBanner = document.getElementById('unlockedBanner');
const tasksSection = document.getElementById('tasksSection');
const btnReloadPage = document.getElementById('btnReloadPage');
const statActiveCount = document.getElementById('statActiveCount');
const statTotalRemaining = document.getElementById('statTotalRemaining');
const sectionCount = document.getElementById('sectionCount');

const STATUS_LABELS = {
  todo: 'À faire',
  in_progress: 'En cours',
  paused: 'En pause',
  overdue: 'En retard'
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();

  setInterval(() => {
    updateTimers();
  }, 1000);
});

async function loadData() {
  tasks = await Storage.getTasks();
  settings = await Storage.getSettings();
  renderBlockedTasks();
}

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.tasks || changes.blockedSites || changes.blockMode) {
    tasks = await Storage.getTasks();
    settings = await Storage.getSettings();
    renderBlockedTasks();
  }
});

function setupEventListeners() {
  btnReloadPage.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'https://google.com';
    }
  });
}

function getActiveTasks() {
  if (settings.blockMode === 'only_in_progress') {
    return tasks.filter(t => t.status === 'in_progress' || t.status === 'overdue');
  }
  return tasks.filter(t => t.status !== 'done');
}

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function renderBlockedTasks() {
  const activeTasks = getActiveTasks();

  statActiveCount.textContent = activeTasks.length;
  sectionCount.textContent = activeTasks.length;

  if (activeTasks.length === 0) {
    tasksSection.classList.add('hidden');
    unlockedBanner.classList.remove('hidden');
    return;
  }

  tasksSection.classList.remove('hidden');
  unlockedBanner.classList.add('hidden');
  blockedTaskList.innerHTML = '';

  activeTasks.forEach(task => {
    const card = document.createElement('div');
    card.className = `blocked-task-card status-${task.status}`;
    card.setAttribute('data-card-id', task.id);

    const { formattedTime, isOverdue, percentage } = computeTaskTimer(task);
    const totalMinutes = task.durationMinutes || 25;
    const offset = RING_CIRCUMFERENCE * (1 - percentage / 100);

    card.innerHTML = `
      <div class="task-ring-wrap">
        <svg class="task-ring" viewBox="0 0 62 62">
          <circle class="ring-track" cx="31" cy="31" r="${RING_RADIUS}"></circle>
          <circle class="ring-fill" id="ring-${task.id}" cx="31" cy="31" r="${RING_RADIUS}"
            stroke-dasharray="${RING_CIRCUMFERENCE.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}"></circle>
        </svg>
        <div class="ring-center">
          <span class="task-timer ${isOverdue ? 'overdue' : ''}" id="timer-${task.id}">${formattedTime}</span>
          <span class="task-timer-label">${isOverdue ? 'retard' : 'restant'}</span>
        </div>
      </div>
      <div class="task-info">
        <div class="task-top-row">
          <span class="task-badge ${task.status}">${STATUS_LABELS[task.status] || task.status}</span>
          <span class="task-duration">${totalMinutes} min</span>
        </div>
        <div class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</div>
      </div>
      <button class="btn btn-complete-task" data-id="${task.id}" title="Marquer comme terminée">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
    `;

    card.querySelector('.btn-complete-task').addEventListener('click', async () => {
      task.status = 'done';
      task.completedAt = Date.now();
      await Storage.saveTasks(tasks);
    });

    blockedTaskList.appendChild(card);
  });

  updateStats(activeTasks);
}

function computeTaskTimer(task) {
  const totalMs = (task.durationMinutes || 25) * 60 * 1000;
  const now = Date.now();
  let remainingMs = totalMs;
  let elapsedMs = 0;
  let isOverdue = false;

  if (task.status === 'todo') {
    remainingMs = totalMs;
    elapsedMs = 0;
  } else if (task.status === 'paused') {
    elapsedMs = task.elapsedMsBeforePause || 0;
    remainingMs = Math.max(0, totalMs - elapsedMs);
  } else if (task.status === 'in_progress' || task.status === 'overdue') {
    elapsedMs = (task.elapsedMsBeforePause || 0) + (now - (task.startTime || now));
    remainingMs = totalMs - elapsedMs;
    if (remainingMs <= 0) {
      isOverdue = true;
    }
  }

  let percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  let formattedTime = '';
  if (isOverdue) {
    formattedTime = '+' + formatMs(Math.abs(remainingMs));
  } else {
    formattedTime = formatMs(remainingMs);
  }

  return { formattedTime, isOverdue, percentage: Math.round(percentage) };
}

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

function updateTimers() {
  const activeTasks = getActiveTasks();

  activeTasks.forEach(task => {
    const timerEl = document.getElementById(`timer-${task.id}`);
    const ringEl = document.getElementById(`ring-${task.id}`);
    const cardEl = document.querySelector(`[data-card-id="${task.id}"]`);
    if (!timerEl || !ringEl) return;

    const { formattedTime, isOverdue, percentage } = computeTaskTimer(task);

    timerEl.textContent = formattedTime;
    timerEl.classList.toggle('overdue', isOverdue);

    const offset = RING_CIRCUMFERENCE * (1 - percentage / 100);
    ringEl.style.strokeDashoffset = offset.toFixed(2);

    const labelEl = timerEl.nextElementSibling;
    if (labelEl) {
      labelEl.textContent = isOverdue ? 'retard' : 'restant';
    }

    if (cardEl) {
      if (isOverdue && !cardEl.classList.contains('status-overdue')) {
        task.status = 'overdue';
        Storage.saveTasks(tasks);
        return;
      }
    }
  });

  updateStats(activeTasks);
}

function updateStats(activeTasks) {
  let totalRemainingMs = 0;
  const now = Date.now();

  activeTasks.forEach(task => {
    const { isOverdue } = computeTaskTimer(task);
    if (isOverdue) return;

    const totalMs = (task.durationMinutes || 25) * 60 * 1000;
    let elapsedMs = 0;
    if (task.status === 'paused') {
      elapsedMs = task.elapsedMsBeforePause || 0;
    } else if (task.status === 'in_progress' || task.status === 'overdue') {
      elapsedMs = (task.elapsedMsBeforePause || 0) + (now - (task.startTime || now));
    }
    totalRemainingMs += Math.max(0, totalMs - elapsedMs);
  });

  statTotalRemaining.textContent = formatMs(totalRemainingMs);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
