# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: API Response Time Monitoring (NFR-1.1)
# Description: Middleware for monitoring API performance and response times.
#
# Features:
#   - Automatic response time logging
#   - Performance metrics collection
#   - Slow query detection and alerting
#   - API endpoint statistics
#   - Real-time performance dashboard data
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
import time
import logging
from functools import wraps

_logger = logging.getLogger(__name__)

# Performance thresholds (NFR-1.1: 95% of requests under 500ms)
SLOW_QUERY_THRESHOLD_MS = 500  # Warn if request takes > 500ms
CRITICAL_THRESHOLD_MS = 2000   # Critical if request takes > 2s


def monitor_api_performance(func):
    """
    Decorator to monitor API endpoint performance.
    Automatically logs response times and detects slow queries.
    
    Usage:
        @http.route('/api/endpoint', type='json', auth='user')
        @monitor_api_performance
        def my_endpoint(self, **kwargs):
            return {'result': 'data'}
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        endpoint = request.httprequest.path
        method = request.httprequest.method
        status_code = 200
        error_message = None
        
        try:
            # Execute the original function
            result = func(*args, **kwargs)
            
            # Calculate response time
            response_time_ms = (time.time() - start_time) * 1000
            
            # Log slow queries
            if response_time_ms > SLOW_QUERY_THRESHOLD_MS:
                if response_time_ms > CRITICAL_THRESHOLD_MS:
                    _logger.warning(
                        f"🔴 CRITICAL SLOW API: {endpoint} took {response_time_ms:.2f}ms "
                        f"(threshold: {CRITICAL_THRESHOLD_MS}ms)"
                    )
                else:
                    _logger.warning(
                        f"⚠️ SLOW API: {endpoint} took {response_time_ms:.2f}ms "
                        f"(threshold: {SLOW_QUERY_THRESHOLD_MS}ms)"
                    )
            else:
                _logger.info(f"✅ API: {endpoint} completed in {response_time_ms:.2f}ms")
            
            # Store performance log
            try:
                request.env['messob.fms.api.performance'].sudo().create({
                    'endpoint': endpoint,
                    'method': method,
                    'response_time_ms': response_time_ms,
                    'status_code': status_code,
                    'user_id': request.env.uid if request.env.uid else None,
                    'ip_address': request.httprequest.environ.get('REMOTE_ADDR'),
                    'user_agent': request.httprequest.environ.get('HTTP_USER_AGENT'),
                    'request_size_bytes': request.httprequest.content_length or 0,
                })
            except Exception as e:
                _logger.error(f"Failed to log API performance: {e}")
            
            return result
            
        except Exception as e:
            # Calculate response time even for errors
            response_time_ms = (time.time() - start_time) * 1000
            status_code = 500
            error_message = str(e)
            
            _logger.error(f"❌ API ERROR: {endpoint} failed after {response_time_ms:.2f}ms - {error_message}")
            
            # Store error log
            try:
                request.env['messob.fms.api.performance'].sudo().create({
                    'endpoint': endpoint,
                    'method': method,
                    'response_time_ms': response_time_ms,
                    'status_code': status_code,
                    'user_id': request.env.uid if request.env.uid else None,
                    'ip_address': request.httprequest.environ.get('REMOTE_ADDR'),
                    'user_agent': request.httprequest.environ.get('HTTP_USER_AGENT'),
                    'error_message': error_message,
                })
            except Exception as log_error:
                _logger.error(f"Failed to log API error: {log_error}")
            
            # Re-raise the exception
            raise
    
    return wrapper


class ApiPerformanceController(http.Controller):
    """
    Controller for accessing API performance metrics.
    """

    @http.route('/api/performance/statistics', type='json', auth='user', methods=['POST'])
    def get_statistics(self, hours=24, **kwargs):
        """
        Get API performance statistics.
        
        Request:
        {
            "hours": 24
        }
        
        Response:
        {
            "success": true,
            "total_requests": 1000,
            "average_response_time_ms": 250,
            ...
        }
        """
        try:
            # Check if user has admin rights
            if not request.env.user.has_group('messob_fleet.group_fms_admin'):
                return {
                    'success': False,
                    'error': 'Access denied: Admin rights required'
                }
            
            stats = request.env['messob.fms.api.performance'].get_performance_statistics(hours=hours)
            return stats
            
        except Exception as e:
            _logger.error(f"Failed to get performance statistics: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    @http.route('/api/performance/slow-queries', type='json', auth='user', methods=['POST'])
    def get_slow_queries(self, limit=50, **kwargs):
        """
        Get list of slow API queries.
        
        Response:
        {
            "success": true,
            "slow_queries": [
                {
                    "endpoint": "/api/trips/search",
                    "response_time_ms": 1500,
                    "timestamp": "2026-05-30 10:30:00",
                    ...
                }
            ]
        }
        """
        try:
            # Check if user has admin rights
            if not request.env.user.has_group('messob_fleet.group_fms_admin'):
                return {
                    'success': False,
                    'error': 'Access denied: Admin rights required'
                }
            
            slow_logs = request.env['messob.fms.api.performance'].search([
                ('response_time_ms', '>', SLOW_QUERY_THRESHOLD_MS)
            ], limit=limit, order='response_time_ms desc')
            
            slow_queries = []
            for log in slow_logs:
                slow_queries.append({
                    'endpoint': log.endpoint,
                    'method': log.method,
                    'response_time_ms': log.response_time_ms,
                    'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                    'user': log.user_id.name if log.user_id else 'Anonymous',
                    'performance_category': log.performance_category,
                    'error_message': log.error_message
                })
            
            return {
                'success': True,
                'slow_queries': slow_queries,
                'threshold_ms': SLOW_QUERY_THRESHOLD_MS
            }
            
        except Exception as e:
            _logger.error(f"Failed to get slow queries: {e}")
            return {
                'success': False,
                'error': str(e)
            }
