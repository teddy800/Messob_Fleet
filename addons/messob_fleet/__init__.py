# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Root package initializer — imports all sub-packages.
# ---------------------------------------------------------------------------
from . import models
from . import controllers
from . import wizards


def post_init_hook(cr, registry):
    """
    Post-installation hook to enhance security (NFR-3.1).
    - Disables any demo/test users with weak passwords
    - Logs security warnings
    """
    import logging
    _logger = logging.getLogger(__name__)
    
    from odoo import api, SUPERUSER_ID
    
    env = api.Environment(cr, SUPERUSER_ID, {})
    
    # List of demo user logins to disable in production
    demo_logins = [
        'staff@messob.org',
        'dispatcher@messob.org',
        'driver@messob.org',
        'mechanic@messob.org',
        'admin@messob.org',
    ]
    
    disabled_count = 0
    
    for login in demo_logins:
        user = env['res.users'].search([('login', '=', login)], limit=1)
        if user:
            user.write({'active': False})
            disabled_count += 1
            _logger.warning(f"Security: Disabled demo user '{login}' (NFR-3.1: No default credentials in production)")
    
    if disabled_count > 0:
        _logger.warning(f"Security: Disabled {disabled_count} demo users for production safety")
    
    # Log JWT secret key warning
    import os
    if not os.environ.get('JWT_SECRET_KEY'):
        _logger.warning("Security: JWT_SECRET_KEY environment variable not set! Set it for production to persist tokens across restarts (NFR-3.1)")
    
    _logger.info("MESSOB Fleet Management System: Post-installation security checks completed")
