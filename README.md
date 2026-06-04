# MESSOB Fleet Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Odoo](https://img.shields.io/badge/Odoo-18.0-purple.svg)
![React](https://img.shields.io/badge/React-19.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

A modern fleet management system built with Odoo 18 and React 19, designed for Ethiopian organizations.

---

## ✨ Features

### Core Functionality
- **Trip Request Management** - 4-step wizard for booking vehicles
- **Smart Dispatch** - Intelligent resource assignment with calendar view
- **Real-Time GPS Tracking** - Live vehicle location monitoring
- **Maintenance Management** - Automated alerts and service logging
- **Comprehensive Reporting** - Analytics and audit trails

### Advanced Features
- 🔴 Real-time updates via WebSocket
- 🧠 AI-powered trip priority scoring
- 📱 Mobile-responsive interface
- 🔒 Role-based access control (5 user types)
- 📊 Performance monitoring and analytics
- 🔐 Complete audit logging

---

## 🚀 Quick Start

### Prerequisites
- Docker >= 24.0
- Docker Compose >= 2.20
- Node.js >= 18.0

### Installation

```bash
# Clone repository
git clone https://github.com/teddy800/Messob_Fleet.git
cd Messob_Fleet

# Start backend (Odoo)
docker-compose up -d db18 odoo18
docker-compose exec odoo18 odoo -d fleet_management -i messob_fleet --stop-after-init
docker-compose restart odoo18

# Start frontend (React)
cd frontend
npm install
npm run dev
```

### Access
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8018
- **Default Login**: admin / admin

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Staff** | Create and track trip requests |
| **Dispatcher** | Assign vehicles, approve requests, monitor fleet |
| **Driver** | View assigned trips, update status, report incidents |
| **Mechanic** | Log repairs, manage maintenance schedules |
| **Administrator** | Full system access, user management, analytics |

---

## 📋 Project Structure

```
mesob_fleet_management/
├── addons/messob_fleet/          # Odoo backend module
│   ├── controllers/              # API endpoints
│   ├── models/                   # Business logic (21 models)
│   ├── services/                 # External integrations
│   ├── security/                 # Access control
│   ├── data/                     # Demo data & cron jobs
│   └── views/                    # Odoo UI
├── frontend/                      # React frontend
│   ├── src/features/             # Feature modules
│   ├── src/components/           # Reusable components
│   ├── src/lib/                  # API client
│   └── src/store/                # State management
└── deploy/                        # Production configs
```

---

## ⚙️ Configuration

### Frontend Environment (.env)
```env
VITE_API_BASE_URL=http://localhost:8018
VITE_WS_URL=ws://localhost:8018/ws
```

### Backend Configuration (odoo.conf)
```ini
[options]
addons_path = /mnt/extra-addons
db_host = db18
db_user = odoo
db_password = odoo
workers = 4
```

---

## 🔧 Common Issues

### Module Not Found
```bash
# Restart Odoo and update module list
docker-compose restart odoo18
docker-compose exec odoo18 odoo -d fleet_management -u messob_fleet --stop-after-init
```

### Frontend Cannot Connect
```bash
# Verify API URL in frontend/.env
VITE_API_BASE_URL=http://localhost:8018

# Restart frontend
cd frontend && npm run dev
```

### Database Connection Error
```bash
# Check PostgreSQL status
docker-compose ps db18
docker-compose logs db18

# Reset database (CAUTION: destroys data)
docker-compose down -v
docker-compose up -d
```

---

## 🏗️ Technology Stack

**Backend**
- Odoo 18 (Python 3.11+)
- PostgreSQL 16
- JWT Authentication
- WebSocket for real-time updates

**Frontend**
- React 19
- Vite 5
- TailwindCSS 4
- Leaflet (Maps)
- Zustand (State Management)

**Infrastructure**
- Docker & Docker Compose
- Nginx (Reverse Proxy)
- Redis (Caching)

---

## 📊 System Metrics

- **Lines of Code**: 40,000+
- **Backend Models**: 21
- **API Endpoints**: 30+
- **React Components**: 40+
- **User Roles**: 5
- **Automated Jobs**: 7 cron tasks

---

## 🔐 Security Features

- ✅ Role-based access control (RBAC)
- ✅ JWT token authentication
- ✅ Input validation & sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Comprehensive audit logging (7-year retention)
- ✅ Encrypted communication (HTTPS)

---

## 🚢 Production Deployment

### Using Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Configure Nginx with SSL
sudo ./deploy/ssl_setup.sh yourdomain.com

# Scale workers for high traffic
docker-compose -f deploy/docker-compose.scaling.yml up -d
```

### Environment Setup
1. Update `docker-compose.prod.yml` with production settings
2. Configure Nginx using `deploy/config/nginx_ssl.conf`
3. Set strong passwords for database and admin accounts
4. Enable firewall rules
5. Set up automated backups

---

## 📚 Documentation

- **API Documentation**: See `deploy/API_DOCS.md`
- **User Manual**: Available in Odoo backend
- **Video Tutorials**: Coming soon

---

## 📞 Support

- **Email**: support@messob.et
- **GitHub Issues**: [Report a bug](https://github.com/teddy800/Messob_Fleet/issues)
- **Documentation**: [Wiki](https://github.com/teddy800/Messob_Fleet/wiki)

---

## 👨‍💻 Development Team

**MESSOB Technology Solutions**
- Enterprise fleet management solutions
- Addis Ababa, Ethiopia

**Technology Stack**
- Backend: Odoo Python Framework
- Frontend: React TypeScript
- Database: PostgreSQL
- DevOps: Docker, Nginx

---

## 🎉 Acknowledgments

Built with world-class open-source technologies:
- [Odoo](https://www.odoo.com/) - Business application platform
- [React](https://react.dev/) - UI library
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Docker](https://www.docker.com/) - Containerization
- [TailwindCSS](https://tailwindcss.com/) - CSS framework

---

## 📄 License

**Proprietary Software**

© 2024-2026 MESSOB Technology Solutions. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use is strictly prohibited.

---

**⚡ Status**: Production Ready | **📅 Last Updated**: June 4, 2026 | **🚀 Version**: 1.0.0

---

**Built with 💙 by MESSOB Technology Solutions**
