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

**Tout est automatique** : une seule commande suffit.

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

### Les autres commandes

| Commande | Qui | Effet |
|---|---|---|
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
