{
    'name': 'MESSOB Fleet Management',
    'version': '1.0',
    'category': 'Transportation',
    'summary': 'Digitalizing MESSOB vehicle fleet operations',
    'depends': ['base', 'fleet', 'mail', 'hr'], # mail is for notifications, hr for staff/driver
    'data': [
        'security/security.xml',
        'security/ir.model.access.csv',   # Always load security first!
        'security/ir_rule.xml',           # Load Record Rules
        'views/trip_request_views.xml',  # Load the Actions/Views
        'views/logs_views.xml',          # Load Log views
        'views/menu_views.xml',          # Load the Menus last
    ],
    'demo': [
        'demo/demo_users.xml',
        'demo/demo_vehicles.xml',
        'demo/demo_drivers.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}