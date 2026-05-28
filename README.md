# MESSOB Fleet Management System

A comprehensive fleet management system built with Odoo 18 backend and React frontend for managing vehicle requests, dispatching, maintenance, and logistics operations.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Odoo](https://img.shields.io/badge/Odoo-18.0-purple)
![React](https://img.shields.io/badge/React-19.2-blue)
![License](https://img.shields.io/badge/license-LGPL--3-green)

## 🚀 Features

### Phase 1 (Current)
- ✅ **Vehicle Request Management** - Staff can create and track trip requests
- ✅ **Dispatch & Approval System** - Dispatchers can approve/reject and assign resources
- ✅ **Role-Based Access Control** - Staff, Dispatcher, Driver, Mechanic, Admin roles
- ✅ **Resource Assignment** - Vehicle and driver assignment with conflict detection
- ✅ **Status Tracking** - Real-time trip request status updates
- ✅ **Audit Logging** - Complete audit trail of all operations

### Planned Features (Phase 2-4)
- 🔄 GPS Tracking & Real-time Location
- 🔄 Driver Mobile Interface
- 🔄 Fuel Management System
- 🔄 Maintenance Scheduling
- 🔄 Reporting & Analytics

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React + Vite)                │
│  Port: 3000                             │
│  - Modern UI with Tailwind CSS          │
│  - Role-based dashboards                │
│  - Real-time updates                    │
└──────────────┬──────────────────────────┘
               │ REST API
               ↓
┌─────────────────────────────────────────┐
│  Backend (Odoo 18)                      │
│  Port: 8018                             │
│  - Business Logic                       │
│  - API Endpoints                        │
│  - Security & Authentication            │
└──────────────┬──────────────────────────┘
               │ PostgreSQL
               ↓
┌─────────────────────────────────────────┐
│  Database (PostgreSQL 16)               │
│  - Data persistence                     │
│  - Relational data model                │
└─────────────────────────────────────────┘
```

## 📋 Prerequisites

- **Docker Desktop** (for Windows/Mac) or Docker Engine (for Linux)
- **Node.js** 18+ and npm
- **Git**
- **Windows 10/11** (or Linux/Mac with appropriate adjustments)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/teddy800/Messob_Fleet.git
cd Messob_Fleet
```

### 2. Start Backend (Odoo + Database)

```bash
docker-compose up -d odoo18 db18
```

Wait for containers to start (check with `docker ps`)

### 3. Create Database

1. Open http://localhost:8018
2. Create database:
   - **Database Name**: fleet_management
   - **Email**: admin@mesob.et
   - **Password**: Admin@123
   - **Language**: English
   - **Country**: Your country
   - **Demo Data**: ✅ Check this

### 4. Install Base Modules

In Odoo:
1. Go to **Apps**
2. Enable **Developer Mode** (Settings → Activate developer mode)
3. Click **Update Apps List**
4. Install these modules:
   - Fleet
   - Employees
   - Contacts
   - Discuss

### 5. Install MESSOB Fleet Module

1. In **Apps**, search for "messob"
2. Click **Install** on "MESSOB Fleet Management"
3. Wait for installation to complete

### 6. Assign User Groups

1. Go to **Settings** → **Users & Companies** → **Users**
2. Click on your admin user
3. In **Access Rights** tab, check:
   - **MESSOB Fleet Management / Administrator** (or Dispatcher)
4. Click **Save**

### 7. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:3000

### 8. Login to Frontend

- **URL**: http://localhost:3000
- **Email**: admin@mesob.et
- **Password**: Admin@123

## 🧪 Testing

### Run System Tests

```powershell
.\test-system.ps1
```

This will verify:
- ✅ Docker containers status
- ✅ Backend API connectivity
- ✅ Database connection
- ✅ Frontend server
- ✅ Module files integrity
- ✅ Configuration correctness

### Test Connection Page

Open http://localhost:3000/test-connection.html for automated connection tests.

## 📁 Project Structure

```
Messob_Fleet/
├── addons/
│   └── messob_fleet/              # Odoo module
│       ├── controllers/           # API endpoints
│       ├── models/                # Data models
│       ├── views/                 # XML views
│       ├── security/              # Access control
│       ├── data/                  # Master data
│       ├── wizards/               # Wizards
│       └── __manifest__.py        # Module manifest
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── features/              # Feature modules
│   │   │   ├── admin/             # Admin dashboard
│   │   │   ├── auth/              # Authentication
│   │   │   ├── dispatch/          # Dispatcher features
│   │   │   ├── driver/            # Driver features
│   │   │   ├── fleet/             # Fleet management
│   │   │   ├── mechanic/          # Mechanic features
│   │   │   ├── profile/           # User profile
│   │   │   └── requests/          # Trip requests
│   │   ├── lib/                   # Utilities
│   │   └── store/                 # State management
│   ├── public/                    # Static assets
│   ├── package.json
│   └── vite.config.js             # Vite configuration
├── docker-compose.yml             # Docker services
├── test-system.ps1                # System test script
├── INSTALLATION_VERIFICATION.md   # Installation guide
├── FIX_ACCESS_DENIED.md          # Troubleshooting guide
└── README.md                      # This file
```

## 🔧 Configuration

### Backend Configuration

**Database**: `fleet_management`
**Port**: 8018 (mapped from 8069)
**Admin Path**: http://localhost:8018

### Frontend Configuration

**Port**: 3000
**API Proxy**: `/odoo` → `http://localhost:8018`
**Database**: Configured in `frontend/src/lib/odooApi.js`

### Environment Variables

Create `.env` file in frontend directory (optional):

```env
VITE_ODOO_URL=http://localhost:8018
VITE_ODOO_DB=fleet_management
```

## 👥 User Roles

### Administrator
- Full access to all features
- User management
- System configuration
- Reports and analytics

### Dispatcher
- View all trip requests
- Approve/reject requests
- Assign vehicles and drivers
- Monitor active trips

### Staff (User)
- Create trip requests
- View own requests
- Track request status

### Driver
- View assigned trips
- Update trip status
- Log fuel consumption

### Mechanic
- View maintenance queue
- Log maintenance activities
- Update vehicle status

## 🛠️ Development

### Backend Development

```bash
# Restart Odoo after code changes
docker-compose restart odoo18

# View logs
docker-compose logs -f odoo18

# Access Odoo shell
docker exec -it mesob_fleet_management-odoo18-1 odoo shell -d fleet_management
```

### Frontend Development

```bash
cd frontend

# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📊 Database Schema

### Main Models

- **fms.trip.request** - Trip requests
- **fms.trip.dispatch** - Dispatch assignments
- **fms.trip.driver** - Driver assignments
- **fms.fuel.log** - Fuel logs
- **fms.maintenance.log** - Maintenance records
- **fms.audit.log** - Audit trail
- **fms.driver** - Driver information
- **fms.location** - Location master data

## 🔒 Security

- Role-based access control (RBAC)
- Record-level security rules
- API authentication via Odoo sessions
- CORS protection
- SQL injection prevention
- XSS protection

## 🐛 Troubleshooting

### "Access Denied" Error

**Solution**: Assign MESSOB Fleet Management groups to user
- See [FIX_ACCESS_DENIED.md](FIX_ACCESS_DENIED.md)

### Frontend Can't Connect to Backend

**Solution**: Check proxy configuration
```bash
# Verify backend is running
curl http://localhost:8018/web/database/list

# Check frontend proxy in vite.config.js
```

### Module Not Appearing in Apps

**Solution**: Update apps list
1. Enable Developer Mode
2. Apps → Update Apps List
3. Search for "messob"

### Docker Containers Not Starting

**Solution**: Check Docker Desktop is running
```bash
# Check container status
docker ps

# Restart containers
docker-compose restart

# View logs
docker-compose logs
```

For more troubleshooting, see [INSTALLATION_VERIFICATION.md](INSTALLATION_VERIFICATION.md)

## 📚 Documentation

- [Installation & Verification Guide](INSTALLATION_VERIFICATION.md)
- [Access Denied Fix](FIX_ACCESS_DENIED.md)
- [API Documentation](addons/messob_fleet/deploy/API_DOCS.md)
- [Setup Guide](addons/messob_fleet/SETUP_GUIDE.md)
- [Quick Start](addons/messob_fleet/QUICK_START.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the LGPL-3 License - see the LICENSE file for details.

## 👨‍💻 Authors

- **MESSOB Development Team**

## 🙏 Acknowledgments

- Odoo Community
- React Community
- All contributors

## 📞 Support

For support, email support@mesob.et or open an issue on GitHub.

## 🗺️ Roadmap

### Version 1.2 (Q2 2026)
- [ ] GPS tracking integration
- [ ] Driver mobile app
- [ ] Push notifications

### Version 1.3 (Q3 2026)
- [ ] Fuel management
- [ ] Maintenance scheduling
- [ ] Predictive maintenance

### Version 2.0 (Q4 2026)
- [ ] Analytics dashboard
- [ ] Route optimization
- [ ] Cost analysis tools

---

**Made with ❤️ by MESSOB Development Team**
