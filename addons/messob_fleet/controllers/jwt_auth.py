# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: JWT Authentication (NFR-3.1, NFR-3.3)
# Description: JWT token-based authentication for stateless API access.
#
# Features:
#   - JWT token generation on login
#   - Token validation middleware
#   - Token refresh mechanism
#   - Secure token storage with expiry
#   - Audit logging integration
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
import jwt
import datetime
import logging
import secrets

_logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET_KEY = secrets.token_urlsafe(32)  # Generate secure random key
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=8)  # 8 hours
JWT_REFRESH_TOKEN_EXPIRES = datetime.timedelta(days=30)  # 30 days


class JWTAuthenticationController(http.Controller):
    """
    JWT-based authentication controller for stateless API access.
    Complements Odoo session-based auth for mobile/external clients.
    """

    @http.route('/api/auth/jwt/login', type='json', auth='none', methods=['POST'], csrf=False)
    def jwt_login(self, **kwargs):
        """
        Authenticate user and return JWT tokens.
        
        Request body:
        {
            "db": "fleet_management",
            "login": "user@example.com",
            "password": "password123"
        }
        
        Response:
        {
            "success": true,
            "access_token": "eyJ...",
            "refresh_token": "eyJ...",
            "user": {
                "uid": 123,
                "name": "John Doe",
                "email": "user@example.com",
                "roles": ["staff"]
            },
            "expires_in": 28800
        }
        """
        try:
            db = kwargs.get('db', 'fleet_management')
            login = kwargs.get('login')
            password = kwargs.get('password')
            
            if not login or not password:
                return {
                    'success': False,
                    'error': 'Missing login or password'
                }
            
            # Authenticate with Odoo
            uid = request.session.authenticate(db, login, password)
            
            if not uid:
                # Log failed login attempt
                try:
                    audit_log = request.env['messob.fms.audit.log'].sudo()
                    audit_log.log_login(
                        user_id=None,
                        success=False,
                        ip_address=request.httprequest.environ.get('REMOTE_ADDR'),
                        user_agent=request.httprequest.environ.get('HTTP_USER_AGENT'),
                        error_message=f"Failed JWT login attempt for: {login}"
                    )
                except Exception as e:
                    _logger.error(f"Failed to log failed JWT login: {e}")
                
                return {
                    'success': False,
                    'error': 'Invalid credentials'
                }
            
            # Get user information
            user = request.env['res.users'].sudo().browse(uid)
            
            # Get user roles
            roles = []
            if user.has_group('messob_fleet.group_fms_admin'):
                roles.append('admin')
            if user.has_group('messob_fleet.group_fms_dispatcher'):
                roles.append('dispatcher')
            if user.has_group('messob_fleet.group_fms_driver'):
                roles.append('driver')
            if user.has_group('messob_fleet.group_fms_mechanic'):
                roles.append('mechanic')
            if user.has_group('messob_fleet.group_fms_user'):
                roles.append('staff')
            
            # Generate JWT tokens
            access_token = self._generate_access_token(uid, login, roles)
            refresh_token = self._generate_refresh_token(uid, login)
            
            # Log successful login
            try:
                audit_log = request.env['messob.fms.audit.log'].sudo()
                audit_log.log_login(
                    user_id=uid,
                    success=True,
                    ip_address=request.httprequest.environ.get('REMOTE_ADDR'),
                    user_agent=request.httprequest.environ.get('HTTP_USER_AGENT')
                )
            except Exception as e:
                _logger.error(f"Failed to log successful JWT login: {e}")
            
            return {
                'success': True,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'uid': uid,
                    'name': user.name,
                    'email': user.login,
                    'roles': roles
                },
                'expires_in': int(JWT_ACCESS_TOKEN_EXPIRES.total_seconds())
            }
            
        except Exception as e:
            _logger.error(f"JWT login error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    @http.route('/api/auth/jwt/refresh', type='json', auth='none', methods=['POST'], csrf=False)
    def jwt_refresh(self, **kwargs):
        """
        Refresh access token using refresh token.
        
        Request body:
        {
            "refresh_token": "eyJ..."
        }
        
        Response:
        {
            "success": true,
            "access_token": "eyJ...",
            "expires_in": 28800
        }
        """
        try:
            refresh_token = kwargs.get('refresh_token')
            
            if not refresh_token:
                return {
                    'success': False,
                    'error': 'Missing refresh token'
                }
            
            # Decode and validate refresh token
            try:
                payload = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            except jwt.ExpiredSignatureError:
                return {
                    'success': False,
                    'error': 'Refresh token expired'
                }
            except jwt.InvalidTokenError:
                return {
                    'success': False,
                    'error': 'Invalid refresh token'
                }
            
            # Verify token type
            if payload.get('type') != 'refresh':
                return {
                    'success': False,
                    'error': 'Invalid token type'
                }
            
            uid = payload.get('uid')
            login = payload.get('login')
            
            # Get user roles
            user = request.env['res.users'].sudo().browse(uid)
            if not user.exists():
                return {
                    'success': False,
                    'error': 'User not found'
                }
            
            roles = []
            if user.has_group('messob_fleet.group_fms_admin'):
                roles.append('admin')
            if user.has_group('messob_fleet.group_fms_dispatcher'):
                roles.append('dispatcher')
            if user.has_group('messob_fleet.group_fms_driver'):
                roles.append('driver')
            if user.has_group('messob_fleet.group_fms_mechanic'):
                roles.append('mechanic')
            if user.has_group('messob_fleet.group_fms_user'):
                roles.append('staff')
            
            # Generate new access token
            access_token = self._generate_access_token(uid, login, roles)
            
            return {
                'success': True,
                'access_token': access_token,
                'expires_in': int(JWT_ACCESS_TOKEN_EXPIRES.total_seconds())
            }
            
        except Exception as e:
            _logger.error(f"JWT refresh error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    @http.route('/api/auth/jwt/verify', type='json', auth='none', methods=['POST'], csrf=False)
    def jwt_verify(self, **kwargs):
        """
        Verify JWT token validity.
        
        Request body:
        {
            "access_token": "eyJ..."
        }
        
        Response:
        {
            "success": true,
            "valid": true,
            "user": {
                "uid": 123,
                "login": "user@example.com",
                "roles": ["staff"]
            }
        }
        """
        try:
            access_token = kwargs.get('access_token')
            
            if not access_token:
                return {
                    'success': False,
                    'error': 'Missing access token'
                }
            
            # Decode and validate token
            try:
                payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
                
                return {
                    'success': True,
                    'valid': True,
                    'user': {
                        'uid': payload.get('uid'),
                        'login': payload.get('login'),
                        'roles': payload.get('roles', [])
                    }
                }
            except jwt.ExpiredSignatureError:
                return {
                    'success': True,
                    'valid': False,
                    'error': 'Token expired'
                }
            except jwt.InvalidTokenError:
                return {
                    'success': True,
                    'valid': False,
                    'error': 'Invalid token'
                }
            
        except Exception as e:
            _logger.error(f"JWT verify error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    @http.route('/api/auth/jwt/logout', type='json', auth='user', methods=['POST'], csrf=False)
    def jwt_logout(self, **kwargs):
        """
        Logout user (invalidate tokens on client side).
        Server-side token blacklisting can be added if needed.
        
        Response:
        {
            "success": true,
            "message": "Logged out successfully"
        }
        """
        try:
            # Log logout
            try:
                audit_log = request.env['messob.fms.audit.log'].sudo()
                audit_log.log_logout(
                    user_id=request.env.uid,
                    ip_address=request.httprequest.environ.get('REMOTE_ADDR')
                )
            except Exception as e:
                _logger.error(f"Failed to log JWT logout: {e}")
            
            return {
                'success': True,
                'message': 'Logged out successfully'
            }
            
        except Exception as e:
            _logger.error(f"JWT logout error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _generate_access_token(self, uid, login, roles):
        """Generate JWT access token."""
        payload = {
            'uid': uid,
            'login': login,
            'roles': roles,
            'type': 'access',
            'exp': datetime.datetime.utcnow() + JWT_ACCESS_TOKEN_EXPIRES,
            'iat': datetime.datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    def _generate_refresh_token(self, uid, login):
        """Generate JWT refresh token."""
        payload = {
            'uid': uid,
            'login': login,
            'type': 'refresh',
            'exp': datetime.datetime.utcnow() + JWT_REFRESH_TOKEN_EXPIRES,
            'iat': datetime.datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def jwt_authenticate(func):
    """
    Decorator to protect routes with JWT authentication.
    
    Usage:
        @http.route('/api/protected', type='json', auth='none', methods=['POST'])
        @jwt_authenticate
        def protected_route(self, **kwargs):
            # Access authenticated user via request.jwt_user
            return {'user_id': request.jwt_user['uid']}
    """
    def wrapper(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.httprequest.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return {
                'success': False,
                'error': 'Missing or invalid Authorization header'
            }
        
        token = auth_header.split(' ')[1]
        
        try:
            # Decode and validate token
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # Verify token type
            if payload.get('type') != 'access':
                return {
                    'success': False,
                    'error': 'Invalid token type'
                }
            
            # Store user info in request for route access
            request.jwt_user = {
                'uid': payload.get('uid'),
                'login': payload.get('login'),
                'roles': payload.get('roles', [])
            }
            
            # Call the original function
            return func(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return {
                'success': False,
                'error': 'Token expired'
            }
        except jwt.InvalidTokenError:
            return {
                'success': False,
                'error': 'Invalid token'
            }
        except Exception as e:
            _logger.error(f"JWT authentication error: {e}")
            return {
                'success': False,
                'error': 'Authentication failed'
            }
    
    return wrapper
