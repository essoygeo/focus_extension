/**
 * options/options.js - Controller for Focus Options & Configuration page
 */

import { Storage, DEFAULT_AI_PROVIDERS } from '../utils/storage.js';
import { testAiConnection } from '../utils/ai.js';

let settings = {};

// SVG Icon Constants
const SVG_ZAP = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
const SVG_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const SVG_TRASH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const SVG_EYE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const SVG_EYE_OFF = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.config-section');
const toastEl = document.getElementById('toastNotification');
const navCountSites = document.getElementById('navCountSites');
const navCountProviders = document.getElementById('navCountProviders');

// Blocking Elements
const blockModeRadios = document.querySelectorAll('input[name="blockMode"]');
const addSiteForm = document.getElementById('addSiteForm');
const siteDomainInput = document.getElementById('siteDomainInput');
const sitesList = document.getElementById('sitesList');
const blockedSitesCount = document.getElementById('blockedSitesCount');

// Reminders Elements
const defaultRemind10m = document.getElementById('defaultRemind10m');
const defaultRemindEnd = document.getElementById('defaultRemindEnd');
const defaultRemindRepeat5m = document.getElementById('defaultRemindRepeat5m');
const btnSaveReminders = document.getElementById('btnSaveReminders');

// AI Elements
const activeProviderSelect = document.getElementById('activeProviderSelect');
const providersContainer = document.getElementById('providersContainer');
const btnAddCustomProvider = document.getElementById('btnAddCustomProvider');
const presetButtons = document.querySelectorAll('.btn-add-preset');

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupNavigation();
  setupEventListeners();
});

async function loadSettings() {
  settings = await Storage.getSettings();

  renderBlockingSection();
  renderRemindersSection();
  renderAiSection();
  updateSidebarCounters();
}

function updateSidebarCounters() {
  const sitesCount = (settings.blockedSites || []).length;
  const providersCount = (settings.aiProviders || []).length;

  if (navCountSites) {
    navCountSites.textContent = sitesCount;
    if (sitesCount > 0) navCountSites.classList.add('has-items');
    else navCountSites.classList.remove('has-items');
  }

  if (navCountProviders) {
    navCountProviders.textContent = providersCount;
    if (providersCount > 0) navCountProviders.classList.add('has-items');
    else navCountProviders.classList.remove('has-items');
  }
}

function setupNavigation() {
  const switchTab = (targetId) => {
    navItems.forEach(item => {
      if (item.getAttribute('data-target') === targetId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    sections.forEach(sec => {
      if (sec.id === targetId) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-target');
      switchTab(targetId);
      window.location.hash = item.getAttribute('href');
    });
  });

  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    const targetSection = `section-${hash}`;
    if (document.getElementById(targetSection)) {
      switchTab(targetSection);
    }
  }
}

function setupEventListeners() {
  blockModeRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      settings.blockMode = e.target.value;
      await Storage.set({ blockMode: settings.blockMode });
      showToast('Mode de blocage mis à jour !');
    });
  });

  addSiteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawDomain = siteDomainInput.value.trim();
    if (!rawDomain) return;

    let cleanDomain = rawDomain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();

    if (!cleanDomain) return;

    const exists = settings.blockedSites.some(s => s.domain === cleanDomain);
    if (exists) {
      alert('Ce domaine est déjà présent dans votre liste.');
      return;
    }

    settings.blockedSites.unshift({
      id: 'site_' + Date.now(),
      domain: cleanDomain,
      enabled: true
    });

    await Storage.set({ blockedSites: settings.blockedSites });
    siteDomainInput.value = '';
    renderSitesList();
    updateSidebarCounters();
    showToast(`Site ${cleanDomain} ajouté !`);
  });

  btnSaveReminders.addEventListener('click', async () => {
    const reminders = [];
    if (defaultRemind10m.checked) reminders.push('before_10m');
    if (defaultRemindEnd.checked) reminders.push('at_end');
    if (defaultRemindRepeat5m.checked) reminders.push('repeat_5m_after');

    settings.defaultReminders = reminders;
    await Storage.set({ defaultReminders: reminders });
    showToast('Rappels par défaut enregistrés !');
  });

  activeProviderSelect.addEventListener('change', async (e) => {
    settings.activeAiProviderId = e.target.value;
    await Storage.set({ activeAiProviderId: settings.activeAiProviderId });
    showToast('Fournisseur IA par défaut mis à jour !');
  });

  presetButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const presetKey = btn.getAttribute('data-preset');
      const defaultPreset = DEFAULT_AI_PROVIDERS.find(p => p.id === presetKey);

      if (!defaultPreset) return;

      let existingIndex = settings.aiProviders.findIndex(p => p.id === presetKey);
      if (existingIndex >= 0) {
        const currentKey = settings.aiProviders[existingIndex].apiKey;
        settings.aiProviders[existingIndex] = {
          ...defaultPreset,
          apiKey: currentKey || ''
        };
      } else {
        settings.aiProviders.push({ ...defaultPreset });
      }

      await Storage.set({ aiProviders: settings.aiProviders });
      renderAiSection();
      updateSidebarCounters();
      showToast(`Préréglage ${defaultPreset.name} configuré !`);
    });
  });

  btnAddCustomProvider.addEventListener('click', async () => {
    const newProvider = {
      id: 'custom_' + Date.now(),
      name: 'Fournisseur Personnalisé',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      apiKey: '',
      keyUrl: ''
    };

    settings.aiProviders.push(newProvider);
    await Storage.set({ aiProviders: settings.aiProviders });
    renderAiSection();
    updateSidebarCounters();
    showToast('Nouveau fournisseur personnalisé ajouté !');
  });
}

function renderBlockingSection() {
  blockModeRadios.forEach(radio => {
    radio.checked = (radio.value === settings.blockMode);
  });
  renderSitesList();
}

function renderSitesList() {
  const sites = settings.blockedSites || [];
  blockedSitesCount.textContent = `${sites.length} site${sites.length > 1 ? 's' : ''}`;

  if (sites.length === 0) {
    sitesList.innerHTML = `<div class="site-row"><span style="grid-column: span 3; color: var(--text-muted); text-align: center;">Aucun site bloqué dans la liste.</span></div>`;
    return;
  }

  sitesList.innerHTML = '';
  sites.forEach(site => {
    const row = document.createElement('div');
    row.className = 'site-row';
    row.innerHTML = `
      <div>
        <input type="checkbox" class="site-toggle-cb" ${site.enabled ? 'checked' : ''} data-id="${site.id}">
      </div>
      <div class="site-domain">${escapeHtml(site.domain)}</div>
      <div class="text-right">
        <button class="btn btn-sm btn-danger btn-delete-site" data-id="${site.id}">
          ${SVG_TRASH} Supprimer
        </button>
      </div>
    `;

    row.querySelector('.site-toggle-cb').addEventListener('change', async (e) => {
      site.enabled = e.target.checked;
      await Storage.set({ blockedSites: settings.blockedSites });
      showToast(`Statut de ${site.domain} mis à jour`);
    });

    row.querySelector('.btn-delete-site').addEventListener('click', async () => {
      settings.blockedSites = settings.blockedSites.filter(s => s.id !== site.id);
      await Storage.set({ blockedSites: settings.blockedSites });
      renderSitesList();
      updateSidebarCounters();
      showToast(`Site ${site.domain} supprimé`);
    });

    sitesList.appendChild(row);
  });
}

function renderRemindersSection() {
  const rems = settings.defaultReminders || [];
  defaultRemind10m.checked = rems.includes('before_10m');
  defaultRemindEnd.checked = rems.includes('at_end');
  defaultRemindRepeat5m.checked = rems.includes('repeat_5m_after');
}

function renderAiSection() {
  activeProviderSelect.innerHTML = '';
  const providers = settings.aiProviders || [];

  providers.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === settings.activeAiProviderId) {
      opt.selected = true;
    }
    activeProviderSelect.appendChild(opt);
  });

  providersContainer.innerHTML = '';
  providers.forEach(provider => {
    const card = createProviderCard(provider);
    providersContainer.appendChild(card);
  });
}

function createProviderCard(provider) {
  const card = document.createElement('div');
  card.className = 'provider-card';
  card.setAttribute('data-id', provider.id);

  card.innerHTML = `
    <div class="provider-header">
      <h4>${escapeHtml(provider.name)}</h4>
      <button class="btn btn-sm btn-danger btn-delete-provider" data-id="${provider.id}">
        ${SVG_TRASH} Supprimer
      </button>
    </div>

    <form class="provider-form">
      <div class="provider-form-grid">
        <div class="form-group full-width">
          <label>Nom du fournisseur</label>
          <input type="text" class="input-provider-name" value="${escapeHtml(provider.name)}" required>
        </div>

        <div class="form-group">
          <label>URL de base (Compatible OpenAI)</label>
          <input type="text" class="input-provider-url" value="${escapeHtml(provider.baseUrl)}" placeholder="https://api.openai.com/v1" required>
        </div>

        <div class="form-group">
          <label>Nom du modèle</label>
          <input type="text" class="input-provider-model" value="${escapeHtml(provider.model)}" placeholder="ex: gpt-4o-mini" required>
        </div>

        <div class="form-group full-width">
          <label>Clé API (Stockée en local, masquée)</label>
          <div class="key-input-wrap">
            <input type="password" class="input-provider-key" value="${escapeHtml(provider.apiKey || '')}" placeholder="Saisissez votre clé API...">
            <button type="button" class="btn btn-secondary btn-toggle-key" title="Afficher/Masquer la clé">${SVG_EYE}</button>
          </div>
          ${provider.keyUrl ? `
            <a href="${provider.keyUrl}" target="_blank" class="link-external" style="margin-top:6px; display:inline-flex; align-items:center; gap:4px;">
              Obtenir une clé gratuitement
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </a>` : ''}
        </div>
      </div>

      <div class="form-actions-left margin-top" style="display:flex; gap:10px;">
        <button type="submit" class="btn btn-primary btn-save-provider">${SVG_CHECK} Enregistrer</button>
        <button type="button" class="btn btn-outline btn-test-provider">${SVG_ZAP} Tester la connexion</button>
      </div>

      <div class="test-result"></div>
    </form>
  `;

  const form = card.querySelector('.provider-form');
  const keyInput = card.querySelector('.input-provider-key');
  const btnToggleKey = card.querySelector('.btn-toggle-key');
  const btnTest = card.querySelector('.btn-test-provider');
  const testResultEl = card.querySelector('.test-result');
  const btnDelete = card.querySelector('.btn-delete-provider');

  btnToggleKey.addEventListener('click', () => {
    if (keyInput.type === 'password') {
      keyInput.type = 'text';
      btnToggleKey.innerHTML = SVG_EYE_OFF;
    } else {
      keyInput.type = 'password';
      btnToggleKey.innerHTML = SVG_EYE;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    provider.name = card.querySelector('.input-provider-name').value.trim();
    provider.baseUrl = card.querySelector('.input-provider-url').value.trim();
    provider.model = card.querySelector('.input-provider-model').value.trim();
    provider.apiKey = keyInput.value.trim();

    await Storage.set({ aiProviders: settings.aiProviders });
    renderAiSection();
    updateSidebarCounters();
    showToast(`Configuration de "${provider.name}" enregistrée !`);
  });

  btnTest.addEventListener('click', async () => {
    const tempProvider = {
      ...provider,
      name: card.querySelector('.input-provider-name').value.trim(),
      baseUrl: card.querySelector('.input-provider-url').value.trim(),
      model: card.querySelector('.input-provider-model').value.trim(),
      apiKey: keyInput.value.trim()
    };

    testResultEl.className = 'test-result';
    testResultEl.textContent = 'Test de connexion en cours...';
    testResultEl.style.display = 'block';

    try {
      const res = await testAiConnection(tempProvider);
      testResultEl.className = 'test-result success';
      testResultEl.textContent = res.message;
    } catch (err) {
      testResultEl.className = 'test-result error';
      testResultEl.textContent = err.message;
    }
  });

  btnDelete.addEventListener('click', async () => {
    if (confirm(`Voulez-vous supprimer le fournisseur "${provider.name}" ?`)) {
      settings.aiProviders = settings.aiProviders.filter(p => p.id !== provider.id);
      if (settings.activeAiProviderId === provider.id) {
        settings.activeAiProviderId = settings.aiProviders[0]?.id || '';
      }
      await Storage.set({
        aiProviders: settings.aiProviders,
        activeAiProviderId: settings.activeAiProviderId
      });
      renderAiSection();
      updateSidebarCounters();
      showToast('Fournisseur supprimé');
    }
  });

  return card;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000);
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
