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