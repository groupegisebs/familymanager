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
| `FAMIREPERE_MAIL_HOST` | aucun courriel |
| `FAMIREPERE_MAIL_PORT` | `587` |
| `FAMIREPERE_MAIL_USER` | aucun courriel |
| `FAMIREPERE_MAIL_PASSWORD` | aucun courriel |
| `FAMIREPERE_MAIL_FROM` | la valeur de `FAMIREPERE_MAIL_USER` |

Avec `FAMIREPERE_MAIL_HOST`, un parent dont l’identifiant est une adresse reçoit un courriel quand l’autre parent enregistre un rendez-vous, une dépense, un document ou un paiement. Un rappel des sept prochains jours part une fois par jour.

Si les deux secrets d’administration sont présents, le premier démarrage crée le super administrateur avec cette adresse comme identifiant. Aucun nom ni aucune date de naissance n’est enregistré. Le mot de passe reste dans les secrets GitHub.

Le service systemd s’appelle `famirepere` et écoute le port `55091`. Placez un reverse proxy HTTPS devant ce port.
