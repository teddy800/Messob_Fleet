# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Service: SMS Service
# Description: Advanced SMS gateway with multiple provider support
#
# Supported Providers:
#   - Twilio
#   - Africa's Talking
#   - Nexmo/Vonage
#   - AWS SNS
#   - Custom HTTP Gateway
# ---------------------------------------------------------------------------

import requests
import logging
from datetime import datetime
from odoo import api, models, _
from odoo.exceptions import UserError
import json

_logger = logging.getLogger(__name__)


class SmsService(models.AbstractModel):
    """
    Advanced SMS Service with multiple provider support.
    Sends SMS notifications for trip updates, maintenance alerts, etc.
    """

    _name = 'messob.fms.sms.service'
    _description = 'MESSOB FMS - SMS Service'

    # =========================================================================
    # PUBLIC API
    # =========================================================================

    @api.model
    def send_sms(self, phone_number, message, provider='auto', priority='normal'):
        """
        Send SMS message.
        
        Args:
            phone_number (str): Recipient phone number (E.164 format)
            message (str): SMS message content
            provider (str): 'twilio', 'africastalking', 'nexmo', 'aws', 'custom', or 'auto'
            priority (str): 'low', 'normal', 'high', 'urgent'
            
        Returns:
            dict: {
                'success': bool,
                'message_id': str,
                'provider': str,
                'cost': float,
                'status': str
            }
        """
        try:
            # Validate phone number
            if not phone_number:
                return {'success': False, 'error': 'Phone number is required'}
            
            # Normalize phone number
            phone_number = self._normalize_phone_number(phone_number)
            
            # Validate message
            if not message or len(message) > 1600:
                return {'success': False, 'error': 'Invalid message length'}
            
            # Try providers in order
            if provider == 'auto':
                providers = self._get_provider_priority()
            else:
                providers = [provider]
            
            for prov in providers:
                try:
                    if prov == 'africastalking':
                        result = self._send_africastalking(phone_number, message)
                    elif prov == 'twilio':
                        result = self._send_twilio(phone_number, message)
                    elif prov == 'nexmo':
                        result = self._send_nexmo(phone_number, message)
                    elif prov == 'aws':
                        result = self._send_aws_sns(phone_number, message)
                    elif prov == 'custom':
                        result = self._send_custom(phone_number, message)
                    
                    if result and result.get('success'):
                        # Log SMS
                        self._log_sms(phone_number, message, result, priority)
                        return result
                        
                except Exception as e:
                    _logger.warning(f"SMS failed with {prov}: {e}")
                    continue
            
            # All providers failed, log only
            return self._send_fallback(phone_number, message)
            
        except Exception as e:
            _logger.error(f"SMS error: {e}")
            return {'success': False, 'error': str(e)}

    # =========================================================================
    # AFRICA'S TALKING SMS API (Primary for Ethiopia)
    # =========================================================================

    def _send_africastalking(self, phone_number, message):
        """Send SMS using Africa's Talking API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.africastalking_api_key')
        username = self.env['ir.config_parameter'].sudo().get_param('messob_fms.africastalking_username')
        
        if not api_key or not username:
            raise UserError(_("Africa's Talking credentials not configured"))
        
        url = "https://api.africastalking.com/version1/messaging"
        
        headers = {
            'apiKey': api_key,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
        
        data = {
            'username': username,
            'to': phone_number,
            'message': message
        }
        
        response = requests.post(url, headers=headers, data=data, timeout=30)
        result = response.json()
        
        if result.get('SMSMessageData', {}).get('Recipients'):
            recipient = result['SMSMessageData']['Recipients'][0]
            
            if recipient['status'] == 'Success':
                return {
                    'success': True,
                    'message_id': recipient.get('messageId'),
                    'provider': 'africastalking',
                    'cost': float(recipient.get('cost', '0').replace('KES ', '')),
                    'status': 'sent'
                }
            else:
                return {
                    'success': False,
                    'error': recipient.get('status')
                }
        else:
            return {'success': False, 'error': 'No response from provider'}

    # =========================================================================
    # TWILIO SMS API
    # =========================================================================

    def _send_twilio(self, phone_number, message):
        """Send SMS using Twilio API."""
        account_sid = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_account_sid')
        auth_token = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_auth_token')
        from_number = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_from_number')
        
        if not account_sid or not auth_token or not from_number:
            raise UserError(_("Twilio credentials not configured"))
        
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        
        data = {
            'From': from_number,
            'To': phone_number,
            'Body': message
        }
        
        response = requests.post(url, data=data, auth=(account_sid, auth_token), timeout=30)
        result = response.json()
        
        if response.status_code in [200, 201]:
            return {
                'success': True,
                'message_id': result.get('sid'),
                'provider': 'twilio',
                'cost': float(result.get('price', 0) or 0),
                'status': result.get('status', 'sent')
            }
        else:
            return {
                'success': False,
                'error': result.get('message', 'Unknown error')
            }

    # =========================================================================
    # NEXMO/VONAGE SMS API
    # =========================================================================

    def _send_nexmo(self, phone_number, message):
        """Send SMS using Nexmo/Vonage API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.nexmo_api_key')
        api_secret = self.env['ir.config_parameter'].sudo().get_param('messob_fms.nexmo_api_secret')
        from_name = self.env['ir.config_parameter'].sudo().get_param('messob_fms.nexmo_from_name', 'MESSOB')
        
        if not api_key or not api_secret:
            raise UserError(_("Nexmo credentials not configured"))
        
        url = "https://rest.nexmo.com/sms/json"
        
        data = {
            'api_key': api_key,
            'api_secret': api_secret,
            'from': from_name,
            'to': phone_number.replace('+', ''),
            'text': message
        }
        
        response = requests.post(url, json=data, timeout=30)
        result = response.json()
        
        if result.get('messages'):
            msg = result['messages'][0]
            
            if msg['status'] == '0':
                return {
                    'success': True,
                    'message_id': msg.get('message-id'),
                    'provider': 'nexmo',
                    'cost': float(msg.get('message-price', 0)),
                    'status': 'sent'
                }
            else:
                return {
                    'success': False,
                    'error': msg.get('error-text', 'Unknown error')
                }
        else:
            return {'success': False, 'error': 'No response from provider'}

    # =========================================================================
    # AWS SNS SMS
    # =========================================================================

    def _send_aws_sns(self, phone_number, message):
        """Send SMS using AWS SNS."""
        try:
            import boto3
            
            access_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_access_key')
            secret_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_secret_key')
            region = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_region', 'us-east-1')
            
            if not access_key or not secret_key:
                raise UserError(_("AWS credentials not configured"))
            
            client = boto3.client(
                'sns',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            
            response = client.publish(
                PhoneNumber=phone_number,
                Message=message,
                MessageAttributes={
                    'AWS.SNS.SMS.SMSType': {
                        'DataType': 'String',
                        'StringValue': 'Transactional'
                    }
                }
            )
            
            return {
                'success': True,
                'message_id': response.get('MessageId'),
                'provider': 'aws',
                'cost': 0.0,
                'status': 'sent'
            }
            
        except ImportError:
            return {'success': False, 'error': 'boto3 library not installed'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # =========================================================================
    # CUSTOM HTTP GATEWAY
    # =========================================================================

    def _send_custom(self, phone_number, message):
        """Send SMS using custom HTTP gateway."""
        gateway_url = self.env['ir.config_parameter'].sudo().get_param('messob_fms.sms_gateway_url')
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.sms_gateway_api_key')
        
        if not gateway_url:
            raise UserError(_("Custom SMS gateway not configured"))
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}' if api_key else ''
        }
        
        payload = {
            'to': phone_number,
            'message': message,
            'from': 'MESSOB'
        }
        
        response = requests.post(gateway_url, headers=headers, json=payload, timeout=30)
        
        if response.status_code in [200, 201]:
            result = response.json()
            return {
                'success': True,
                'message_id': result.get('id', 'custom'),
                'provider': 'custom',
                'cost': 0.0,
                'status': 'sent'
            }
        else:
            return {
                'success': False,
                'error': f'HTTP {response.status_code}: {response.text}'
            }

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _send_fallback(self, phone_number, message):
        """Fallback when all providers fail - log only."""
        _logger.warning(f"SMS not sent (all providers failed): {phone_number} - {message}")
        
        # Log to database
        self._log_sms(phone_number, message, {
            'success': False,
            'message_id': 'fallback',
            'provider': 'fallback',
            'cost': 0.0,
            'status': 'failed'
        }, 'normal')
        
        return {
            'success': False,
            'error': 'All SMS providers failed',
            'provider': 'fallback',
            'logged': True
        }

    def _normalize_phone_number(self, phone_number):
        """Normalize phone number to E.164 format."""
        # Remove spaces, dashes, parentheses
        phone = phone_number.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Add + if missing
        if not phone.startswith('+'):
            # Assume Ethiopian number if no country code
            if phone.startswith('0'):
                phone = '+251' + phone[1:]
            elif phone.startswith('251'):
                phone = '+' + phone
            else:
                phone = '+251' + phone
        
        return phone

    def _log_sms(self, phone_number, message, result, priority):
        """Log SMS to database."""
        try:
            SmsLog = self.env['messob.fms.sms.log']
            
            SmsLog.create({
                'phone_number': phone_number,
                'message': message,
                'provider': result.get('provider'),
                'message_id': result.get('message_id'),
                'status': result.get('status', 'failed'),
                'cost': result.get('cost', 0.0),
                'priority': priority,
                'sent_date': datetime.now(),
                'success': result.get('success', False)
            })
            
        except Exception as e:
            _logger.warning(f"Failed to log SMS: {e}")

    def _get_provider_priority(self):
        """Get provider priority order."""
        ICP = self.env['ir.config_parameter'].sudo()
        
        providers = []
        
        # Africa's Talking first for Ethiopian market
        if ICP.get_param('messob_fms.africastalking_api_key'):
            providers.append('africastalking')
        
        if ICP.get_param('messob_fms.twilio_account_sid'):
            providers.append('twilio')
        
        if ICP.get_param('messob_fms.nexmo_api_key'):
            providers.append('nexmo')
        
        if ICP.get_param('messob_fms.aws_access_key'):
            providers.append('aws')
        
        if ICP.get_param('messob_fms.sms_gateway_url'):
            providers.append('custom')
        
        return providers

    # =========================================================================
    # BATCH SMS SENDING
    # =========================================================================

    @api.model
    def send_bulk_sms(self, recipients, message, provider='auto'):
        """
        Send SMS to multiple recipients.
        
        Args:
            recipients (list): List of phone numbers
            message (str): SMS message
            provider (str): Provider to use
            
        Returns:
            dict: {
                'success': bool,
                'sent': int,
                'failed': int,
                'results': list
            }
        """
        results = []
        sent = 0
        failed = 0
        
        for phone in recipients:
            result = self.send_sms(phone, message, provider)
            results.append({
                'phone': phone,
                'success': result.get('success'),
                'message_id': result.get('message_id')
            })
            
            if result.get('success'):
                sent += 1
            else:
                failed += 1
        
        return {
            'success': True,
            'sent': sent,
            'failed': failed,
            'total': len(recipients),
            'results': results
        }
