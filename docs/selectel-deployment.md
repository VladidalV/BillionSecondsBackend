# Деплой на Selectel — Вариант 2 (API + Managed PostgreSQL)

## Архитектура

```
billionseconds.app (DNS → 185.xxx.xxx.xxx)
         │
         ▼
    Плавающий IP
         │
         ▼
┌─────────────────────────────┐
│   Облачный сервер Ubuntu    │
│                             │
│  Nginx :443 (SSL)           │
│    └── proxy → :3000        │
│                             │
│  Docker: NestJS API :3000   │
│    ├── JWT auth             │
│    ├── FCM push             │
│    └── S3 client            │
└──────────────┬──────────────┘
               │ внутренняя сеть
               │ 10.0.x.x
               ▼
┌─────────────────────────────┐
│  Managed PostgreSQL 16      │
│  billion_seconds DB         │
│  авто-бэкапы + мониторинг  │
└─────────────────────────────┘
               +
┌─────────────────────────────┐
│  Объектное хранилище S3     │
│  billionseconds-media       │
└─────────────────────────────┘
```

## Примерная стоимость

| Сервис | ~Цена/мес |
|--------|-----------|
| Облачный сервер 2 vCPU / 4 GB | ~1 200 ₽ |
| Плавающий IP | ~150 ₽ |
| Managed PostgreSQL минимум | ~1 500 ₽ |
| Объектное хранилище (< 10 GB) | ~50 ₽ |
| DNS-хостинг | бесплатно |
| **Итого** | **~2 900 ₽/мес** |

> Актуальные цены: [Калькулятор Selectel](https://selectel.ru/services/cloud/calculator/)

---

## Шаг 1. Регистрация и подготовка аккаунта

1. Зайти на [selectel.ru](https://selectel.ru) → Регистрация
2. Подтвердить email + телефон
3. Пополнить баланс (минимум 3 000 ₽)
4. Панель управления → **Создать проект** → назвать `billionseconds-prod`

---

## Шаг 2. SSH-ключ

На локальной машине:
```bash
ssh-keygen -t ed25519 -C "selectel-billionseconds"
# Сохранить в ~/.ssh/selectel_billionseconds
cat ~/.ssh/selectel_billionseconds.pub
```

В панели Selectel: **Облачные вычисления → SSH-ключи → Добавить ключ** → вставить публичный ключ.

---

## Шаг 3. Облачный сервер (API)

**Облачные вычисления → Серверы → Создать сервер**

| Параметр | Значение |
|----------|----------|
| Имя | `billionseconds-api` |
| Регион | Москва (ru-1) или Санкт-Петербург (ru-2) |
| Зона доступности | `ru-1a` / `ru-2a` |
| ОС | Ubuntu 22.04 LTS |
| vCPU | 2 |
| RAM | 4 GB |
| Диск | 30 GB SSD (NVMe) |
| Сеть | Создать новую сеть `billionseconds-network` |
| Публичный IP | **Не назначать** — плавающий IP привяжем отдельно |
| SSH-ключ | Выбрать добавленный ключ |

> Запомни внутренний IP сервера (например `10.0.0.5`) — понадобится для подключения к БД.

---

## Шаг 4. Плавающий IP

**Облачные вычисления → Плавающие IP → Зарезервировать**

- Регион: тот же, что у сервера
- После создания: **Привязать → выбрать `billionseconds-api`**

Запиши полученный IP (например `185.xxx.xxx.xxx`) — это будет адрес домена.

---

## Шаг 5. Managed PostgreSQL

**Облачные базы данных → Создать кластер**

| Параметр | Значение |
|----------|----------|
| Имя | `billionseconds-db` |
| СУБД | PostgreSQL 16 |
| Конфигурация | **Minimum** (1 vCPU, 2 GB RAM) |
| Диск | 20 GB SSD |
| Сеть | `billionseconds-network` (та же, что у сервера!) |
| Публичный доступ | **Выключить** — только внутренняя сеть |

После создания (5-10 минут):
- **Пользователи → Создать**: логин `billionseconds_user` + придумать пароль
- **Базы данных → Создать**: `billion_seconds`
- Скопировать connection string: `postgres://billionseconds_user:PASSWORD@10.0.x.x:5432/billion_seconds`

---

## Шаг 6. Объектное хранилище (S3)

**Объектное хранилище → Создать контейнер**

| Параметр | Значение |
|----------|----------|
| Имя | `billionseconds-media` |
| Тип | Приватный |
| Регион | Тот же |

Затем: **Управление доступом → Создать S3-ключи**
- Сохрани `Access Key` и `Secret Key`
- Endpoint: `s3.ru-1.storage.selcloud.ru`

---

## Шаг 7. DNS

**В панели Selectel: DNS-хостинг → Добавить зону → `billionseconds.app`**

Добавить записи:
```
A    @      185.xxx.xxx.xxx
A    www    185.xxx.xxx.xxx
```

В регистраторе домена (Namecheap/GoDaddy) сменить NS на:
```
ns1.selectel.org
ns2.selectel.org
ns3.selectel.org
ns4.selectel.org
```

> Propagation DNS: 1–24 часа.

---

## Шаг 8. Настройка сервера

Подключиться:
```bash
ssh -i ~/.ssh/selectel_billionseconds ubuntu@185.xxx.xxx.xxx
```

### Установить Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker
```

### Установить Nginx + Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Настроить firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Шаг 9. Деплой бэкенда

```bash
git clone https://github.com/YOUR_USERNAME/BillionSecondsBackend.git
cd BillionSecondsBackend
cp .env.example .env
nano .env
```

Содержимое `.env`:
```env
NODE_ENV=production
PORT=3000

# Из Managed DB (внутренний IP кластера)
DB_HOST=10.0.x.x
DB_PORT=5432
DB_USERNAME=billionseconds_user
DB_PASSWORD=YOUR_DB_PASSWORD
DB_DATABASE=billion_seconds
DB_SSL=false

# Сгенерировать: openssl rand -base64 48
JWT_ACCESS_SECRET=сюда_длинную_случайную_строку
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=сюда_другую_длинную_строку
JWT_REFRESH_EXPIRES_IN=30d

APPLE_CLIENT_ID=com.yourcompany.billionseconds
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Из Selectel Object Storage
S3_ENDPOINT=s3.ru-1.storage.selcloud.ru
S3_BUCKET=billionseconds-media
S3_ACCESS_KEY=YOUR_ACCESS_KEY
S3_SECRET_KEY=YOUR_SECRET_KEY
S3_REGION=ru-1
```

Загрузить Firebase service account JSON (с локальной машины):
```bash
scp -i ~/.ssh/selectel_billionseconds firebase-service-account.json ubuntu@185.xxx.xxx.xxx:~/BillionSecondsBackend/
```

Обновить `docker-compose.yml` — убрать сервис postgres (БД теперь managed), оставить только API:
```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./firebase-service-account.json:/app/firebase-service-account.json:ro
    restart: unless-stopped
```

Запустить:
```bash
docker compose up -d --build
docker compose logs -f
```

Запустить миграции:
```bash
docker compose exec api npm run migration:run
```

---

## Шаг 10. Nginx + SSL

```bash
sudo nano /etc/nginx/sites-available/billionseconds
```

```nginx
server {
    listen 80;
    server_name billionseconds.app www.billionseconds.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/billionseconds /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL-сертификат (Let's Encrypt, бесплатно)
sudo certbot --nginx -d billionseconds.app -d www.billionseconds.app
```

Certbot автоматически настроит HTTPS и обновление сертификата.

---

## Шаг 11. Скрипт обновления

```bash
cat > ~/deploy.sh << 'EOF'
#!/bin/bash
cd ~/BillionSecondsBackend
git pull
docker compose up -d --build
docker compose exec api npm run migration:run
EOF
chmod +x ~/deploy.sh
```

Для обновления сервера в будущем: `./deploy.sh`

---

## Проверка после деплоя

```bash
# API отвечает
curl https://billionseconds.app/api/v1/health

# Логи контейнера
docker compose logs -f api

# Статус nginx
sudo systemctl status nginx
```
