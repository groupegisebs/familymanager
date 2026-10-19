# Secrets GitHub — FamiRepère

Le workflow `.github/workflows/deploy-production.yml` publie l’interface et l’API .NET, puis les copie sur le serveur par SSH. La base SQLite vit dans `/opt/apps/famirepere/data` et n’est pas écrasée par le déploiement.

## Obligatoires

| Secret | Rôle |
| --- | --- |
| `FAMIREPERE_SSH_HOST` ou `SSH_HOST_UBUNTU1` | Adresse du serveur |
| `FAMIREPERE_SSH_PRIVATE_KEY` ou `SSH_PRIVATE_KEY_UBUNTU1` | Clé privée SSH |

## Optionnels

| Secret | Défaut |
| --- | --- |
| `FAMIREPERE_SSH_USER` | `ubuntu` |
| `FAMIREPERE_SSH_PORT` | `22` |
| `FAMIREPERE_ADMIN_EMAIL` | aucun compte semé |
| `FAMIREPERE_ADMIN_PASSWORD` | aucun compte semé |
| `FAMIREPERE_MAIL_API_KEY` | aucun courriel |
| `FAMIREPERE_MAIL_CLIENT_CODE` | `FAMIREPERE` |

Les courriels passent par GiseMailSender (`https://gisemailsender.gisebs.com`). Le secret est le jeton API de l’application cliente, en général `FAMIREPERE`. Le modèle `FAMIREPERE_PARENT` est créé au premier envoi avec les variables `Subject` et `HtmlBody`. Un parent dont l’identifiant est une adresse reçoit un courriel quand l’autre parent enregistre un rendez-vous, une dépense, un document ou un paiement. Un rappel des sept prochains jours part une fois par jour.

Si les deux secrets d’administration sont présents, le premier démarrage crée le super administrateur avec cette adresse comme identifiant. Aucun nom ni aucune date de naissance n’est enregistré. Le mot de passe reste dans les secrets GitHub.

Le service systemd s’appelle `famirepere` et écoute le port `55091`. Placez un reverse proxy HTTPS devant ce port.
