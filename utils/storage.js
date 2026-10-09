/**
 * utils/storage.js - Focused state management for chrome.storage.local
 */

export const DEFAULT_AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini (Standard OpenAI)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    apiKey: '',
    keyUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'groq',
    name: 'Groq (Ultra Rapide)',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    apiKey: '',
    keyUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Modèles Gratuits)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash:free',
    apiKey: '',
    keyUrl: 'https://openrouter.ai/keys'
  }
];

export const DEFAULT_BLOCKED_SITES = [
  { id: 'site_1', domain: 'facebook.com', enabled: true },
  { id: 'site_2', domain: 'instagram.com', enabled: true },
  { id: 'site_3', domain: 'tiktok.com', enabled: true },
  { id: 'site_4', domain: 'x.com', enabled: true },
  { id: 'site_5', domain: 'youtube.com', enabled: true }
];

export const DEFAULT_REMINDERS = ['at_end', 'repeat_5m_after'];

export const Storage = {
  async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (res) => resolve(res));
    });
  },

  async set(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => resolve());
    });
  },

  async initializeDefaults() {
    const data = await this.get([
      'tasks',
      'blockedSites',
      'blockMode',
      'defaultReminders',
      'aiProviders',
      'activeAiProviderId'
    ]);

    const updates = {};
    if (!data.tasks) updates.tasks = [];
    if (!data.blockedSites) updates.blockedSites = DEFAULT_BLOCKED_SITES;
    if (!data.blockMode) updates.blockMode = 'any_uncompleted';
    if (!data.defaultReminders) updates.defaultReminders = DEFAULT_REMINDERS;
    if (!data.aiProviders) updates.aiProviders = DEFAULT_AI_PROVIDERS;
    if (!data.activeAiProviderId) updates.activeAiProviderId = 'gemini';

    if (Object.keys(updates).length > 0) {
      await this.set(updates);
    }
    return { ...data, ...updates };
  },

  async getTasks() {
    const res = await this.get('tasks');
    return res.tasks || [];
  },

  async saveTasks(tasks) {
    await this.set({ tasks });
  },

  async getSettings() {
    const res = await this.get([
      'blockedSites',
      'blockMode',
      'defaultReminders',
      'aiProviders',
      'activeAiProviderId'
    ]);

    return {
      blockedSites: res.blockedSites || DEFAULT_BLOCKED_SITES,
      blockMode: res.blockMode || 'any_uncompleted',
      defaultReminders: res.defaultReminders || DEFAULT_REMINDERS,
      aiProviders: res.aiProviders || DEFAULT_AI_PROVIDERS,
      activeAiProviderId: res.activeAiProviderId || 'gemini'
    };
  }
};
