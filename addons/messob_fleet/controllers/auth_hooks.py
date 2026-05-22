# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: Authentication Hooks (FR-5.3)
# Description: Intercepts login/logout events to create audit log entries.
#
# Features:
#   - Logs successful logins with IP and user agent
#   - Logs failed login attempts
#   - Logs user logouts
#   - Captures session information
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class AuthenticationAuditHooks(http.Controller):
    """
    Authentication event hooks for comprehensive audit logging.
    
    Note: In Odoo 18, we don't override /web/session/authenticate.
    Instead, we use model-level hooks in res.users (see below).
    This controller only handles logout logging.
    """

    @http.route('/web/session/destroy', type='json', auth='user', methods=['POST'])
    def destroy(self, **kwargs):
        """
        Override logout endpoint to log logout events.
        """
        user_id = request.session.uid
        
        try:
            # Log logout before destroying session
            if user_id:
                ip_address = request.httprequest.environ.get('REMOTE_ADDR')
                audit_log = request.env['messob.fms.audit.log'].sudo()
                audit_log.log_logout(
                    user_id=user_id,
                    ip_address=ip_address
                )
        except Exception as e:
            _logger.error(f"Failed to log logout: {e}")
        
        # Call original logout
        return request.session.logout()


# ── Alternative: Model-based Login Tracking ──
# If controller hooks don't work, use res.users model override

from odoo import models, api


class ResUsersAuditExtension(models.Model):
    """
    Extend res.users to log authentication events.
    
    This provides an alternative to controller-based hooks
    by overriding the authentication methods at the model level.
    """
    _inherit = 'res.users'

    @classmethod
    def _login(cls, db, credential, user_agent_env=None):
        """Override _login to capture login attempts."""
        try:
            # Call original login
            uid = super()._login(db, credential, user_agent_env=user_agent_env)
            
            if uid:
                # Successful login - log it
                try:
                    with cls.pool.cursor() as cr:
                        env = api.Environment(cr, uid, {})
                        audit_log = env['messob.fms.audit.log'].sudo()
                        
                        # Extract IP from environment
                        ip_address = None
                        user_agent = None
                        if user_agent_env:
                            ip_address = user_agent_env.get('REMOTE_ADDR')
                            user_agent = user_agent_env.get('HTTP_USER_AGENT')
                        
                        audit_log.log_login(
                            user_id=uid,
                            success=True,
                            ip_address=ip_address,
                            user_agent=user_agent
                        )
                        cr.commit()
                except Exception as e:
                    _logger.error(f"Failed to log successful login for uid {uid}: {e}")
            
            return uid
            
        except Exception as e:
            # Failed login - log it
            try:
                with cls.pool.cursor() as cr:
                    env = api.Environment(cr, 1, {})  # Use admin user for logging
                    audit_log = env['messob.fms.audit.log'].sudo()
                    
                    # Extract IP from environment
                    ip_address = None
                    user_agent = None
                    login_attempt = "unknown"
                    if user_agent_env:
                        ip_address = user_agent_env.get('REMOTE_ADDR')
                        user_agent = user_agent_env.get('HTTP_USER_AGENT')
                    
                    # Try to get login from credential
                    if isinstance(credential, dict):
                        login_attempt = credential.get('login', 'unknown')
                    
                    audit_log.log_login(
                        user_id=None,
                        success=False,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        error_message=f"Failed login attempt for: {login_attempt}"
                    )
                    cr.commit()
            except Exception as log_error:
                _logger.error(f"Failed to log failed login attempt: {log_error}")
            
            # Re-raise the original exception
            raise

    def _logout(self):
        """Override _logout to capture logout events."""
        try:
            # Log logout before actual logout
            audit_log = self.env['messob.fms.audit.log'].sudo()
            audit_log.log_logout(
                user_id=self.env.uid,
                ip_address=None  # IP not easily available in this context
            )
        except Exception as e:
            _logger.error(f"Failed to log logout: {e}")
        
        # Call original logout
        return super()._logout()
