/**
 * utils/ai.js - AI API Handler for OpenAI-compatible services (Gemini, Groq, OpenRouter, Custom)
 */

export function cleanBaseUrl(url) {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/chat/completions')) {
    clean += '/chat/completions';
  }
  return clean;
}

export async function testAiConnection(provider) {
  if (!provider.apiKey || !provider.apiKey.trim()) {
    throw new Error("Veuillez saisir une clé API avant de tester la connexion.");
  }
  if (!provider.baseUrl || !provider.baseUrl.trim()) {
    throw new Error("Veuillez spécifier l'URL de base de l'API.");
  }
  if (!provider.model || !provider.model.trim()) {
    throw new Error("Veuillez spécifier un nom de modèle.");
  }

  const endpoint = cleanBaseUrl(provider.baseUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: provider.model.trim(),
        messages: [
          { role: 'user', content: 'Réponds par un seul mot: OK' }
        ],
        max_tokens: 5
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, message: ' Connexion réussie ! Le fournisseur répond correctement.' };
    }

    let errorMsg = `Erreur HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      errorMsg = ' Clé API invalide ou accès refusé (Code 401/403).';
    } else if (response.status === 429) {
      errorMsg = ' Quota gratuit atteint ou limite de requêtes dépassée (Erreur 429).';
    } else if (response.status === 404) {
      errorMsg = ' Endpoint ou nom de modèle introuvable (Erreur 404). Vérifiez l\'URL et le modèle.';
    } else {
      try {
        const errJson = await response.json();
        if (errJson && errJson.error && errJson.error.message) {
          errorMsg += ` : ${errJson.error.message}`;
        }
      } catch (e) {}
    }
    throw new Error(errorMsg);

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(' Délai de connexion dépassé (Timeout de 12s). Vérifiez l\'URL de l\'API.');
    }
    if (err.message && err.message.startsWith(' ')) {
      throw err;
    }
    throw new Error(` Erreur de connexion réseau : ${err.message || 'Impossible d\'atteindre l\'API.'}`);
  }
}

export async function askAiStream({ provider, taskTitle, taskDescription, chatHistory = [], onChunk, signal }) {
  if (!provider || !provider.apiKey) {
    throw new Error("Clé API absente. Veuillez configurer votre fournisseur IA dans les options de Focus.");
  }

  const endpoint = cleanBaseUrl(provider.baseUrl);
  
  const systemPrompt = `Vous êtes un assistant de productivité expert intégré à l'extension Chrome Focus. 
Fournissez des réponses très bien structurées en français (utilisez le formatage Markdown avec des puces, du texte en gras, des sous-titres et des étapes). 
Vous assistez l'utilisateur sur sa tâche intitulée "${taskTitle}"${taskDescription ? ` (Description: ${taskDescription})` : ''}.`;

  const payloadMessages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(m => ({ role: m.role, content: m.content }))
  ];

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: provider.model.trim(),
        messages: payloadMessages,
        stream: true
      }),
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error("Génération annulée.");
    }
    throw new Error(`Erreur réseau : ${err.message || 'Impossible de contacter le serveur IA.'}`);
  }

  if (!response.ok) {
    let errorDetails = `Erreur ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      errorDetails = "Clé API invalide ou non autorisée. Vérifiez la clé dans les options.";
    } else if (response.status === 429) {
      errorDetails = "Quota gratuit atteint ou limite de fréquence dépassée (Erreur 429). Réessayez plus tard.";
    } else {
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errorDetails += ` : ${errJson.error.message}`;
        }
      } catch (e) {}
    }
    throw new Error(errorDetails);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') continue;

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.substring(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed.choices?.[0]?.delta?.content || '';
          if (chunk) {
            fullContent += chunk;
            if (onChunk) onChunk(fullContent, chunk);
          }
        } catch (e) {}
      }
    }
  }

  if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
    try {
      const jsonStr = buffer.trim().substring(6);
      const parsed = JSON.parse(jsonStr);
      const chunk = parsed.choices?.[0]?.delta?.content || '';
      if (chunk) {
        fullContent += chunk;
        if (onChunk) onChunk(fullContent, chunk);
      }
    } catch (e) {}
  }

  if (!fullContent) {
    fullContent = "Aucune réponse retournée par l'IA.";
    if (onChunk) onChunk(fullContent, fullContent);
  }

  return fullContent;
}
