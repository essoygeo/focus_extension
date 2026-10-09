# 🎯 Focus

> L'extension Chrome qui transforme votre navigateur en salle de travail —
> et qui ferme la porte aux distractions. 🚪🔒

**Focus** est une extension Manifest V3 qui combine **gestion de tâches**,
**compte à rebours**, **blocage de sites perturbants** et **assistant IA**
intégré. Idéale pour les sessions de travail profond (deep work) où chaque
minute compte.

---

## ✨ Fonctionnalités

| | Fonctionnalité | Description |
|---|---|---|
| ✅ | **Tâches & minuteur** | Créez des tâches avec une durée, démarrez/pausez/reprenez un compte à rebours. |
| 🚫 | **Blocage de sites** | Les sites choisis sont redirigés vers une page « Focus » tant que vos tâches ne sont pas finies. |
| 🔔 | **Rappels intelligents** | Notification 10 min avant la fin, à la fin, et rappels répétés tous les 5 min tant que la tâche traîne. |
| 🤖 | **Assistant IA** | Discutez avec une IA (Gemini, Groq, OpenRouter ou personnalisé) sur le contexte de chaque tâche. |
| 📝 | **Notes** | Enregistrez les meilleures réponses de l'IA comme notes de tâche. |
| 🔒 | **100 % local** | Tâches, préférences et clés API restent dans `chrome.storage.local`. Rien ne part ailleurs (sauf vos questions à l'IA). |

---

## 🚀 Installation (mode développeur)

1. Ouvrez Chrome et allez sur `chrome://extensions`
2. Activez le **Mode développeur** (interrupteur en haut à droite)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier du projet `focus_extension/`
5. L'icône **Focus** apparaît dans la barre d'outils 🎉

> 💡 Pas de build, pas de `npm install`. C'est du HTML/CSS/JS pur. Simple comme bonjour.

---

## 🕹️ Démarrage en 30 secondes

1. Cliquez sur l'icône **Focus** → **+ Nouvelle tâche** (ex : « Rédiger le rapport », 25 min)
2. Cliquez sur **▶ Démarrer** : le compte à rebours tourne
3. Allez sur `facebook.com`… → 🚫 redirigé vers la page Focus. Bienvenue au club.
4. Terminez la tâche → le web s'ouvre à nouveau. Bravo ! 🏆

Le guide détaillé complet est ici 👉 **[GUIDE.md](GUIDE.md)**

---

## 🗂️ Structure du projet

```
focus_extension/
├── manifest.json          # Config de l'extension (MV3)
├── background.js          # Service worker : blocage DNR + alarmes + notifications
├── popup/                 # Fenêtre quand on clique sur l'icône
│   ├── popup.html/.css/.js
├── options/               # Page de configuration (sites, rappels, IA)
│   ├── options.html/.css/.js
├── blocked/               # Page affichée sur un site bloqué
│   ├── blocked.html/.css/.js
├── utils/
│   ├── storage.js         # Lecture/écriture chrome.storage + valeurs par défaut
│   └── ai.js              # Client API IA compatible OpenAI (streaming)
└── icons/
```

---

## 🤖 Configurer l'IA (optionnel)

L'assistant IA a besoin d'une clé API (gratuite chez la plupart des
fournisseurs) :

1. **Options** (roue ⚙️) → onglet **Fournisseurs IA**
2. Choisissez un préréglage :
   - **Google Gemini** → `https://aistudio.google.com/app/apikey`
   - **Groq** (ultra rapide) → `https://console.groq.com/keys`
   - **OpenRouter** (modèles gratuits) → `https://openrouter.ai/keys`
3. Collez votre clé, cliquez **Tester la connexion**, puis **Enregistrer**
4. Ouvrez une tâche → bouton **✨ IA** → discutez !

---

## 🧰 Technologies

- **Manifest V3** (service worker, `chrome.declarativeNetRequest`, `chrome.alarms`, `chrome.notifications`)
- **JavaScript ES Modules** — aucune dépendance, aucune compilation
- **CSS** fait main (glassmorphism, animations, responsive)
- API IA **compatible OpenAI** (`/chat/completions` avec streaming SSE)

---

## 🔐 Vie privée

- Toutes vos données restent **en local** dans votre navigateur.
- Les **clés API** sont stockées dans `chrome.storage.local` (jamais envoyées à un serveur tiers).
- Lorsque vous utilisez l'IA, **seuls** le titre/description de la tâche et vos
  questions sont transmis au fournisseur choisi.

---

## 📄 Licence

Projet personnel — voir avec l'auteur (`essoygeo`) pour toute réutilisation.
