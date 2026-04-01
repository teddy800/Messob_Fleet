# api_auth.py
import datetime
import logging
import os

from odoo import http
from odoo.http import request

try:
    import jwt
except ImportError:
    jwt = None

_logger = logging.getLogger(__name__)

# Read secret from environment variable; fall back to a generated one at startup.
# In production, always set MESSOB_JWT_SECRET in the environment.
JWT_SECRET = os.environ.get('MESSOB_JWT_SECRET', 'change-me-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 8


def _generate_token(user):
    payload = {
        'user_id': user.id,
        'login': user.login,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token):
    """Decode and verify a JWT. Returns payload dict or raises jwt.exceptions.*"""
    if jwt is None:
        raise RuntimeError('PyJWT library is not installed')
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


class AuthController(http.Controller):

    @http.route('/api/login', type='json', auth='none', methods=['POST'], csrf=False, cors='*')
    def login(self):
        if jwt is None:
            return {'error': 'JWT library not available on server'}

        data = request.jsonrequest or {}
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return {'error': 'Username and password are required'}

        # Authenticate against Odoo's credential store
        uid = request.env['res.users'].sudo().authenticate(
            request.env.cr.dbname, username, password, {}
        )
        if not uid:
            return {'error': 'Invalid credentials'}

        user = request.env['res.users'].sudo().browse(uid)
        if not user.active:
            return {'error': 'Account is deactivated'}

        token = _generate_token(user)

        # Collect role groups for the frontend
        group_map = {
            'messob_fleet.group_messob_admin': 'admin',
            'messob_fleet.group_messob_dispatcher': 'dispatcher',
            'messob_fleet.group_messob_mechanic': 'mechanic',
            'messob_fleet.group_messob_driver': 'driver',
            'messob_fleet.group_messob_user': 'user',
        }
        roles = [label for xml_id, label in group_map.items() if user.has_group(xml_id)]

        return {
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'roles': roles,
            },
        }

    @http.route('/api/logout', type='json', auth='user', methods=['POST'], cors='*')
    def logout(self):
        # Odoo session-based logout; for pure JWT flows the client simply discards the token.
        request.session.logout(keep_db=True)
        return {'message': 'Logged out successfully'}

    @http.route('/api/me', type='json', auth='user', methods=['GET'], cors='*')
    def me(self):
        """Return the profile of the currently authenticated user."""
        user = request.env.user
        return {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_active': user.active,
        }
