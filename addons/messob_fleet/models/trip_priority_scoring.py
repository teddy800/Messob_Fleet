# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: Trip Request Priority Scoring (FR-2.1 Enhancement)
# Description: Advanced priority scoring algorithm for intelligent queueing.
#
# Features:
#   - Multi-factor priority scoring
#   - Urgency-based prioritization
#   - Requester history consideration
#   - Distance and resource optimization
#   - Dynamic priority adjustment
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class MessobFmsTripPriorityScoring(models.Model):
    """
    Extension to messob.fms.trip for advanced priority scoring.
    Implements intelligent queueing beyond simple FIFO.
    """
    _inherit = 'messob.fms.trip'

    # =========================================================================
    # PRIORITY SCORING FIELDS
    # =========================================================================

    priority_score = fields.Float(
        string='Priority Score',
        compute='_compute_priority_score',
        store=True,
        index=True,
        help='Calculated priority score (0-100). Higher = more urgent.'
    )

    priority_level = fields.Selection(
        selection=[
            ('low', 'Low Priority'),
            ('normal', 'Normal Priority'),
            ('high', 'High Priority'),
            ('urgent', 'Urgent'),
            ('critical', 'Critical'),
        ],
        string='Priority Level',
        compute='_compute_priority_level',
        store=True,
        index=True,
    )

    manual_priority = fields.Selection(
        selection=[
            ('low', 'Low'),
            ('normal', 'Normal'),
            ('high', 'High'),
            ('urgent', 'Urgent'),
            ('critical', 'Critical'),
        ],
        string='Manual Priority Override',
        help='Dispatcher can manually override calculated priority.',
        tracking=True,
    )

    urgency_reason = fields.Selection(
        selection=[
            ('emergency', 'Emergency'),
            ('medical', 'Medical'),
            ('vip', 'VIP Transport'),
            ('time_sensitive', 'Time Sensitive'),
            ('official_duty', 'Official Duty'),
            ('routine', 'Routine'),
        ],
        string='Urgency Reason',
        default='routine',
        tracking=True,
        help='Reason for trip urgency affects priority scoring.',
    )

    estimated_distance_km = fields.Float(
        string='Estimated Distance (km)',
        help='Estimated trip distance for resource optimization.',
    )

    # =========================================================================
    # PRIORITY SCORE CALCULATION
    # =========================================================================

    @api.depends(
        'start_dt', 'end_dt', 'create_date', 'urgency_reason', 
        'manual_priority', 'requester_id', 'estimated_distance_km'
    )
    def _compute_priority_score(self):
        """
        Calculate priority score based on multiple factors:
        
        Scoring factors (0-100 scale):
        1. Time urgency (0-30 points): How soon the trip starts
        2. Urgency reason (0-25 points): Emergency, Medical, VIP, etc.
        3. Wait time (0-20 points): How long request has been pending
        4. Requester history (0-15 points): Frequency and reliability
        5. Distance optimization (0-10 points): Shorter trips prioritized
        
        Manual priority override adds/subtracts points.
        """
        for rec in self:
            if rec.state not in ['pending']:
                rec.priority_score = 0
                continue
            
            score = 0
            
            # Factor 1: Time Urgency (0-30 points)
            score += rec._calculate_time_urgency_score()
            
            # Factor 2: Urgency Reason (0-25 points)
            score += rec._calculate_urgency_reason_score()
            
            # Factor 3: Wait Time (0-20 points)
            score += rec._calculate_wait_time_score()
            
            # Factor 4: Requester History (0-15 points)
            score += rec._calculate_requester_history_score()
            
            # Factor 5: Distance Optimization (0-10 points)
            score += rec._calculate_distance_score()
            
            # Manual Priority Override
            if rec.manual_priority:
                score += rec._get_manual_priority_adjustment()
            
            # Ensure score is within 0-100 range
            rec.priority_score = max(0, min(100, score))

    @api.depends('priority_score', 'manual_priority')
    def _compute_priority_level(self):
        """Convert numeric score to priority level."""
        for rec in self:
            # Manual override takes precedence
            if rec.manual_priority:
                rec.priority_level = rec.manual_priority
            elif rec.priority_score >= 80:
                rec.priority_level = 'critical'
            elif rec.priority_score >= 60:
                rec.priority_level = 'urgent'
            elif rec.priority_score >= 40:
                rec.priority_level = 'high'
            elif rec.priority_score >= 20:
                rec.priority_level = 'normal'
            else:
                rec.priority_level = 'low'

    def _calculate_time_urgency_score(self):
        """
        Calculate score based on how soon the trip starts.
        
        Scoring:
        - Starts within 2 hours: 30 points
        - Starts within 6 hours: 25 points
        - Starts within 24 hours: 20 points
        - Starts within 3 days: 15 points
        - Starts within 1 week: 10 points
        - Starts later: 5 points
        """
        if not self.start_dt:
            return 5
        
        now = fields.Datetime.now()
        time_until_start = self.start_dt - now
        hours_until_start = time_until_start.total_seconds() / 3600
        
        if hours_until_start < 0:
            # Trip should have started already - critical!
            return 30
        elif hours_until_start <= 2:
            return 30
        elif hours_until_start <= 6:
            return 25
        elif hours_until_start <= 24:
            return 20
        elif hours_until_start <= 72:  # 3 days
            return 15
        elif hours_until_start <= 168:  # 1 week
            return 10
        else:
            return 5

    def _calculate_urgency_reason_score(self):
        """
        Calculate score based on urgency reason.
        
        Scoring:
        - Emergency: 25 points
        - Medical: 23 points
        - VIP: 20 points
        - Time Sensitive: 15 points
        - Official Duty: 10 points
        - Routine: 5 points
        """
        urgency_scores = {
            'emergency': 25,
            'medical': 23,
            'vip': 20,
            'time_sensitive': 15,
            'official_duty': 10,
            'routine': 5,
        }
        return urgency_scores.get(self.urgency_reason, 5)

    def _calculate_wait_time_score(self):
        """
        Calculate score based on how long the request has been waiting.
        
        Scoring:
        - Waiting > 48 hours: 20 points
        - Waiting > 24 hours: 15 points
        - Waiting > 12 hours: 10 points
        - Waiting > 6 hours: 7 points
        - Waiting > 2 hours: 5 points
        - Waiting < 2 hours: 2 points
        """
        if not self.create_date:
            return 2
        
        now = fields.Datetime.now()
        wait_time = now - self.create_date
        hours_waiting = wait_time.total_seconds() / 3600
        
        if hours_waiting > 48:
            return 20
        elif hours_waiting > 24:
            return 15
        elif hours_waiting > 12:
            return 10
        elif hours_waiting > 6:
            return 7
        elif hours_waiting > 2:
            return 5
        else:
            return 2

    def _calculate_requester_history_score(self):
        """
        Calculate score based on requester's history.
        
        Factors:
        - Completion rate (completed vs cancelled trips)
        - Request frequency (regular users get slight priority)
        - No-show history (reduces priority)
        
        Scoring: 0-15 points
        """
        if not self.requester_id:
            return 5
        
        # Get requester's trip history
        all_trips = self.search([
            ('requester_id', '=', self.requester_id.id),
            ('id', '!=', self.id),
        ])
        
        if not all_trips:
            return 5  # New user, neutral score
        
        completed_trips = all_trips.filtered(lambda t: t.state == 'completed')
        cancelled_trips = all_trips.filtered(lambda t: t.state in ['draft', 'rejected'])
        
        total_trips = len(all_trips)
        completion_rate = len(completed_trips) / total_trips if total_trips > 0 else 0
        
        # Base score on completion rate
        score = completion_rate * 10  # 0-10 points
        
        # Bonus for regular users (5+ trips)
        if total_trips >= 5:
            score += 3
        
        # Penalty for high cancellation rate
        cancellation_rate = len(cancelled_trips) / total_trips if total_trips > 0 else 0
        if cancellation_rate > 0.3:  # More than 30% cancellations
            score -= 3
        
        return max(0, min(15, score))

    def _calculate_distance_score(self):
        """
        Calculate score based on trip distance.
        Shorter trips get slight priority for resource optimization.
        
        Scoring:
        - < 10 km: 10 points
        - 10-30 km: 7 points
        - 30-50 km: 5 points
        - 50-100 km: 3 points
        - > 100 km: 1 point
        """
        if not self.estimated_distance_km or self.estimated_distance_km <= 0:
            return 5  # Neutral score if distance unknown
        
        distance = self.estimated_distance_km
        
        if distance < 10:
            return 10
        elif distance < 30:
            return 7
        elif distance < 50:
            return 5
        elif distance < 100:
            return 3
        else:
            return 1

    def _get_manual_priority_adjustment(self):
        """
        Get score adjustment for manual priority override.
        
        Adjustments:
        - Critical: +20 points
        - Urgent: +10 points
        - High: +5 points
        - Normal: 0 points
        - Low: -10 points
        """
        adjustments = {
            'critical': 20,
            'urgent': 10,
            'high': 5,
            'normal': 0,
            'low': -10,
        }
        return adjustments.get(self.manual_priority, 0)

    # =========================================================================
    # PRIORITY QUEUE METHODS
    # =========================================================================

    @api.model
    def get_priority_queue(self, limit=50):
        """
        Get pending requests ordered by priority score.
        
        Returns list of trips with priority information:
        [
            {
                'id': 123,
                'name': 'REQ/2026/0001',
                'priority_score': 85.5,
                'priority_level': 'urgent',
                'requester': 'John Doe',
                'start_dt': '2026-05-30 14:00:00',
                'urgency_reason': 'medical',
                ...
            }
        ]
        """
        trips = self.search([
            ('state', '=', 'pending')
        ], order='priority_score desc, create_date asc', limit=limit)
        
        queue = []
        for trip in trips:
            queue.append({
                'id': trip.id,
                'name': trip.name,
                'priority_score': trip.priority_score,
                'priority_level': trip.priority_level,
                'requester': trip.requester_id.name if trip.requester_id else 'Unknown',
                'start_dt': trip.start_dt.isoformat() if trip.start_dt else None,
                'end_dt': trip.end_dt.isoformat() if trip.end_dt else None,
                'pickup': trip.pickup,
                'destination': trip.destination,
                'urgency_reason': trip.urgency_reason,
                'vehicle_category': trip.vehicle_category,
                'purpose': trip.purpose[:100] + '...' if len(trip.purpose) > 100 else trip.purpose,
                'wait_time_hours': (fields.Datetime.now() - trip.create_date).total_seconds() / 3600 if trip.create_date else 0,
            })
        
        return {
            'success': True,
            'queue': queue,
            'total_pending': len(trips)
        }

    def action_set_manual_priority(self, priority):
        """
        Dispatcher action to manually override priority.
        
        Args:
            priority (str): One of 'low', 'normal', 'high', 'urgent', 'critical'
        """
        self.ensure_one()
        
        if priority not in ['low', 'normal', 'high', 'urgent', 'critical']:
            raise ValueError(_('Invalid priority level'))
        
        self.write({'manual_priority': priority})
        
        # Log priority change
        self.env['messob.fms.audit.log'].sudo().log_business_action(
            action='UPDATE',
            model=self._name,
            record_id=self.id,
            description=f"Manual priority set to {priority} for trip {self.name}",
            severity='medium'
        )
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Priority Updated'),
                'message': _('Trip priority set to %s') % priority.upper(),
                'type': 'success',
            }
        }

    @api.model
    def _cron_recalculate_priorities(self):
        """
        Cron job to recalculate priorities for all pending trips.
        Runs every hour to ensure priorities stay current.
        """
        pending_trips = self.search([('state', '=', 'pending')])
        
        for trip in pending_trips:
            trip._compute_priority_score()
        
        _logger.info(f"Recalculated priorities for {len(pending_trips)} pending trips")
        return len(pending_trips)

    @api.model
    def get_priority_statistics(self):
        """
        Get statistics about priority distribution.
        
        Returns:
        {
            'total_pending': 50,
            'by_level': {
                'critical': 5,
                'urgent': 10,
                'high': 15,
                'normal': 15,
                'low': 5
            },
            'average_score': 45.5,
            'average_wait_time_hours': 12.3
        }
        """
        pending_trips = self.search([('state', '=', 'pending')])
        
        if not pending_trips:
            return {
                'success': True,
                'total_pending': 0,
                'message': 'No pending trips'
            }
        
        # Count by priority level
        by_level = {
            'critical': len(pending_trips.filtered(lambda t: t.priority_level == 'critical')),
            'urgent': len(pending_trips.filtered(lambda t: t.priority_level == 'urgent')),
            'high': len(pending_trips.filtered(lambda t: t.priority_level == 'high')),
            'normal': len(pending_trips.filtered(lambda t: t.priority_level == 'normal')),
            'low': len(pending_trips.filtered(lambda t: t.priority_level == 'low')),
        }
        
        # Calculate averages
        scores = pending_trips.mapped('priority_score')
        average_score = sum(scores) / len(scores) if scores else 0
        
        now = fields.Datetime.now()
        wait_times = [(now - trip.create_date).total_seconds() / 3600 for trip in pending_trips if trip.create_date]
        average_wait_time = sum(wait_times) / len(wait_times) if wait_times else 0
        
        return {
            'success': True,
            'total_pending': len(pending_trips),
            'by_level': by_level,
            'average_score': round(average_score, 2),
            'average_wait_time_hours': round(average_wait_time, 2),
            'oldest_request_hours': max(wait_times) if wait_times else 0
        }
