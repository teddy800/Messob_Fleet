# api_auth.py
from odoo import http
from odoo.http import request
import json
try:
    import jwt
except ImportError:
    jwt = None
import datetime

class AuthController(http.Controller):

    @http.route('/api/login', type='json', auth='none', methods=['POST'], csrf=False)
    def login(self):
        data = request.jsonrequest
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            return {'error': 'Username and password required'}
        
        # Authenticate user
        user = request.env['res.users'].sudo().search([('login', '=', username)], limit=1)
        if not user or not user.check_password(password):
            return {'error': 'Invalid credentials'}
        
        # Generate JWT token (simple example; use a library like PyJWT)
        payload = {
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }
        token = jwt.encode(payload, 'your-secret-key', algorithm='HS256')
        return {'token': token, 'user': {'id': user.id, 'name': user.name}}

    @http.route('/api/logout', type='json', auth='user', methods=['POST'])
    def logout(self):
        # Invalidate session or token
        return {'message': 'Logged out'}
