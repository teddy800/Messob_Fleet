# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.sms.log
# Description: SMS sending log for tracking and auditing
# ---------------------------------------------------------------------------

from odoo import models, fields, api


class MessobFmsSmsLog(models.Model):
    """
    SMS Log Model.
    Tracks all SMS messages sent by the system.
    """

    _name = 'messob.fms.sms.log'
    _description = 'MESSOB FMS - SMS Log'
    _order = 'sent_date desc'

    # =========================================================================
    # FIELDS
    # =========================================================================

    phone_number = fields.Char(
        string='Phone Number',
        required=True,
        index=True
    )

    message = fields.Text(
        string='Message',
        required=True
    )

    provider = fields.Selection([
        ('africastalking', "Africa's Talking"),
        ('twilio', 'Twilio'),
        ('nexmo', 'Nexmo/Vonage'),
        ('aws', 'AWS SNS'),
        ('custom', 'Custom Gateway'),
        ('fallback', 'Fallback (Not Sent)')
    ], string='Provider', index=True)

    message_id = fields.Char(
        string='Message ID',
        help='Provider message ID'
    )

    status = fields.Selection([
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('pending', 'Pending')
    ], string='Status', default='pending', index=True)

    cost = fields.Float(
        string='Cost',
        digits=(10, 4),
        help='SMS cost in local currency'
    )

    priority = fields.Selection([
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent')
    ], string='Priority', default='normal')

    sent_date = fields.Datetime(
        string='Sent Date',
        default=fields.Datetime.now,
        required=True,
        index=True
    )

    success = fields.Boolean(
        string='Success',
        default=False,
        index=True
    )

    error_message = fields.Text(
        string='Error Message'
    )

    # Related records
    trip_id = fields.Many2one(
        'messob.fms.trip',
        string='Related Trip',
        ondelete='set null'
    )

    driver_id = fields.Many2one(
        'messob.fms.driver',
        string='Related Driver',
        ondelete='set null'
    )

    # =========================================================================
    # METHODS
    # =========================================================================

    @api.model
    def get_statistics(self, date_from=None, date_to=None):
        """
        Get SMS statistics for a date range.
        
        Args:
            date_from (datetime): Start date
            date_to (datetime): End date
            
        Returns:
            dict: Statistics
        """
        domain = []
        
        if date_from:
            domain.append(('sent_date', '>=', date_from))
        if date_to:
            domain.append(('sent_date', '<=', date_to))
        
        logs = self.search(domain)
        
        total = len(logs)
        sent = len(logs.filtered(lambda l: l.success))
        failed = total - sent
        total_cost = sum(logs.mapped('cost'))
        
        by_provider = {}
        for provider in logs.mapped('provider'):
            provider_logs = logs.filtered(lambda l: l.provider == provider)
            by_provider[provider] = {
                'count': len(provider_logs),
                'cost': sum(provider_logs.mapped('cost'))
            }
        
        return {
            'total': total,
            'sent': sent,
            'failed': failed,
            'success_rate': (sent / total * 100) if total > 0 else 0,
            'total_cost': total_cost,
            'by_provider': by_provider
        }
