custom_addons/
└── messob_fleet/
    ├── __init__.py
    ├── __manifest__.py
    ├── controllers/
    │   └── __init__.py
    ├── data/
    │   └── __init__.py
    ├── models/
    │   ├── __init__.py
    │   ├── trip_request.py
    │   ├── trip_wizard.py
    │   └── res_users.py (if needed)
    ├── security/
    │   ├── ir.model.access.csv
    │   └── messob_fleet_groups.xml
    ├── views/
    │   ├── trip_request_views.xml
    │   ├── trip_wizard_views.xml
    │   └── menu_views.xml
    ├── wizard/
    │   ├── __init__.py
    │   └── (wizard files can go in models/ as transient, but better keep here)
    ├── static/
    │   └── description/
    │       └── icon.png
    └── tests/
        └── __init__.py
        <!--  for users -->
        messob_fms/
├── __init__.py
├── __manifest__.py
├── models/
│   ├── __init__.py
│   └── trip_request.py          ← Fleet request logic (your current focus)
├── views/
│   ├── trip_views.xml           ← Forms, lists, wizard tabs
│   └── menus.xml                ← Sidebar & menu items
├── security/
│   ├── ir.model.access.csv      ← Role permissions
│   └── groups.xml               ← FMS User/Dispatcher groups
├── data/
│   └── sequences.xml            ← Auto-generate REQ/2026/0001
├── static/
│   └── description/
│       └── icon.png             ← Required for Odoo Apps menu
└── controllers/
    ├── __init__.py
    └── hr_api_hooks.py          ←  EMPTY NOW. Fill later for HR API