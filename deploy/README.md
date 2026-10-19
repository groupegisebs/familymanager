# Déploiement FamiRepère

Même schéma que les autres applications GISE : GitHub Actions, SSH, systemd. La base est un fichier SQLite, pas PostgreSQL.

## Préparer le serveur Ubuntu

1. Installer le runtime .NET 10.
2. Autoriser l’utilisateur `ubuntu` à gérer le service :

```bash
sudo tee /etc/sudoers.d/famirepere >/dev/null <<'EOF'
ubuntu ALL=(root) NOPASSWD: /bin/systemctl start famirepere, /bin/systemctl stop famirepere, /bin/systemctl restart famirepere, /bin/systemctl enable famirepere, /bin/systemctl daemon-reload, /bin/systemctl status famirepere, /usr/bin/mv /tmp/famirepere.service /etc/systemd/system/famirepere.service
EOF
```

3. Créer les dossiers, une seule fois :

```bash
sudo mkdir -p /opt/apps/famirepere/data /opt/apps/famirepere/app
sudo chown -R ubuntu:ubuntu /opt/apps/famirepere
```

4. Ajouter les secrets décrits dans `GITHUB-SECRETS.md`.
5. Pousser sur `main`. Le workflow construit l’interface, publie `FamiRepere.Server.dll` et redémarre le service.

La base reste dans `/opt/apps/famirepere/data/famirepere.db`. Le `rsync` ne touche que `/opt/apps/famirepere/app`.

## Développement local

```bash
dotnet run --project server/FamiRepere.Server
npm run dev
```

L’API écoute `http://localhost:5088`. Vite proxifie `/api` depuis `http://localhost:5173`.
