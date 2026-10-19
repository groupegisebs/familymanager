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

Le service systemd s’appelle `famirepere` et écoute le port `55091`. Placez un reverse proxy HTTPS devant ce port. Le premier visiteur crée le compte du père ; aucun mot de passe n’est semé.
