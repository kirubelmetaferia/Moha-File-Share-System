# 🚀 MOHA File Share System

A full-stack file sharing system built with:

## Technology Stack

### Frontend

* React.js
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

### Backend

* Node.js
* Express.js
* TypeScript

### Database

* MySQL (Docker Container)

### Development Tools

* Git
* Docker
* Docker Compose

---

# 📌 Project Structure

```
Moha-File-Share-System
│
├── Backend        # Node.js + Express API
│
├── Frontend       # React + TypeScript UI
│
├── docker-compose.yml  # MySQL Database Container
│
└── README.md
```

---

# ⚙️ Prerequisites

Before starting, install:

## Required Software

### Node.js

Check:

```bash
node -v
```

Recommended:

```
Node.js >= 20
```

---

### npm

Check:

```bash
npm -v
```

---

### Git

Check:

```bash
git --version
```

---

### Docker

Check:

```bash
docker --version
```

---

### Docker Compose

Check:

```bash
docker compose version
```

---

# 1. Clone Repository

Clone the project:

```bash
git clone <repository-url>
```

Move into project:

```bash
cd Moha-File-Share-System
```

---

# 2. Setup Database (MySQL)

The project uses MySQL through Docker.

From the project root:

```bash
docker compose up -d
```

Check running containers:

```bash
docker ps
```

Expected:

```
moha-file-share-mysql
```

---

# 3. Backend Setup

Move to backend:

```bash
cd Backend
```

Install dependencies:

```bash
npm install
```

---

## Create Environment File

Create:

```
Backend/.env
```

Add:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=apppassword
DB_NAME=moha_file_share

JWT_SECRET=your_secret_key
```

---

## Start Backend

Development mode:

```bash
npm run dev
```

Expected:

```
✅ MySQL Connected
🚀 Server running on port 5000
```

Backend URL:

```
http://localhost:5000
```

---

# 4. Frontend Setup

Open another terminal.

Move to frontend:

```bash
cd Frontend
```

Install dependencies:

```bash
npm install
```

---

## Create Environment File

Create:

```
Frontend/.env
```

Add:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Start Frontend

Run:

```bash
npm run dev
```

Frontend URL:

```
http://localhost:5173
```

---

# 5. Development Workflow

## Before Starting Work

Always pull the latest changes:

```bash
git pull origin main
```

---

## Create Your Own Branch

Do not directly work on main.

Example:

```bash
git checkout -b feature/login
```

Naming examples:

```
feature/authentication
feature/file-upload
feature/dashboard
fix/navbar-error
```

---

# 6. Commit Rules

Use clear commit messages:

Examples:

```
feat: create login API
feat: add file upload component
fix: solve database connection issue
style: update dashboard UI
docs: update README
```

---

# 7. Push Your Work

After completing your task:

```bash
git add .
```

Commit:

```bash
git commit -m "feat: add authentication module"
```

Push:

```bash
git push origin feature/login
```

Then create a Pull Request.

---

# 8. Useful Commands

## Check Changes

```bash
git status
```

---

## Update Your Branch

```bash
git pull origin main
```

---

## Stop Database

From root:

```bash
docker compose down
```

---

## Restart Database

```bash
docker compose up -d
```

---

# 🔥 Development Order

Team should follow this order:

## Backend

1. Database Design
2. Authentication
3. User Management
4. File Upload
5. Folder Management
6. File Sharing
7. Activity Logs

---

## Frontend

1. Project Layout
2. Routing
3. Authentication Pages
4. Dashboard
5. File Explorer
6. Upload Interface
7. Sharing Interface

---

# Team Rules

✅ Do not commit `.env` files

✅ Do not commit `node_modules`

✅ Always create a branch before coding

✅ Pull latest changes before starting work

✅ Create Pull Request before merging

✅ Write meaningful commit messages

---

# First Time Setup Checklist

After cloning:

☐ Install Node.js

☐ Install Docker

☐ Clone repository

☐ Start MySQL container

☐ Setup Backend `.env`

☐ Run Backend

☐ Setup Frontend `.env`

☐ Run Frontend

☐ Confirm application works

---

# Contact / Team Notes

For any setup issue:

1. Check README first
2. Check Git branch status
3. Check Docker container status
4. Share error logs with the team

---

# 🚢 Production Operations

## Deployment

1. Ensure you have copied `.env.example` to `.env` in both Frontend and Backend, replacing placeholder values with secure, production-grade secrets.
2. Start the full application stack:
   ```bash
   docker compose up -d --build
   ```
3. Run database migrations to ensure the schema is up to date:
   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```
4. (Optional) Run the seed script on a fresh deployment:
   ```bash
   docker compose exec backend npm run db:reset
   ```

## 🔒 Security & HTTPS

This application is configured for standard HTTP by default. For production deployments, it is **highly recommended** to place the application behind a reverse proxy (like Nginx, AWS ALB, or Traefik) that handles SSL/TLS termination. Configure the reverse proxy to forward traffic to the Frontend container (port 80 inside, exposed via 5173) and Backend container (port 5000).

## 💾 Database Backup & Restore

### Backup
Take a logical backup of the MySQL database without stopping the application:
```bash
docker exec moha-file-share-mysql /usr/bin/mysqldump -u appuser --password=apppassword moha_file_share > backup_$(date +%F).sql
```

### Restore
Restore the database from a backup file:
```bash
cat backup_YYYY-MM-DD.sql | docker exec -i moha-file-share-mysql /usr/bin/mysql -u appuser --password=apppassword moha_file_share
```

## ⏪ Rollback Plan

If a deployment fails or introduces critical bugs:

1. Identify the previous stable Git commit.
2. Checkout the stable commit:
   ```bash
   git checkout <stable-commit-hash>
   ```
3. Rebuild and restart the Docker containers:
   ```bash
   docker compose down
   docker compose up -d --build
   ```
4. If a database migration caused the issue, restore the database from the backup taken immediately before the deployment using the **Restore** command above.
