{
    'name': 'MESSOB Fleet Management',
    'version': '1.0.0',
    'summary': 'Vehicle request & dispatch system (Phase 1)',
    'depends': ['base', 'fleet', 'mail'],
    'data': [
        'security/groups.xml',              
        'security/ir.model.access.csv',
        'data/sequences.xml',
        'views/trip_views.xml',
        'views/menus.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}