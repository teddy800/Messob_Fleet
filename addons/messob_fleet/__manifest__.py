{
    'name': 'MESSOB Fleet Management',
    'version': '1.0',
    'category': 'Fleet',
    'summary': 'Vehicle request management (User Side)',
    'depends': ['base', 'mail', 'fleet'],
   'data': [
    'security/messob_fleet_groups.xml',
    'security/ir.model.access.csv',
    'views/trip_wizard_views.xml',   # ← Action defined FIRST
    'views/trip_request_views.xml',
    'views/menu_views.xml',          # ← Then menuitem that uses it
    'data/sequence.xml',
],
    'installable': True,
    'application': True,
}