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
import os
from functools import wraps
from collections import defaultdict
import time

_logger = logging.getLogger(__name__)

# JWT Configuration (NFR-3.1: Secure Secret Key Management)
# CRITICAL: Set JWT_SECRET_KEY environment variable in production
# The secret key MUST persist across restarts to keep tokens valid
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_urlsafe(32)
if not os.environ.get('JWT_SECRET_KEY'):
    _logger.warning("JWT_SECRET_KEY not set in environment. Using generated key. Set JWT_SECRET_KEY env var for production!")

JWT_ALGORITHM = 'HS256'
JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=8)  # 8 hours
JWT_REFRESH_TOKEN_EXPIRES = datetime.timedelta(days=30)  # 30 days

# Rate Limiting Configuration (NFR-3.2: Security - Brute Force Protection)
RATE_LIMIT_ATTEMPTS = 5  # Max login attempts
RATE_LIMIT_WINDOW = 300  # Time window in seconds (5 minutes)
RATE_LIMIT_BLOCK_DURATION = 900  # Block duration in seconds (15 minutes)

# In-memory rate limiting store (Use Redis in production)
_rate_limit_store = defaultdict(lambda: {'attempts': [], 'blocked_until': None})

# Token Blacklist Store (NFR-3.1: Server-side token invalidation)
# In-memory store for blacklisted tokens (Use Redis in production for scalability)
_token_blacklist = set()


def is_token_blacklisted(token):
    """
    Check if a token has been blacklisted (logged out).
    
    Args:
        token (str): JWT token to check
        
    Returns:
        bool: True if token is blacklisted
    """
    return token in _token_blacklist


def blacklist_token(token):
    """
    Add token to blacklist (logout).
    
    Args:
        token (str): JWT token to blacklist
    """
    _token_blacklist.add(token)
    _logger.info(f"Token blacklisted. Total blacklisted tokens: {len(_token_blacklist)}")


def cleanup_expired_blacklist():
    """
    Clean up expired tokens from blacklist to prevent memory bloat.
    Should be called periodically or use Redis with TTL in production.
    """
    current_time = time.time()
    tokens_to_remove = set()
    
    for token in _token_blacklist:
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            exp = payload.get('exp')
            
            if exp and exp < current_time:
                tokens_to_remove.add(token)
        except:
            # Invalid or expired token, safe to remove
            tokens_to_remove.add(token)
    
    _token_blacklist.difference_update(tokens_to_remove)
    
    if tokens_to_remove:
        _logger.info(f"Cleaned up {len(tokens_to_remove)} expired tokens from blacklist")


def rate_limit_check(identifier):
    """
    Check if request should be rate limited (NFR-3.2: Brute Force Protection).
    
    Args:
        identifier: IP address or username to track
        
    Returns:
        tuple: (is_allowed, retry_after_seconds)
    """
    current_time = time.time()
    limit_data = _rate_limit_store[identifier]
    
    # Check if currently blocked
    if limit_data['blocked_until'] and current_time < limit_data['blocked_until']:
        retry_after = int(limit_data['blocked_until'] - current_time)
        return False, retry_after
    
    # Remove blocked status if expired
    if limit_data['blocked_until'] and current_time >= limit_data['blocked_until']:
        limit_data['blocked_until'] = None
        limit_data['attempts'] = []
    
    # Remove old attempts outside the time window
    limit_data['attempts'] = [
        attempt_time for attempt_time in limit_data['attempts']
        if current_time - attempt_time < RATE_LIMIT_WINDOW
    ]
    
    # Check if exceeded rate limit
    if len(limit_data['attempts']) >= RATE_LIMIT_ATTEMPTS:
        # Block for RATE_LIMIT_BLOCK_DURATION
        limit_data['blocked_until'] = current_time + RATE_LIMIT_BLOCK_DURATION
        _logger.warning(f"Rate limit exceeded for {identifier}. Blocked for {RATE_LIMIT_BLOCK_DURATION}s")
        return False, RATE_LIMIT_BLOCK_DURATION
    
    return True, 0


def record_rate_limit_attempt(identifier):
    """Record a rate limit attempt."""
    _rate_limit_store[identifier]['attempts'].append(time.time())


class JWTAuthenticationController(http.Controller):
    """
    JWT-based authentication controller for stateless API access.
    Complements Odoo session-based auth for mobile/external clients.
    """

    @http.route('/api/v1/auth/jwt/login', type='json', auth='none', methods=['POST'], csrf=False)
    def jwt_login(self, **kwargs):
        """
        Authenticate user and return JWT tokens.
        Rate limited to prevent brute force attacks (NFR-3.2).
        
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
            # Get client IP for rate limiting
            client_ip = request.httprequest.environ.get('REMOTE_ADDR', 'unknown')
            login = kwargs.get('login', '')
            
            # Rate limit identifier (use IP + login for better tracking)
            rate_limit_id = f"{client_ip}:{login}" if login else client_ip
            
            # Check rate limit (NFR-3.2: Brute Force Protection)
            is_allowed, retry_after = rate_limit_check(rate_limit_id)
            if not is_allowed:
                _logger.warning(f"Rate limit exceeded for login attempt from {client_ip} (user: {login})")
                return {
                    'success': False,
                    'error': 'Too many login attempts. Please try again later.',
                    'retry_after': retry_after
                }
            
            # Record this attempt
            record_rate_limit_attempt(rate_limit_id)
            
            db = kwargs.get('db', 'fleet_management')
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

    @http.route('/api/v1/auth/jwt/refresh', type='json', auth='none', methods=['POST'], csrf=False)
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

    @http.route('/api/v1/auth/jwt/verify', type='json', auth='none', methods=['POST'], csrf=False)
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

    @http.route('/api/v1/auth/jwt/logout', type='json', auth='user', methods=['POST'], csrf=False)
    def jwt_logout(self, **kwargs):
        """
        Logout user and invalidate token server-side (NFR-3.1).
        
        Request body:
        {
            "access_token": "eyJ..." (optional)
        }
        
        Response:
        {
            "success": true,
            "message": "Logged out successfully"
        }
        """
        try:
            # Get token from request body or Authorization header
            access_token = kwargs.get('access_token')
            
            if not access_token:
                auth_header = request.httprequest.headers.get('Authorization')
                if auth_header and auth_header.startswith('Bearer '):
                    access_token = auth_header.split(' ')[1]
            
            # Blacklist the token if provided
            if access_token:
                blacklist_token(access_token)
                _logger.info(f"User {request.env.uid} logged out. Token blacklisted.")
            
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
    Decorator to protect routes with JWT authentication (NFR-3.1).
    Validates token and checks blacklist.
    
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
        
        # Check if token is blacklisted (logged out)
        if is_token_blacklisted(token):
            return {
                'success': False,
                'error': 'Token has been revoked. Please login again.'
            }
        
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
