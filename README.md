# ScreenHub — Gestión de Carteleras Digitales

Plataforma web para administrar pantallas digitales con galerías de contenido (imagen, video, iframe).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 15 |
| Archivos | Google Cloud Storage (o disco local) |
| Proceso | PM2 |
| Reverse proxy | Nginx |
| Nube | GCP Compute Engine |

---

## Estructura del proyecto

```
screenhub2026/
├── client/          # React frontend (Vite)
├── server/          # Express API
│   └── src/
│       ├── db/migrations/001_initial.sql
│       ├── controllers/
│       ├── routes/
│       └── middleware/
├── deploy/
│   ├── setup-vm.sh      # Instalación inicial en VM
│   ├── deploy.sh        # Actualizar deploy
│   ├── nginx.conf       # Configuración Nginx
│   └── ecosystem.config.js  # PM2
└── .env.example
```

---

## Desarrollo local

### 1. Requisitos
- Node.js 20+
- PostgreSQL 15

### 2. Clonar e instalar
```bash
git clone <repo>
cd screenhub2026

# Backend
cd server && npm install
cd ../client && npm install
```

### 3. Base de datos
```bash
createdb screenhub
psql -d screenhub -f server/src/db/migrations/001_initial.sql
```

### 4. Variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 5. Ejecutar
```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Abrir: http://localhost:5173
Login: `admin@screenhub.com` / `password`

---

## Despliegue en GCP Compute Engine

### 1. Crear VM
- **OS**: Ubuntu 22.04 LTS
- **Tipo**: e2-medium (2 vCPU, 4 GB) mínimo recomendado
- **Disco**: 50 GB SSD
- **Firewall**: Permitir tráfico HTTP (80) y HTTPS (443)

```bash
# Crear con gcloud CLI
gcloud compute instances create screenhub-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server

# Reglas de firewall (si no existen)
gcloud compute firewall-rules create allow-http --allow tcp:80 --target-tags=http-server
gcloud compute firewall-rules create allow-https --allow tcp:443 --target-tags=https-server
```

### 2. Conectarse a la VM
```bash
gcloud compute ssh screenhub-vm --zone=us-central1-a
```

### 3. Setup inicial (solo primera vez)
```bash
# En la VM:
# Clonar repo y copiar scripts
git clone <repo> /tmp/screenhub-setup
cd /tmp/screenhub-setup

# Copiar nginx config a /tmp para que setup-vm.sh lo encuentre
cp deploy/nginx.conf /tmp/screenhub-nginx.conf

# Ejecutar setup
sudo bash deploy/setup-vm.sh
```

### 4. Clonar app y configurar
```bash
cd /opt/screenhub
sudo git clone <repo> .
sudo chown -R screenhub:screenhub /opt/screenhub

cp .env.example .env
nano .env   # Configurar DB_PASSWORD, JWT_SECRET, etc.
```

### 5. Instalar dependencias y build
```bash
# Instalar dependencias del servidor
cd server && npm install --omit=dev

# Build del cliente
cd ../client && npm install && npm run build
```

### 6. Ejecutar migración SQL
```bash
psql -U screenhub_user -d screenhub -h localhost \
  -f /opt/screenhub/server/src/db/migrations/001_initial.sql
```

### 7. Iniciar con PM2
```bash
mkdir -p /var/log/screenhub
pm2 start /opt/screenhub/deploy/ecosystem.config.js --env production
pm2 save
pm2 startup   # Seguir las instrucciones que muestra
```

### 8. Verificar
```bash
pm2 status
curl http://localhost:4000/health
```

Acceder por la **IP externa** de la VM: `http://<EXTERNAL-IP>`

---

## Actualizar deploy
```bash
cd /opt/screenhub
sudo bash deploy/deploy.sh
```

---

## Google Cloud Storage (opcional para archivos grandes)

1. Crear un bucket en GCS
2. Crear service account con rol `Storage Object Admin`
3. Descargar la clave JSON
4. Configurar en `.env`:
```env
GCS_BUCKET_NAME=screenhub-media
GOOGLE_APPLICATION_CREDENTIALS=/opt/screenhub/sa-key.json
```

Sin GCS, los archivos se guardan localmente en `server/uploads/`.

---

## Funcionalidades

- **Dashboard** — resumen de pantallas y contenidos
- **Pantallas** — CRUD completo, estados (activa/inactiva/mantenimiento)
- **Galería de contenido** — por pantalla, con drag & drop para reordenar
- **Tipos de contenido**: imagen, video, iframe (URL externa)
- **Reproductor** — `/player/:id` vista fullscreen para montar en la pantalla física
  - Cicla automáticamente según duración configurada
  - Recarga el contenido cada 5 minutos
- **Upload** — sube imágenes/videos directo desde la UI (GCS o disco local)
