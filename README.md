# 🎫 Bot Discord — Système de tickets

Bot Discord dont le **rôle sert uniquement aux tickets** : les membres cliquent
sur un bouton, un salon privé est créé pour eux et le staff, puis le ticket est
fermé (avec transcription) quand le problème est réglé.

Aucune autre fonctionnalité : pas de commandes de modération, pas de jeux.
Le bot ne fait que gérer les salons de tickets.

---

## 🚀 Mise en route

### 1. Installer Node.js (une seule fois)

https://nodejs.org → version **LTS** → installation par défaut.

### 2. Configurer le fichier `.env`

Ouvre `.env` et renseigne :

```
DISCORD_TOKEN=le_token_de_ton_bot
CLIENT_ID=l_application_id_de_ton_bot
```

- **Token** : https://discord.com/developers/applications → ton app → onglet *Bot* → *Reset Token*
- **Application ID** : onglet *General Information*

### 3. Inviter le bot (permissions minimales, juste pour les tickets)

```
https://discord.com/oauth2/authorize?client_id=TON_APPLICATION_ID&scope=bot+applications.commands&permissions=268553232
```

Ces permissions ne permettent au bot de **rien** faire d'autre que gérer les
salons de tickets (créer/supprimer des salons et gérer leurs accès).

### 4. Lancer le bot

Double-clique sur `lancer-le-bot.bat` (Windows), ou en terminal :

```
npm install
npm run deploy
npm start
```

`npm run deploy` enregistre la commande `/ticket` **globalement** : elle
fonctionne sur tous les serveurs où est le bot (jusqu'à 1 h d'attente).

---

## ⚙️ Configurer le système de tickets sur ton serveur

**Deux systèmes au choix** — chaque serveur prend celui qui lui plaît :

| Ton choix | Commande à taper | Résultat |
|---|---|---|
| 🔘 **BOUTON** | `/setup ticket bouton` | Le bot crée tout (catégorie 🎫 Tickets, salon #ouvrir-un-ticket, salon #tickets-logs), te fait choisir le(s) rôle(s) staff, puis publie le panneau avec le bouton « 🎫 Ouvrir un ticket » |
| 📋 **MENU** | `/setup ticket menu` | L'assistant s'ouvre : tu crées tes types de tickets (nom, emoji, description, catégorie, rôles staff), puis le panneau avec le menu déroulant des types est publié |

Une seule de ces deux commandes suffit : **tout le reste est automatique**.
Tu peux changer d'avis à tout moment en tapant l'autre commande.

### Configuration automatique complète (avancé)

```
/ticket setup
```

En une commande, le bot :
1. 📁 Crée la catégorie **🎫 Tickets**
2. 🎫 Crée le salon **#ouvrir-un-ticket** (avec le bouton)
3. 📜 Crée le salon **#tickets-logs** (transcriptions, réservé au staff)
4. 👥 Te demande ensuite de choisir le(s) rôle(s) du staff dans un menu —
   **tu peux sélectionner plusieurs rôles** (jusqu'à 10)
5. 🎉 Envoie le panneau et affiche le récapitulatif

Tu peux aussi personnaliser si tu le souhaites :
`/ticket setup categorie:… salon:… salon_logs:… role_staff:…`
(tout est facultatif — ce que tu ne précises pas est créé automatiquement)

## 🧩 Les types de tickets (comme Ticket Tool)

```
/setup ticket menu
```

Cet assistant (réservé à ceux qui ont « Gérer le serveur ») permet de créer
**plusieurs types de tickets**, exactement comme sur les gros serveurs :

1. **➕ Nouveau type** → tu donnes le nom du type (ex : « Problème Live »).
2. Ensuite, un **assistant guidé** t'emmène étape par étape, dans l'ordre :

   | Étape | Ce que c'est | Boutons |
   |---|---|---|
   | ✏️ 1/6 Le nom | nom vu par les membres + nom du salon | Renommer, ➡️ |
   | 😄 2/6 L'emoji | emoji devant le nom du type | Changer l'emoji, ⬅️ ➡️ |
   | 📝 3/6 La description | phrase sous le nom dans le menu | Modifier, ⬅️ ➡️ |
   | 📁 4/6 La catégorie | où les tickets de ce type sont créés | Choisir, ⬅️ ➡️ |
   | 🛡️ 5/6 Les rôles staff | qui voit et traite ce type (**plusieurs possibles**) | Ajouter / Retirer, ⬅️ ➡️ |
   | ✅ 6/6 Récapitulatif | résumé complet du type | Supprimer, ⬅️, Terminer |

   Chaque étape affiche une **explication** (💡) pour savoir exactement ce que
   tu règles, la **valeur actuelle**, et des boutons **⬅️ Retour / ➡️ Suivant**
   pour naviguer dans l'ordre sans te perdre.
3. **🎨 Textes du panneau** → titre du panneau, texte du panneau, et texte du
   sélecteur (« Choisissez le type de ticket... »).
4. **✅ Terminer** → publie le panneau dans le salon du panneau : un embed avec
   tes textes + un **menu déroulant des types**.

Quand un membre choisit un type dans le menu :
- le ticket est créé dans **la catégorie de ce type** ;
- seuls le membre, **les rôles staff de ce type** et le bot le voient
  (si le type n'a aucun rôle, les rôles staff du serveur sont utilisés) ;
- le nom du salon est `ticket-NUMERO-nom-du-type`.

Le panneau se met à jour tout seul à chaque fois que tu modifies un type et que
tu recliques sur « ✅ Terminer » (ou avec `/ticket panel`).

### Les autres commandes

| Commande | Qui | Effet |
|---|---|---|
| `/setup ticket bouton` | Admin | Système BOUTON : tout créer + panneau « 🎫 Ouvrir un ticket » |
| `/setup ticket menu` | Admin | Système MENU : assistant des types de tickets + textes du panneau |
| `/ticket panel [salon] [titre] [description]` | Admin | Renvoie le panneau |
| `/ticket config` | Staff | Affiche la configuration |
| `/ticket claim` | Staff | Prend en charge le ticket |
| `/ticket add membre:…` | Staff | Ajoute quelqu'un au ticket |
| `/ticket remove membre:…` | Staff | Retire quelqu'un du ticket |
| `/ticket close [raison]` | Staff | Ferme le ticket |

### Comment ça marche, concrètement

1. Un membre clique sur **🎫 Ouvrir un ticket** → une petite fenêtre lui demande
   son problème (facultatif).
2. Le bot crée un salon privé `#ticket-1-…` dans la catégorie : **seul le membre,
   tous les rôles staff et le bot** le voient.
3. Le staff clique sur **🔔 Prendre en charge** (ou fait `/ticket claim`).
4. Le staff aide le membre, puis clique sur **🔒 Fermer le ticket** puis
   confirme → le bot envoie la transcription dans le salon de logs, prévient le
   membre en MP, et supprime le salon 5 secondes après.
5. Un membre ne peut avoir qu'**un seul ticket ouvert** à la fois.

---

## 🌐 Hébergement 24h/24 (gratuit)

Le bot tourne tant que le programme tourne. Pour du 24h/24 **gratuit** :

### FadeHost — gratuit, sans carte bancaire, sans sommeil

1. Crée un compte sur https://fadehost.com (1 bot gratuit par compte)
2. Crée un bot → déploiement **depuis GitHub** :
   - Dépôt : `https://github.com/foxinou-b13/bot-ticket`
   - Branche : `main`
   - (Dépôt privé : autorise FadeHost à y accéder via "Configure GitHub App")
3. Variables d'environnement du bot :
   - `DISCORD_TOKEN` = le token de ton bot
   - `CLIENT_ID` = `1528495720158593074`
4. Clique **Déployer** → le bot reste en ligne 24h/24 (256 Mo de RAM,
   redémarrage automatique en cas de crash, région Europe/France)

### 🔄 Mises à jour automatiques

Tout le code vit dans le dépôt GitHub `bot-ticket`. Pour modifier le bot :

1. La modification est poussée sur GitHub (branche `main`)
2. FadeHost détecte le changement et **redéploie automatiquement**

Aucune autre action n'est nécessaire : le bot se met à jour tout seul.

### Alternative gratuite : ton PC

Garde ton PC allumé avec `lancer-le-bot.bat`. Le bot est en ligne tant que le
PC reste allumé.

> Note : le fichier `data.json` (compteur de tickets) est réinitialisé à chaque
> redéploiement. Les salons de tickets ouverts restent dans Discord.

---

## 🔒 Sécurité

- Le fichier `.env` contient le token : il n'est **jamais** envoyé sur GitHub
  (voir `.gitignore`). Sur l'hébergeur, les valeurs sont saisies dans les
  variables d'environnement.
- Ne partage jamais le token de ton bot.
