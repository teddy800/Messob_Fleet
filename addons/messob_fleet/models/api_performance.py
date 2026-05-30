# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: API Performance Log (NFR-1.1)
# Description: Model for storing API performance metrics and response times.
# ---------------------------------------------------------------------------

from odoo import models, fields, api
import logging
from collections import defaultdict

_logger = logging.getLogger(__name__)

# Performance thresholds (NFR-1.1: 95% of requests under 500ms)
SLOW_QUERY_THRESHOLD_MS = 500  # Warn if request takes > 500ms
CRITICAL_THRESHOLD_MS = 2000   # Critical if request takes > 2s


class ApiPerformanceLog(models.Model):
    """
    Model to store API performance metrics.
    Used for monitoring and analytics.
    """
    _name = 'messob.fms.api.performance'
    _description = 'API Performance Log'
    _order = 'timestamp desc'
    _rec_name = 'endpoint'

    timestamp = fields.Datetime(
        string='Timestamp',
        default=fields.Datetime.now,
        required=True,
        index=True,
    )

    endpoint = fields.Char(
        string='API Endpoint',
        required=True,
        index=True,
    )

    method = fields.Char(
        string='HTTP Method',
        required=True,
    )

    response_time_ms = fields.Float(
        string='Response Time (ms)',
        required=True,
        index=True,
    )

    status_code = fields.Integer(
        string='HTTP Status Code',
        required=True,
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='User',
        index=True,
    )

    ip_address = fields.Char(
        string='IP Address',
    )

    user_agent = fields.Text(
        string='User Agent',
    )

    request_size_bytes = fields.Integer(
        string='Request Size (bytes)',
    )

    response_size_bytes = fields.Integer(
        string='Response Size (bytes)',
    )

    error_message = fields.Text(
        string='Error Message',
    )

    performance_category = fields.Selection(
        selection=[
            ('excellent', 'Excellent (< 200ms)'),
            ('good', 'Good (200-500ms)'),
            ('slow', 'Slow (500-2000ms)'),
            ('critical', 'Critical (> 2000ms)'),
        ],
        string='Performance Category',
        compute='_compute_performance_category',
        store=True,
        index=True,
    )

    @api.depends('response_time_ms')
    def _compute_performance_category(self):
        for rec in self:
            if rec.response_time_ms < 200:
                rec.performance_category = 'excellent'
            elif rec.response_time_ms < 500:
                rec.performance_category = 'good'
            elif rec.response_time_ms < 2000:
                rec.performance_category = 'slow'
            else:
                rec.performance_category = 'critical'

    @api.model
    def get_performance_statistics(self, hours=24):
        """
        Get performance statistics for the last N hours.
        
        Returns:
        {
            'total_requests': 1000,
            'average_response_time_ms': 250,
            'p95_response_time_ms': 450,
            'p99_response_time_ms': 800,
            'slow_requests_count': 50,
            'critical_requests_count': 5,
            'requests_by_endpoint': {...},
            'performance_trend': [...]
        }
        """
        from datetime import datetime, timedelta
        
        start_time = datetime.now() - timedelta(hours=hours)
        
        logs = self.search([
            ('timestamp', '>=', start_time)
        ], order='response_time_ms asc')
        
        if not logs:
            return {
                'success': True,
                'total_requests': 0,
                'message': 'No data available'
            }
        
        # Calculate statistics
        response_times = logs.mapped('response_time_ms')
        total_requests = len(response_times)
        
        # Calculate percentiles
        p95_index = int(total_requests * 0.95)
        p99_index = int(total_requests * 0.99)
        
        # Group by endpoint
        endpoint_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'slow_count': 0})
        for log in logs:
            endpoint_stats[log.endpoint]['count'] += 1
            endpoint_stats[log.endpoint]['total_time'] += log.response_time_ms
            if log.response_time_ms > SLOW_QUERY_THRESHOLD_MS:
                endpoint_stats[log.endpoint]['slow_count'] += 1
        
        # Calculate averages
        requests_by_endpoint = {}
        for endpoint, stats in endpoint_stats.items():
            requests_by_endpoint[endpoint] = {
                'count': stats['count'],
                'average_response_time_ms': round(stats['total_time'] / stats['count'], 2),
                'slow_requests': stats['slow_count']
            }
        
        return {
            'success': True,
            'period_hours': hours,
            'total_requests': total_requests,
            'average_response_time_ms': round(sum(response_times) / total_requests, 2),
            'p95_response_time_ms': round(response_times[p95_index] if p95_index < total_requests else response_times[-1], 2),
            'p99_response_time_ms': round(response_times[p99_index] if p99_index < total_requests else response_times[-1], 2),
            'slow_requests_count': len([t for t in response_times if t > SLOW_QUERY_THRESHOLD_MS]),
            'critical_requests_count': len([t for t in response_times if t > CRITICAL_THRESHOLD_MS]),
            'requests_by_endpoint': requests_by_endpoint,
            'performance_compliance': {
                'target': '95% under 500ms',
                'actual_percentage': round((1 - len([t for t in response_times if t > SLOW_QUERY_THRESHOLD_MS]) / total_requests) * 100, 2),
                'compliant': len([t for t in response_times if t > SLOW_QUERY_THRESHOLD_MS]) / total_requests < 0.05
            }
        }

    @api.model
    def _cron_cleanup_old_logs(self):
        """
        Cron job to clean up old performance logs.
        Keeps last 30 days of data.
        """
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=30)
        old_logs = self.search([('timestamp', '<', cutoff_date)])
        count = len(old_logs)
        old_logs.unlink()
        
        _logger.info(f"Cleaned up {count} old API performance logs")
        return count
