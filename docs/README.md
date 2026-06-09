# MESSOB Fleet Management System - User Documentation

**SRS Requirement 2.6:** User Documentation  
**Version:** 1.1.0

## 📚 Documentation Overview

### 1. Online Help System ✅
**Access:** Click the blue help button (?) on any page  
**Features:**
- Context-sensitive help for current page
- Step-by-step instructions
- FAQ sections
- Links to detailed manuals

### 2. User Manuals ✅
**Location:** `manuals/` folder  
**Format:** Markdown (convertible to PDF)

| Manual | Target Audience | Pages |
|--------|----------------|-------|
| [Staff User Manual](manuals/Staff_User_Manual.md) | Staff members | 15 |
| [Administrator Guide](manuals/Administrator_Guide.md) | IT administrators | 45+ |

**Additional manuals** (Dispatcher, Driver, Mechanic) can be created following the same structure.

### 3. Technical Documentation ✅
- [API Documentation](../deploy/API_DOCS.md) - REST API reference
- [Project README](../README.md) - System overview

---

## 🚀 Quick Start

### For Users
1. Log into the system
2. Click the **Help button (?)** for instant guidance
3. Download PDF manuals from Help → Guides tab

### For Administrators
1. Read the [Administrator Guide](manuals/Administrator_Guide.md)
2. Follow setup instructions in the guide
3. Use [Manual Generator Guide](manuals/MANUAL_GENERATOR_GUIDE.md) to create PDFs

---

## 📝 Creating PDF Manuals

**Install Pandoc (one-time):**
```bash
# Windows
choco install pandoc miktex

# Linux
sudo apt-get install pandoc texlive-latex-base

# macOS
brew install pandoc basictex
```

**Generate PDF:**
```bash
cd docs/manuals
pandoc Staff_User_Manual.md -o Staff_User_Manual.pdf \
  --toc --number-sections \
  --metadata title="MESSOB Fleet - Staff User Manual"
```

See [MANUAL_GENERATOR_GUIDE.md](manuals/MANUAL_GENERATOR_GUIDE.md) for detailed instructions.

---

## 📞 Support

**In-App Help:** Click the (?) button on any page  
**Email:** support@messob.et  
**Phone:** +251 11 XXX XXXX  
**Hours:** Monday-Friday, 9:00-17:00 EAT

---

## ✅ SRS 2.6 Compliance

This documentation fulfills **SRS Section 2.6** requirements:

✅ **Online Help System** - Context-sensitive help integrated into web application  
✅ **User Manuals** - Role-specific PDF manuals  
✅ **Administrator's Guide** - Technical configuration and maintenance guide

---

**© 2024-2026 MESSOB Technology Solutions**  
**Version:** 1.1.0 | **Updated:** December 2024
