/**
 * popup/popup.js - Focus Extension Popup Controller & AI Interactive Multi-turn Chat
 */

import { Storage } from '../utils/storage.js';
import { askAiStream } from '../utils/ai.js';

let tasks = [];
let settings = {};
let currentFilter = 'all';
let activeAiTaskId = null;
let currentAiAbortController = null;
let timerInterval = null;

// SVG Icon Helpers
const SVG_PLAY = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const SVG_PAUSE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const SVG_CHECK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const SVG_FOCUS = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
const SVG_REFRESH = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
const SVG_EDIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const SVG_TRASH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const SVG_BOOKMARK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
const SVG_COPY = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

// DOM Elements
const taskListEl = document.getElementById('taskList');
const emptyStateEl = document.getElementById('emptyState');
const blockingStatusBadge = document.getElementById('blockingStatusBadge');
const btnOpenOptions = document.getElementById('btnOpenOptions');

const filterTabsContainer = document.querySelector('.filter-tabs');
const filterTabs = document.querySelectorAll('.tab-btn');
const btnNewTask = document.getElementById('btnNewTask');

// Modal Elements
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDescInput = document.getElementById('taskDescInput');
const taskDurationInput = document.getElementById('taskDurationInput');
const remind10mCb = document.getElementById('remind10m');
const remindEndCb = document.getElementById('remindEnd');
const remindRepeat5mCb = document.getElementById('remindRepeat5m');
const btnCancelTask = document.getElementById('btnCancelTask');
const btnCloseModal = document.getElementById('btnCloseModal');

// AI Panel Elements
const aiPanel = document.getElementById('aiPanel');
const aiTaskTitle = document.getElementById('aiTaskTitle');
const btnCloseAiPanel = document.getElementById('btnCloseAiPanel');
const btnClearChatHistory = document.getElementById('btnClearChatHistory');
const aiProviderSelect = document.getElementById('aiProviderSelect');
const aiQueryForm = document.getElementById('aiQueryForm');
const aiQuestionInput = document.getElementById('aiQuestionInput');
const btnSubmitAi = document.getElementById('btnSubmitAi');
const chatMessagesContainer = document.getElementById('chatMessagesContainer');
const promptChips = document.querySelectorAll('.prompt-chip');

// Notes Drawer
const btnToggleNotes = document.getElementById('btnToggleNotes');
const notesCountBadge = document.getElementById('notesCountBadge');
const taskNotesDrawer = document.getElementById('taskNotesDrawer');
const btnCloseNotesDrawer = document.getElementById('btnCloseNotesDrawer');
const taskNotesList = document.getElementById('taskNotesList');
const addNoteForm = document.getElementById('addNoteForm');
const newNoteInput = document.getElementById('newNoteInput');
const notesHeaderCount = document.getElementById('notesHeaderCount');

// Quick Note Modal
const noteModal = document.getElementById('noteModal');
const noteModalTitle = document.getElementById('noteModalTitle');
const noteTextInput = document.getElementById('noteTextInput');
const noteForm = document.getElementById('noteForm');
const btnCloseNoteModal = document.getElementById('btnCloseNoteModal');
const btnCancelNoteModal = document.getElementById('btnCancelNoteModal');

// Initialize Extension Popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  await handlePendingQuickNote();

  timerInterval = setInterval(() => {
    updateCountdowns();
  }, 1000);
});

async function loadData() {
  tasks = await Storage.getTasks();
  settings = await Storage.getSettings();
  renderHeaderStatus();
  updateTabCounters();
  renderTaskList();
  populateAiProviders();
}

chrome.storage.onChanged.addListener(async (changes) => {
  if (currentAiAbortController) return;
  if (changes.tasks || changes.blockedSites || changes.blockMode || changes.aiProviders) {
    tasks = await Storage.getTasks();
    settings = await Storage.getSettings();
    renderHeaderStatus();
    updateTabCounters();
    renderTaskList();
    populateAiProviders();
    if (activeAiTaskId) {
      renderChatMessages();
      renderTaskNotes();
    }
  }
});

function setupEventListeners() {
  btnOpenOptions.addEventListener('click', () => {
    openOptionsPage();
  });

  if (filterTabsContainer) {
    filterTabsContainer.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        filterTabsContainer.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      tab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      renderTaskList();
    });
  });

  btnNewTask.addEventListener('click', () => openTaskModal());
  btnCloseModal.addEventListener('click', () => closeTaskModal());
  btnCancelTask.addEventListener('click', () => closeTaskModal());

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSaveTask();
  });

  // AI Panel Listeners
  btnCloseAiPanel.addEventListener('click', () => closeAiPanel());
  btnClearChatHistory.addEventListener('click', () => resetChatHistory());

  btnToggleNotes.addEventListener('click', () => {
    taskNotesDrawer.classList.toggle('hidden');
  });
  btnCloseNotesDrawer.addEventListener('click', () => {
    taskNotesDrawer.classList.add('hidden');
  });

  addNoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addPersonalNote(newNoteInput.value);
  });

  newNoteInput.addEventListener('input', () => {
    newNoteInput.style.height = 'auto';
    newNoteInput.style.height = Math.min(newNoteInput.scrollHeight, 120) + 'px';
  });

  newNoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addPersonalNote(newNoteInput.value);
    }
  });

  // Quick note modal listeners
  btnCloseNoteModal.addEventListener('click', () => closeQuickNote());
  btnCancelNoteModal.addEventListener('click', () => closeQuickNote());
  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveQuickNote();
  });
  noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) closeQuickNote();
  });

  // Prompt chips click listener
  promptChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const targetBtn = e.currentTarget;
      const promptText = targetBtn.getAttribute('data-prompt');
      if (promptText) {
        aiQuestionInput.value = promptText;
        handleAiSubmit(promptText);
      }
    });
  });

  aiQuestionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const promptText = aiQuestionInput.value.trim();
      if (promptText) {
        handleAiSubmit(promptText);
      }
    }
  });

  aiQueryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const promptText = aiQuestionInput.value.trim();
    if (promptText) {
      handleAiSubmit(promptText);
    }
  });
}

function openOptionsPage() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options/options.html'));
  }
}

function updateTabCounters() {
  const counts = {
    all: tasks.length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    done: tasks.filter(t => t.status === 'done').length
  };

  Object.keys(counts).forEach(filterKey => {
    const countEl = document.getElementById(`count-${filterKey}`);
    if (countEl) {
      const cnt = counts[filterKey];
      countEl.textContent = cnt;
      if (cnt > 0) {
        countEl.classList.add('has-items');
      } else {
        countEl.classList.remove('has-items');
      }
    }
  });
}

function renderHeaderStatus() {
  const uncompleted = tasks.filter(t => t.status !== 'done');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const enabledSites = settings.blockedSites.filter(s => s.enabled);

  let isBlockingActive = false;
  if (settings.blockMode === 'only_in_progress') {
    isBlockingActive = inProgress.length > 0 && enabledSites.length > 0;
  } else {
    isBlockingActive = uncompleted.length > 0 && enabledSites.length > 0;
  }

  const badgeText = blockingStatusBadge.querySelector('.badge-text');

  if (isBlockingActive) {
    blockingStatusBadge.className = 'status-badge active';
    badgeText.textContent = `Blocage (${enabledSites.length} sites)`;
    blockingStatusBadge.title = `Sites perturbants bloqués pendant vos tâches.`;
  } else {
    blockingStatusBadge.className = 'status-badge inactive';
    badgeText.textContent = `Aucun blocage`;
    blockingStatusBadge.title = `Aucun blocage actif (tâches terminées ou option désactivée).`;
  }
}

function renderTaskList() {
  const filtered = tasks.filter(t => {
    if (currentFilter === 'all') return true;
    return t.status === currentFilter;
  });

  if (filtered.length === 0) {
    emptyStateEl.classList.remove('hidden');
    taskListEl.innerHTML = '';
    return;
  }

  emptyStateEl.classList.add('hidden');
  taskListEl.innerHTML = '';

  filtered.forEach(task => {
    const card = createTaskCard(task);
    taskListEl.appendChild(card);
  });
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card status-${task.status}`;
  card.setAttribute('data-id', task.id);

  const statusLabels = {
    todo: 'À faire',
    in_progress: 'En cours',
    overdue: 'En retard',
    done: 'Terminée'
  };

  const { formattedTime, percentage, isOverdue } = computeTaskTimeDetails(task);

  card.innerHTML = `
    <div class="task-card-header">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <span class="card-badge ${task.status}">${statusLabels[task.status] || task.status}</span>
    </div>
    
    ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}

    <div class="timer-box">
      <span class="timer-label" style="font-size:11px; color:var(--text-muted); font-weight:500;">
        ${isOverdue ? 'Retard accumulé :' : 'Temps restant :'}
      </span>
      <span class="timer-display" id="timer-${task.id}">${formattedTime}</span>
    </div>

    <div class="progress-bar-bg">
      <div class="progress-bar-fill" id="progress-${task.id}" style="width: ${percentage}%;"></div>
    </div>

    <div class="card-actions">
      <div class="card-actions-left">
        ${renderTaskPrimaryButtons(task)}
        <button class="btn btn-sm btn-ai btn-open-ai" data-id="${task.id}" title="Rechercher avec l'IA">
          ${SVG_FOCUS} IA
        </button>
      </div>

      <div class="card-actions-right">
        <button class="icon-action-btn btn-note-task" data-id="${task.id}" title="Note rapide">
          ${SVG_BOOKMARK}
        </button>
        <button class="icon-action-btn btn-edit-task" data-id="${task.id}" title="Modifier">
          ${SVG_EDIT}
        </button>
        <button class="icon-action-btn delete btn-delete-task" data-id="${task.id}" title="Supprimer">
          ${SVG_TRASH}
        </button>
      </div>
    </div>
  `;

  const btnStart = card.querySelector('.btn-start-task');
  if (btnStart) btnStart.addEventListener('click', () => startTask(task.id));

  const btnPause = card.querySelector('.btn-pause-task');
  if (btnPause) btnPause.addEventListener('click', () => pauseTask(task.id));

  const btnResume = card.querySelector('.btn-resume-task');
  if (btnResume) btnResume.addEventListener('click', () => resumeTask(task.id));

  const btnDone = card.querySelector('.btn-done-task');
  if (btnDone) btnDone.addEventListener('click', () => completeTask(task.id));

  const btnAi = card.querySelector('.btn-open-ai');
  if (btnAi) btnAi.addEventListener('click', () => openAiPanel(task.id));

  const btnNote = card.querySelector('.btn-note-task');
  if (btnNote) btnNote.addEventListener('click', () => openQuickNote(task.id));

  const btnEdit = card.querySelector('.btn-edit-task');
  if (btnEdit) btnEdit.addEventListener('click', () => openTaskModal(task));

  const btnDelete = card.querySelector('.btn-delete-task');
  if (btnDelete) btnDelete.addEventListener('click', () => deleteTask(task.id));

  return card;
}

function renderTaskPrimaryButtons(task) {
  if (task.status === 'todo') {
    return `<button class="btn btn-sm btn-primary btn-start-task" data-id="${task.id}">${SVG_PLAY} Démarrer</button>`;
  }
  if (task.status === 'in_progress') {
    return `
      <button class="btn btn-sm btn-secondary btn-pause-task" data-id="${task.id}">${SVG_PAUSE} Pause</button>
      <button class="btn btn-sm btn-primary btn-done-task" data-id="${task.id}">${SVG_CHECK} Terminer</button>
    `;
  }
  if (task.status === 'paused') {
    return `
      <button class="btn btn-sm btn-primary btn-resume-task" data-id="${task.id}">${SVG_PLAY} Reprendre</button>
      <button class="btn btn-sm btn-secondary btn-done-task" data-id="${task.id}">${SVG_CHECK} Terminer</button>
    `;
  }
  if (task.status === 'overdue') {
    return `<button class="btn btn-sm btn-primary btn-done-task" data-id="${task.id}">${SVG_CHECK} Terminer</button>`;
  }
  if (task.status === 'done') {
    return `<button class="btn btn-sm btn-outline btn-start-task" data-id="${task.id}">${SVG_REFRESH} Relancer</button>`;
  }
  return '';
}

function computeTaskTimeDetails(task) {
  const totalMs = (task.durationMinutes || 25) * 60 * 1000;
  const now = Date.now();
  let remainingMs = totalMs;
  let elapsedMs = 0;
  let isOverdue = false;

  if (task.status === 'done') {
    return { formattedTime: '00:00', percentage: 100, isOverdue: false };
  }

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
      if (task.status === 'in_progress') {
        task.status = 'overdue';
        Storage.saveTasks(tasks);
      }
    }
  }

  let percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  let formattedTime = '';
  if (isOverdue) {
    const overdueMs = Math.abs(remainingMs);
    formattedTime = '+' + formatMs(overdueMs);
  } else {
    formattedTime = formatMs(remainingMs);
  }

  return { formattedTime, percentage: Math.round(percentage), isOverdue };
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

function updateCountdowns() {
  tasks.forEach(task => {
    if (task.status === 'in_progress' || task.status === 'overdue') {
      const timerEl = document.getElementById(`timer-${task.id}`);
      const progressEl = document.getElementById(`progress-${task.id}`);
      if (timerEl && progressEl) {
        const { formattedTime, percentage } = computeTaskTimeDetails(task);
        timerEl.textContent = formattedTime;
        progressEl.style.width = `${percentage}%`;
      }
    }
  });
}

async function startTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = 'in_progress';
    task.startTime = Date.now();
    task.elapsedMsBeforePause = 0;
    await Storage.saveTasks(tasks);
  }
}

async function pauseTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task && task.status === 'in_progress') {
    const now = Date.now();
    task.elapsedMsBeforePause = (task.elapsedMsBeforePause || 0) + (now - (task.startTime || now));
    task.status = 'paused';
    task.startTime = null;
    await Storage.saveTasks(tasks);
  }
}

async function resumeTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task && task.status === 'paused') {
    task.status = 'in_progress';
    task.startTime = Date.now();
    await Storage.saveTasks(tasks);
  }
}

async function completeTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = 'done';
    task.completedAt = Date.now();
    await Storage.saveTasks(tasks);
  }
}

async function deleteTask(taskId) {
  if (confirm('Voulez-vous vraiment supprimer cette tâche ?')) {
    tasks = tasks.filter(t => t.id !== taskId);
    await Storage.saveTasks(tasks);
  }
}

/**
 * Task Modal Handlers
 */
function openTaskModal(task = null) {
  taskModal.classList.remove('hidden');
  if (task) {
    modalTitle.textContent = 'Modifier la tâche';
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescInput.value = task.description || '';
    taskDurationInput.value = task.durationMinutes || 25;

    const rems = task.reminders || [];
    remind10mCb.checked = rems.includes('before_10m');
    remindEndCb.checked = rems.includes('at_end');
    remindRepeat5mCb.checked = rems.includes('repeat_5m_after');
  } else {
    modalTitle.textContent = 'Nouvelle Tâche';
    taskIdInput.value = '';
    taskTitleInput.value = '';
    taskDescInput.value = '';
    taskDurationInput.value = 25;

    const defaultRems = settings.defaultReminders || ['at_end', 'repeat_5m_after'];
    remind10mCb.checked = defaultRems.includes('before_10m');
    remindEndCb.checked = defaultRems.includes('at_end');
    remindRepeat5mCb.checked = defaultRems.includes('repeat_5m_after');
  }
}

function closeTaskModal() {
  taskModal.classList.add('hidden');
}

async function handleSaveTask() {
  const id = taskIdInput.value;
  const title = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();
  const durationMinutes = parseInt(taskDurationInput.value, 10) || 25;

  const reminders = [];
  if (remind10mCb.checked) reminders.push('before_10m');
  if (remindEndCb.checked) reminders.push('at_end');
  if (remindRepeat5mCb.checked) reminders.push('repeat_5m_after');

  if (id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.description = description;
      task.durationMinutes = durationMinutes;
      task.reminders = reminders;
    }
  } else {
    const newTask = {
      id: 'task_' + Date.now(),
      title,
      description,
      durationMinutes,
      status: 'todo',
      createdAt: Date.now(),
      startTime: null,
      elapsedMsBeforePause: 0,
      completedAt: null,
      reminders,
      chatHistory: [],
      notes: []
    };
    tasks.unshift(newTask);
  }

  await Storage.saveTasks(tasks);
  closeTaskModal();
}

/**
 * AI Multi-Turn Chat Controller
 */
function populateAiProviders() {
  aiProviderSelect.innerHTML = '';
  const providers = settings.aiProviders || [];
  
  if (providers.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Aucun fournisseur configuré (voir Options)';
    aiProviderSelect.appendChild(opt);
    return;
  }

  providers.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + (p.apiKey && p.apiKey.trim() ? '' : ' (Clé manquante)');
    if (p.id === settings.activeAiProviderId) {
      opt.selected = true;
    }
    aiProviderSelect.appendChild(opt);
  });
}

function openAiPanel(taskId) {
  activeAiTaskId = taskId;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  aiTaskTitle.textContent = task.title;
  aiPanel.classList.remove('hidden');
  taskNotesDrawer.classList.add('hidden');
  
  populateAiProviders();
  renderChatMessages();
  renderTaskNotes();
}

function closeAiPanel() {
  if (currentAiAbortController) {
    currentAiAbortController.abort();
    currentAiAbortController = null;
  }
  btnSubmitAi.disabled = false;
  activeAiTaskId = null;
  aiPanel.classList.add('hidden');
}

/**
 * Render Full Chat Conversation Stream
 */
function renderChatMessages() {
  if (!activeAiTaskId) return;
  const task = tasks.find(t => t.id === activeAiTaskId);
  if (!task) return;

  const history = task.chatHistory || [];
  chatMessagesContainer.innerHTML = '';

  if (history.length === 0) {
    chatMessagesContainer.innerHTML = `
      <div class="chat-welcome-box">
        <p>Bonjour ! Posez une question ou choisissez une suggestion ci-dessus. L'assistant Focus conserve le contexte de toute la discussion.</p>
      </div>
    `;
    return;
  }

  history.forEach(msg => {
    const bubble = createChatBubble(msg, task);
    chatMessagesContainer.appendChild(bubble);
  });

  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function createChatBubble(msg, task) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${msg.role}`;
  bubble.setAttribute('data-msg-id', msg.id);

  if (msg.role === 'user') {
    bubble.innerHTML = `
      <div class="bubble-content">${escapeHtml(msg.content)}</div>
    `;
  } else {
    bubble.innerHTML = `
      <div class="ai-bubble-header">
        <div class="ai-header-left">
          <div class="ai-avatar">${SVG_FOCUS}</div>
          <span class="ai-name">Assistant Focus</span>
        </div>
      </div>
      <div class="bubble-content markdown-body">${parseMarkdown(msg.content)}</div>
      <div class="bubble-footer-actions">
        <button class="btn-msg-action btn-save-msg-note" title="Enregistrer cette réponse dans les notes">
          ${SVG_BOOKMARK}<span>Enregistrer en note</span>
        </button>
        <button class="btn-msg-action btn-copy-msg" title="Copier la réponse">
          ${SVG_COPY}<span>Copier</span>
        </button>
      </div>
    `;

    const resetActionBtn = (btn, icon, label) => {
      btn.classList.remove('action-success');
      btn.innerHTML = `${icon}<span>${label}</span>`;
    };

    const btnSave = bubble.querySelector('.btn-save-msg-note');
    btnSave.addEventListener('click', async () => {
      if (!task.notes) task.notes = [];
      task.notes.unshift({
        id: 'note_' + Date.now(),
        text: msg.content,
        source: 'ai',
        createdAt: Date.now()
      });
      await Storage.saveTasks(tasks);
      renderTaskNotes();

      btnSave.classList.add('action-success');
      btnSave.innerHTML = `${SVG_CHECK}<span>Enregistré !</span>`;
      setTimeout(() => resetActionBtn(btnSave, SVG_BOOKMARK, 'Enregistrer en note'), 2000);
    });

    const btnCopy = bubble.querySelector('.btn-copy-msg');
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content).then(() => {
        btnCopy.classList.add('action-success');
        btnCopy.innerHTML = `${SVG_CHECK}<span>Copié !</span>`;
        setTimeout(() => resetActionBtn(btnCopy, SVG_COPY, 'Copier'), 2000);
      });
    });
  }

  return bubble;
}

async function handleAiSubmit(promptText) {
  if (!activeAiTaskId || !promptText) return;
  const task = tasks.find(t => t.id === activeAiTaskId);
  if (!task) return;

  if (currentAiAbortController) {
    currentAiAbortController.abort();
  }
  const controller = new AbortController();
  currentAiAbortController = controller;
  btnSubmitAi.disabled = true;

  let assistantMsg = null;

  try {
    if (!task.chatHistory) task.chatHistory = [];

    // Add User Message
    const userMsgId = 'msg_' + Date.now();
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: promptText,
      timestamp: Date.now()
    };
    task.chatHistory.push(userMsg);
    await Storage.saveTasks(tasks);

    aiQuestionInput.value = '';
    renderChatMessages();

    // Validate AI Provider & API Key
    const selectedProviderId = aiProviderSelect.value;
    const provider = (settings.aiProviders || []).find(p => p.id === selectedProviderId);

    if (!provider || !provider.apiKey || !provider.apiKey.trim()) {
      const errorMsgId = 'msg_' + (Date.now() + 1);
      const errorMsg = {
        id: errorMsgId,
        role: 'assistant',
        content: `⚠️ **Clé API manquante pour ${provider ? provider.name : 'le fournisseur'}.**\n\nVeuillez d'abord configurer une clé API valide dans la page d'options de Focus.`,
        timestamp: Date.now()
      };
      task.chatHistory.push(errorMsg);
      await Storage.saveTasks(tasks);
      renderChatMessages();
      return;
    }

    // Assistant Placeholder Bubble
    const assistantMsgId = 'msg_' + (Date.now() + 1);
    assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '⏳ Génération de la réponse...',
      timestamp: Date.now()
    };
    task.chatHistory.push(assistantMsg);
    renderChatMessages();

    let fullText = '';
    await askAiStream({
      provider,
      taskTitle: task.title,
      taskDescription: task.description,
      chatHistory: task.chatHistory.filter(m => m.id !== assistantMsgId),
      signal: controller.signal,
      onChunk: (receivedContent) => {
        fullText = receivedContent;
        assistantMsg.content = receivedContent;

        const activeBubble = chatMessagesContainer.querySelector(`[data-msg-id="${assistantMsgId}"] .bubble-content`);
        if (activeBubble) {
          activeBubble.innerHTML = parseMarkdown(receivedContent);
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
      }
    });

    assistantMsg.content = fullText;
    await Storage.saveTasks(tasks);

  } catch (err) {
    if (err.message !== 'Génération annulée.') {
      if (assistantMsg) {
        assistantMsg.content = `❌ Erreur : ${err.message}`;
      }
      await Storage.saveTasks(tasks);
      renderChatMessages();
    }
  } finally {
    if (currentAiAbortController === controller) {
      btnSubmitAi.disabled = false;
      currentAiAbortController = null;
    }
  }
}

async function resetChatHistory() {
  if (!activeAiTaskId) return;
  const task = tasks.find(t => t.id === activeAiTaskId);
  if (task && confirm('Voulez-vous réinitialiser l\'historique de cette discussion ?')) {
    task.chatHistory = [];
    await Storage.saveTasks(tasks);
    renderChatMessages();
  }
}

// ── Quick personal note (linked to a specific task) ──────────────
let quickNoteTaskId = null;

function openQuickNote(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  quickNoteTaskId = taskId;
  noteModalTitle.textContent = `Note rapide — ${task.title}`;
  noteTextInput.value = '';
  noteModal.classList.remove('hidden');
  setTimeout(() => noteTextInput.focus(), 60);
}

function closeQuickNote() {
  quickNoteTaskId = null;
  noteModal.classList.add('hidden');
}

async function saveQuickNote() {
  const text = noteTextInput.value.trim();
  const task = quickNoteTaskId ? tasks.find(t => t.id === quickNoteTaskId) : null;
  if (!text || !task) {
    closeQuickNote();
    return;
  }

  if (!task.notes) task.notes = [];
  task.notes.unshift({
    id: 'note_' + Date.now(),
    text,
    source: 'user',
    createdAt: Date.now()
  });
  await Storage.saveTasks(tasks);

  if (activeAiTaskId === quickNoteTaskId) renderTaskNotes();
  closeQuickNote();
}

async function handlePendingQuickNote() {
  let targetId = null;

  const params = new URLSearchParams(window.location.search);
  if (params.get('quickNote') === '1') {
    targetId = params.get('taskId');
  }

  try {
    const pending = await chrome.storage.session.get(['pendingQuickNoteTaskId', 'pendingQuickNoteTs']);
    if (pending.pendingQuickNoteTaskId && pending.pendingQuickNoteTs &&
        Date.now() - pending.pendingQuickNoteTs < 10000) {
      targetId = pending.pendingQuickNoteTaskId;
    }
    await chrome.storage.session.remove(['pendingQuickNoteTaskId', 'pendingQuickNoteTs']);
  } catch (e) { /* storage.session indisponible */ }

  if (targetId && tasks.some(t => t.id === targetId)) {
    openQuickNote(targetId);
  }
}

async function addPersonalNote(rawText) {
  const text = (rawText || '').trim();
  if (!text || !activeAiTaskId) return;
  const task = tasks.find(t => t.id === activeAiTaskId);
  if (!task) return;

  if (!task.notes) task.notes = [];
  task.notes.unshift({
    id: 'note_' + Date.now(),
    text,
    source: 'user',
    createdAt: Date.now()
  });
  await Storage.saveTasks(tasks);
  renderTaskNotes();

  newNoteInput.value = '';
  newNoteInput.style.height = 'auto';
  taskNotesList.scrollTop = 0;
}

function renderTaskNotes() {
  if (!activeAiTaskId) return;
  const task = tasks.find(t => t.id === activeAiTaskId);
  if (!task) return;

  const notes = task.notes || [];
  notesCountBadge.textContent = notes.length;
  if (notesHeaderCount) notesHeaderCount.textContent = notes.length;

  if (notes.length === 0) {
    taskNotesList.innerHTML = `
      <div class="notes-empty">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        <p>Aucune note pour l'instant</p>
        <span>Enregistrez une réponse de l'assistant ou rédigez votre propre note.</span>
      </div>`;
    return;
  }

  taskNotesList.innerHTML = '';
  notes.forEach(note => {
    const card = document.createElement('div');
    const isLong = (note.text || '').length > 260;
    const isUser = note.source === 'user';
    card.className = 'note-card' + (isUser ? ' user-note' : '');

    const dateLabel = note.createdAt
      ? new Date(note.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '';

    card.innerHTML = `
      <div class="note-card-top">
        <span class="note-source-badge ${isUser ? 'user' : 'ai'}">${isUser ? 'Perso' : 'IA'}</span>
        ${dateLabel ? `<span class="note-date">${dateLabel}</span>` : ''}
      </div>
      <div class="note-text${isLong ? ' collapsed' : ''}">${escapeHtml(note.text)}</div>
      ${isLong ? '<button type="button" class="note-toggle">Voir plus</button>' : ''}
      <div class="note-actions">
        <button type="button" class="btn-note-action btn-copy-note" title="Copier la note">${SVG_COPY}<span>Copier</span></button>
        <button type="button" class="btn-note-action btn-delete-note" title="Supprimer la note">${SVG_TRASH}<span>Supprimer</span></button>
      </div>
    `;

    const noteTextEl = card.querySelector('.note-text');
    const toggleBtn = card.querySelector('.note-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const collapsed = noteTextEl.classList.toggle('collapsed');
        toggleBtn.textContent = collapsed ? 'Voir plus' : 'Voir moins';
      });
    }

    const btnCopyNote = card.querySelector('.btn-copy-note');
    btnCopyNote.addEventListener('click', () => {
      const label = btnCopyNote.querySelector('span');
      navigator.clipboard.writeText(note.text).then(() => {
        btnCopyNote.classList.add('action-success');
        if (label) label.textContent = 'Copié !';
        setTimeout(() => {
          btnCopyNote.classList.remove('action-success');
          if (label) label.textContent = 'Copier';
        }, 1500);
      });
    });

    card.querySelector('.btn-delete-note').addEventListener('click', async () => {
      task.notes = task.notes.filter(n => n.id !== note.id);
      await Storage.saveTasks(tasks);
      renderTaskNotes();
    });

    taskNotesList.appendChild(card);
  });
}

function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  const codeBlocks = [];
  html = html.replace(/```([\s\S]*?)```/g, (m, code) => {
    codeBlocks.push(code.replace(/^\n/, ''));
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  const inline = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  const out = [];
  let listType = null;
  const closeList = () => {
    if (listType) {
      out.push(listType === 'ul' ? '</ul>' : '</ol>');
      listType = null;
    }
  };

  html.split('\n').forEach(rawLine => {
    const line = rawLine.trim();

    if (/^\u0000CODE\d+\u0000$/.test(line)) {
      closeList();
      out.push(line);
      return;
    }
    if (!line) {
      closeList();
      return;
    }

    let m;
    if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      if (listType !== 'ol') { closeList(); out.push('<ol class="md-ol">'); listType = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
      return;
    }
    if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      if (listType !== 'ul') { closeList(); out.push('<ul class="md-ul">'); listType = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
      return;
    }

    closeList();
    if ((m = line.match(/^###\s+(.*)$/))) { out.push(`<h5 class="md-h3">${inline(m[1])}</h5>`); return; }
    if ((m = line.match(/^##\s+(.*)$/))) { out.push(`<h4 class="md-h2">${inline(m[1])}</h4>`); return; }
    if ((m = line.match(/^#\s+(.*)$/))) { out.push(`<h3 class="md-h1">${inline(m[1])}</h3>`); return; }
    out.push(`<p class="md-p">${inline(line)}</p>`);
  });
  closeList();

  html = out.join('');
  html = html.replace(/\u0000CODE(\d+)\u0000/g, (m, i) => `<pre><code>${codeBlocks[+i]}</code></pre>`);

  return html;
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
