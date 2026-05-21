# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System (MESSOB-FMS)
# Module: messob_fleet
# Version: 1.1.0
# Author: MESSOB Development Team
# License: LGPL-3
#
# Phase 1 Scope:
#   - Module 1: Vehicle Request Management (Staff)
#   - Module 2: Dispatch & Approval Management (Dispatcher)
#
# Planned Phases (see FUTURE.md):
#   - Phase 2: GPS Tracking, Driver Mobile Interface
#   - Phase 3: Asset Management (Fuel, Maintenance)
#   - Phase 4: Reporting & Analytics
# ---------------------------------------------------------------------------
{
    'name': 'MESSOB Fleet Management',
    'version': '1.1.0',
    'summary': 'Digitalized vehicle request, dispatch, and fleet tracking for MESSOB.',
    'description': """
MESSOB Fleet Management System (Phase 1)
=========================================
Covers:
- Staff vehicle trip request wizard (4-step)
- Personal request dashboard with status tracking
- Dispatcher pending-request queue with approve/reject
- Resource assignment (vehicle + driver) with conflict detection
- Role-based access: Staff, Dispatcher, Admin
    """,
    'author': 'MESSOB Development Team',
    'category': 'Fleet',
    'depends': ['base', 'fleet', 'mail'],

    # -----------------------------------------------------------------------
    # Data files are loaded in this exact order.
    # Security must come before views (Odoo requirement).
    # -----------------------------------------------------------------------
    'data': [
        # 1. Security: groups → ACL → record rules
        'security/groups.xml',
        'security/ir.model.access.csv',
        'security/record_rules.xml',

        # 2. Master data (sequences + locations)
        'data/sequences.xml',
        'data/locations.xml',
        'data/maintenance_alert_templates.xml',
        'data/maintenance_alert_cron.xml',
        'data/audit_log_cron.xml',

        # 3. Views: model views, then wizard, then menus last
        'views/trip_views.xml',
        'views/dispatcher_views.xml',
        'views/driver_views.xml',
        'views/mechanic_views.xml',
        'views/maintenance_alert_views.xml',
        'views/admin_views.xml',
        'views/staff_dashboard_action.xml',
        'views/wizard_views.xml',
        'views/menus.xml',
    ],

    # -----------------------------------------------------------------------
    # Static assets (CSS injected into backend bundle)
    # -----------------------------------------------------------------------
    'assets': {
        'web.assets_backend': [
            'messob_fleet/static/src/css/fms_styles.css',
            'messob_fleet/static/src/js/staff_dashboard.js',
            'messob_fleet/static/src/xml/staff_dashboard.xml',
        ],
    },

    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
