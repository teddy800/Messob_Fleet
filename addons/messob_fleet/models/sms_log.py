# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.sms.log
# Description: SMS Notification Logging System
#
# Features:
#   - Track all SMS notifications sent
#   - Monitor delivery status
#   - Cost tracking (optional)
#   - Retry failed messages
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import UserError
import logging

_logger = logging.getLogger(__name__)


class MessobFmsSmsLog(models.Model):
    """
    SMS Notification Log
    Tracks all SMS messages sent by the system for audit and monitoring.
    """

    _name = 'messob.fms.sms.log'
    _description = 'MESSOB FMS - SMS Log'
    _order = 'create_date desc'
    _rec_name = 'recipient_name'

    # ── Active Field (for archiving) ──
    active = fields.Boolean(
        string='Active',
        default=True,
        help='Set to false to archive this SMS log.',
    )

    # ── Recipient Information ──
    recipient_name = fields.Char(
        string='Recipient Name',
        required=True,
        index=True,
        help='Name of the SMS recipient.',
    )

    recipient_mobile = fields.Char(
        string='Mobile Number',
        required=True,
        index=True,
        help='Mobile phone number (with country code).',
    )

    # ── Message Details ──
    message = fields.Text(
        string='Message Content',
        required=True,
        help='SMS message content sent.',
    )

    message_length = fields.Integer(
        string='Message Length',
        compute='_compute_message_length',
        store=True,
        help='Length of the message in characters.',
    )

    # ── Delivery Status ──
    status = fields.Selection(
        selection=[
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('delivered', 'Delivered'),
            ('failed', 'Failed'),
            ('retry', 'Retry Scheduled'),
        ],
        string='Status',
        default='pending',
        required=True,
        index=True,
        help='Current delivery status of the SMS.',
    )

    sent_date = fields.Datetime(
        string='Sent Date',
        default=fields.Datetime.now,
        help='When the SMS was sent.',
    )

    delivered_date = fields.Datetime(
        string='Delivered Date',
        help='When the SMS was delivered (if supported by provider).',
    )

    # ── Provider Information ──
    provider = fields.Selection(
        selection=[
            ('twilio', 'Twilio'),
            ('aws_sns', 'AWS SNS'),
            ('local', 'Local Gateway'),
            ('other', 'Other'),
        ],
        string='SMS Provider',
        required=True,
        help='SMS gateway provider used.',
    )

    provider_message_id = fields.Char(
        string='Provider Message ID',
        help='Unique message ID from the SMS provider.',
    )

    # ── Error Handling ──
    error_message = fields.Text(
        string='Error Message',
        help='Error message if SMS failed to send.',
    )

    retry_count = fields.Integer(
        string='Retry Count',
        default=0,
        help='Number of retry attempts.',
    )

    max_retries = fields.Integer(
        string='Max Retries',
        default=3,
        help='Maximum number of retry attempts.',
    )

    # ── Cost Tracking (Optional) ──
    cost = fields.Float(
        string='Cost',
        digits=(10, 4),
        help='Cost of sending this SMS (if tracked).',
    )

    currency_id = fields.Many2one(
        comodel_name='res.currency',
        string='Currency',
        default=lambda self: self.env.company.currency_id,
        help='Currency for cost tracking.',
    )

    # ── Related Record ──
    related_model = fields.Char(
        string='Related Model',
        help='Model name of the related record (e.g., messob.fms.maintenance.alert).',
    )

    related_id = fields.Integer(
        string='Related Record ID',
        help='ID of the related record.',
    )

    related_record = fields.Char(
        string='Related Record',
        compute='_compute_related_record',
        help='Display name of the related record.',
    )

    # ── Computed Fields ──
    @api.depends('message')
    def _compute_message_length(self):
        for record in self:
            record.message_length = len(record.message) if record.message else 0

    @api.depends('related_model', 'related_id')
    def _compute_related_record(self):
        for record in self:
            if record.related_model and record.related_id:
                try:
                    related = self.env[record.related_model].browse(record.related_id)
                    if related.exists():
                        record.related_record = f"{record.related_model} ({related.display_name})"
                    else:
                        record.related_record = f"{record.related_model} (Deleted)"
                except Exception:
                    record.related_record = f"{record.related_model} (Error)"
            else:
                record.related_record = False

    # ── Actions ──
    def action_retry_send(self):
        """Retry sending failed SMS."""
        self.ensure_one()
        
        if self.status not in ['failed', 'retry']:
            raise UserError(_("Only failed SMS can be retried."))
        
        if self.retry_count >= self.max_retries:
            raise UserError(_("Maximum retry attempts reached."))
        
        # Increment retry count
        self.write({
            'retry_count': self.retry_count + 1,
            'status': 'retry',
        })
        
        # Attempt to resend
        try:
            # Get the SMS provider configuration
            sms_provider = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.sms_provider', 'twilio')
            
            # Call the appropriate SMS sending method
            if sms_provider == 'twilio':
                success = self._retry_send_twilio()
            elif sms_provider == 'aws_sns':
                success = self._retry_send_aws_sns()
            elif sms_provider == 'local':
                success = self._retry_send_local()
            else:
                success = False
            
            if success:
                self.write({
                    'status': 'sent',
                    'sent_date': fields.Datetime.now(),
                    'error_message': False,
                })
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Success'),
                        'message': _('SMS resent successfully.'),
                        'type': 'success',
                        'sticky': False,
                    }
                }
            else:
                self.write({'status': 'failed'})
                raise UserError(_("Failed to resend SMS. Check error logs."))
                
        except Exception as e:
            self.write({
                'status': 'failed',
                'error_message': str(e),
            })
            raise UserError(_("Error retrying SMS: %s") % str(e))

    def _retry_send_twilio(self):
        """Retry sending via Twilio."""
        try:
            import requests
            
            account_sid = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.twilio_account_sid')
            auth_token = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.twilio_auth_token')
            from_number = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.twilio_from_number')
            
            if not all([account_sid, auth_token, from_number]):
                return False
            
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            
            response = requests.post(
                url,
                auth=(account_sid, auth_token),
                data={
                    'From': from_number,
                    'To': self.recipient_mobile,
                    'Body': self.message,
                },
                timeout=10
            )
            
            if response.status_code == 201:
                response_data = response.json()
                self.provider_message_id = response_data.get('sid')
                return True
            
            return False
            
        except Exception as e:
            _logger.error(f"Twilio retry error: {e}")
            return False

    def _retry_send_aws_sns(self):
        """Retry sending via AWS SNS."""
        try:
            import boto3
            
            aws_access_key = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.aws_access_key_id')
            aws_secret_key = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.aws_secret_access_key')
            aws_region = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.aws_region', 'us-east-1')
            
            if not all([aws_access_key, aws_secret_key]):
                return False
            
            sns_client = boto3.client(
                'sns',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            response = sns_client.publish(
                PhoneNumber=self.recipient_mobile,
                Message=self.message,
                MessageAttributes={
                    'AWS.SNS.SMS.SMSType': {
                        'DataType': 'String',
                        'StringValue': 'Transactional'
                    }
                }
            )
            
            if response['ResponseMetadata']['HTTPStatusCode'] == 200:
                self.provider_message_id = response.get('MessageId')
                return True
            
            return False
            
        except Exception as e:
            _logger.error(f"AWS SNS retry error: {e}")
            return False

    def _retry_send_local(self):
        """Retry sending via local gateway."""
        try:
            import requests
            
            gateway_url = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.sms_gateway_url')
            gateway_api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fleet.sms_gateway_api_key')
            
            if not all([gateway_url, gateway_api_key]):
                return False
            
            response = requests.post(
                gateway_url,
                headers={'Authorization': f'Bearer {gateway_api_key}'},
                json={
                    'to': self.recipient_mobile,
                    'message': self.message,
                    'sender': 'MESSOB Fleet',
                },
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                self.provider_message_id = response_data.get('message_id')
                return True
            
            return False
            
        except Exception as e:
            _logger.error(f"Local gateway retry error: {e}")
            return False

    # ── Cron Job Methods ──
    @api.model
    def _cron_retry_failed_sms(self):
        """
        Cron job to automatically retry failed SMS messages.
        Runs every hour to retry messages that haven't exceeded max retries.
        """
        _logger.info("Running SMS retry cron job")
        
        failed_sms = self.search([
            ('status', '=', 'failed'),
            ('retry_count', '<', 3),  # Max 3 retries
        ])
        
        retried_count = 0
        for sms in failed_sms:
            try:
                sms.action_retry_send()
                retried_count += 1
            except Exception as e:
                _logger.error(f"Failed to retry SMS {sms.id}: {e}")
        
        _logger.info(f"SMS retry cron job completed. Retried {retried_count} messages.")

    @api.model
    def _cron_cleanup_old_sms_logs(self):
        """
        Cron job to clean up old SMS logs (older than 90 days).
        Keeps the database size manageable.
        """
        _logger.info("Running SMS log cleanup cron job")
        
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=90)
        
        old_logs = self.search([
            ('create_date', '<', cutoff_date),
            ('status', 'in', ['sent', 'delivered', 'failed']),
        ])
        
        count = len(old_logs)
        old_logs.unlink()
        
        _logger.info(f"SMS log cleanup completed. Deleted {count} old records.")

    # ── Statistics Methods ──
    @api.model
    def get_sms_statistics(self, date_from=None, date_to=None):
        """Get SMS sending statistics for a date range."""
        domain = []
        
        if date_from:
            domain.append(('create_date', '>=', date_from))
        if date_to:
            domain.append(('create_date', '<=', date_to))
        
        all_sms = self.search(domain)
        
        return {
            'total': len(all_sms),
            'sent': len(all_sms.filtered(lambda s: s.status == 'sent')),
            'delivered': len(all_sms.filtered(lambda s: s.status == 'delivered')),
            'failed': len(all_sms.filtered(lambda s: s.status == 'failed')),
            'pending': len(all_sms.filtered(lambda s: s.status == 'pending')),
            'total_cost': sum(all_sms.mapped('cost')),
            'average_length': sum(all_sms.mapped('message_length')) / len(all_sms) if all_sms else 0,
        }
