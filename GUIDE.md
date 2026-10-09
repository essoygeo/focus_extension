# 🎯 Focus — Guide d'utilisation

Bienvenue ! Ce guide vous apprend à dompter **Focus** en 5 minutes, sans jargon.
Promis. 🤝

---

## 📖 Sommaire

1. [C'est quoi Focus ?](#1-cest-quoi-focus-)
2. [Installer l'extension](#2-installer-lextension-)
3. [Créer sa première tâche](#3-créer-sa-première-tâche-)
4. [Le compte à rebours](#4-le-compte-à-rebours-)
5. [Bloquer les sites qui vous distraient](#5-bloquer-les-sites-qui-vous-distraient-)
6. [La page « Bloqué »](#6-la-page--bloqué-)
7. [Les notifications](#7-les-notifications-)
8. [Parler à l'IA](#8-parler-à-lia-)
9. [Astuces de pro](#9-astuces-de-pro-)
10. [Dépannage](#10-dépannage-)

---

## 1. C'est quoi Focus ?

Imaginez un **coach** qui vit dans votre navigateur :

- Vous lui dites *« Je dois bosser 25 minutes sur ça »* → il chronomètre ⏱️
- Dès que vous titubez vers YouTube → il **bloque le site** 🚫
- Vous êtes bloqué sur une question → il vous **répond avec l'IA** 🤖

C'est tout. Pas de compte, pas de cloud, pas d'abonnement. Juste vous, vos tâches,
et un peu de discipline.

---

## 2. Installer l'extension 🧩

1. Ouvrez Chrome, tapez `chrome://extensions` dans la barre d'adresse
2. En haut à droite, activez le **Mode développeur**
3. Cliquez **Charger l'extension non empaquetée**
4. Choisissez le dossier `focus_extension`
5. 📌 Épinglez l'icône Focus : cliquez sur l'icône puzzle 🧩 dans la barre d'outils, puis l'épingle à côté de Focus

✅ **Réflexe important** : après toute modification du code, revenez sur
`chrome://extensions` et cliquez sur le bouton **🔄 Recharger** de l'extension.

---

## 3. Créer sa première tâche 📝

1. Cliquez sur l'icône **Focus** dans la barre d'outils
2. Cliquez sur **+ Nouvelle tâche**
3. Remplissez :
   - **Titre** — ex : « Rédiger l'intro du rapport » *(obligatoire)*
   - **Description** — détails, facultatif *(l'IA s'en servira comme contexte)*
   - **Durée prévue** — en minutes, ex : `25` *(obligatoire)*
4. Choisissez vos **rappels** (voir §7)
5. Cliquez **Enregistrer la tâche**

La tâche apparaît dans la liste avec son statut : **À faire**, **En cours**,
**En retard** ou **Terminée**. Utilisez les onglets en haut pour filtrer.

---

## 4. Le compte à rebours ⏱️

Sur chaque tâche :

| Bouton | Effet |
|---|---|
| **▶ Démarrer** | Lance le minuteur (statut → *En cours*) |
| **⏸ Pause** | Met le minuteur en pause |
| **✓ Terminer** | Marque la tâche comme faite (statut → *Terminée*) |
| **✨ IA** | Ouvre le chat IA sur cette tâche (§8) |

Tant qu'une tâche est *En cours*, vos sites bloqués le restent. 🔒

---

## 5. Bloquer les sites qui vous distraient 🚫

Ouvrez les **Options** : roue ⚙️ dans le popup, ou
`chrome://extensions` → Focus → **Détails** → **Options de l'extension**.

### 5.1 La liste des sites

- **Ajouter** : tapez un domaine et cliquez **Ajouter un site**
  - Formats acceptés (l'extension nettoie toute seule 😎) :
    - `facebook.com`
    - `https://facebook.com`
    - `www.facebook.com/feed`
    - tous finissent par devenir → `facebook.com`
- **Supprimer** : icône 🗑️ à droite de chaque ligne

Par défaut, Focus bloque déjà : `facebook.com`, `instagram.com`, `tiktok.com`,
`x.com`, `youtube.com`.

### 5.2 Les deux modes de blocage

Choisissez la règle qui vous correspond :

| Mode | Quand ça bloque | Pour qui ? |
|---|---|---|
| **Bloquer tant qu'au moins une tâche n'est pas terminée** | Dès qu'il reste une tâche non finie, même sans minuteur en marche | Ceux qui veulent un *hard mode* |
| **Bloquer uniquement lorsqu'une tâche est « en cours »** | Seulement pendant qu'un compte à rebours tourne | Ceux qui veulent rester flexible |

> 💡 Astuce : commencez par le second mode, puis passez au premier quand vous
> aurez le goût du travail profond. 😈

---

## 6. La page « Bloqué » 🔴

Quand vous tentez d'ouvrir un site bloqué, Focus affiche une jolie page
« Focus » qui récapitule :

- ⏳ Le **temps restant** de vos tâches
- 📋 Vos **tâches en cours** avec leur progression (anneau animé)
- 🟢 Un bouton **Terminer** pour valider une tâche et… débloquer le web
- 🔄 Un bouton pour **revenir en arrière**

**Le déblocage est mérité, pas magique** : finissez vos tâches (ou épuisez le
minuteur selon le mode choisi) et les sites se rouvrent tout seuls.

---

## 7. Les notifications 🔔

À la création d'une tâche, cochez les rappels voulus :

| Rappel | Ce qui se passe |
|---|---|
| ☑ **10 minutes avant la fin** | Une notification vous prévient qu'il reste 10 min |
| ☑ **À la fin de la durée prévue** | Notification « c'est l'heure ! » à la fin du minuteur |
| ☑ **Toutes les 5 minutes tant que non terminée** | Focus vous relance jusqu'à ce que la tâche soit finie (attention, c'est insistant 😅) |

Depuis la notification, deux boutons :
- **✔ Terminée** → marque la tâche finie
- **⏰ +5 min (Snooze)** → reporte le rappel de 5 minutes

---

## 8. Parler à l'IA 🤖

### 8.1 Configurer un fournisseur (une fois)

1. **Options** → onglet **Fournisseurs IA**
2. Choisissez un préréglage :

| Fournisseur | où obtenir une clé gratuite |
|---|---|
| **Google Gemini** | https://aistudio.google.com/app/apikey |
| **Groq** | https://console.groq.com/keys |
| **OpenRouter** | https://openrouter.ai/keys |
| **Personnalisé** | toute API compatible OpenAI (`/chat/completions`) |

3. Collez votre **clé API**, cliquez **Tester la connexion**, puis **Enregistrer**
4. Vos clés restent **locales** dans votre navigateur. 🔐

### 8.2 Discuter avec l'IA

1. Dans le popup, cliquez sur **✨ IA** sur une tâche
2. Choisissez le **fournisseur** dans la barre du haut
3. Utilisez un **raccourci** ou tapez votre question :
   - 💡 *Expliquer* — pédagogue
   - 📋 *Plan d'action* — étapes concrètes
   - ⏱️ *Temps estimé* — réaliste
   - 📚 *Ressources* — liens & méthodes
4. L'IA connaît le contexte de la tâche et garde le fil de la conversation
5. **💾 Enregistrer en note** sur une réponse pour la garder (bouton **Notes** pour relire)
6. 🔄 La flèche circulaire en haut **réinitialise** la discussion

> ⚠️ Seuls le texte de la tâche et vos questions partent au fournisseur IA.
> C'est écrit noir sur blanc dans le panneau.

---

## 9. Astuces de pro 💎

- **La règle des 25 minutes** : durée par défaut = `25` (technique Pomodoro).
  Après 4 cycles, prenez une vraie pause de 15 min. ☕
- **Description utile** : plus votre description de tâche est précise, meilleures
  sont les réponses de l'IA.
- **Hard mode** : ajoutez vos « péchés mignons » (`twitch.tv`, `reddit.com`…) et
  activez le mode strict. Votre futur vous vous remerciera.
- **Notes = culture personnelle** : sauvegardez les réponses IA réutilisables,
  vous construisez votre mini base de connaissances.

---

## 10. Dépannage 🔧

| Problème | Solution |
|---|---|
| Les sites ne se bloquent pas | Rechargez l'extension (`chrome://extensions` → 🔄). Vérifiez que le site est bien dans la liste et que le mode correspond. |
| Un site reste bloqué après suppression | Rechargez la page du site (F5). Si le souci persiste, rechargez l'extension. |
| L'IA ne répond pas | Options → Fournisseurs IA → **Tester la connexion**. Vérifiez la clé API et le modèle. |
| Pas de notifications | Vérifiez les autorisations de notifications de Chrome pour l'extension. |
| Après une modif du code, rien ne change | Il *faut* recharger l'extension (🔄), c'est la vie du mode développeur. |
| Repartir de zéro | `chrome://extensions` → révoquer l'extension → la recharger. Les valeurs par défaut reviennent. |

---

## 🎉 Voilà !

Vous savez tout. Une tâche, un minuteur, un site bloqué… et le travail avance.
Bon courage, et bienvenue dans le **mod**e Focus. 🧘♂️

*— L'équipe Focus (enfin, surtout vous et votre discipline)*
