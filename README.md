```addons/
└── messob_fleet/
    ├── __init__.py                # Main entry point
    ├── __manifest__.py            # Module metadata (Identity Card)
    ├── models/                    # Database Schema (Python)
    │   ├── __init__.py
    │   ├── user.py                # User & Role extensions
    │   ├── vehicle.py             # Vehicle & Driver models
    │   ├── trip_request.py        # Trip Request & Assignment
    │   └── logs.py                # Fuel, Maintenance, & Trip Logs
    ├── views/                     # User Interface (XML)
    │   ├── trip_request_views.xml
    │   ├── vehicle_views.xml
    │   └── menu_views.xml         # Sidebar menus
    ├── security/                  # Permissions (RBAC)
    │   └── ir.model.access.csv    # Defines who can Read/Write
    ├── data/                      # Initial Data
    │   └── mail_template_data.xml # Email alerts
    └── static/                    # Assets
        └── description/
            └── icon.png           # Your module's logo
   to activate odoo
```sumeya@sumeya:~/odoo18$ source /home/sumeya/odoo18/venv/bin/activate
to run in localhost 
```python3 odoo-bin -c odoo.conf
to see in the broser
http://localhost:8018
email and passwordd is odoo
in odoo to search MESSOB Fleet Management
docker fors restart
docker compose run --rm odoo18 odoo -u messob_fleet -d odoo --stop-after-init

