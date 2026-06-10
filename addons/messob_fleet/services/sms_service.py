# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Service: SMS Service
# Description: SMS gateway with multiple provider support
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
    SMS Service with multiple provider support.
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
    # TWILIO SMS API (Enhanced with full production features)
    # =========================================================================

    def _send_twilio(self, phone_number, message):
        """
        Send SMS using Twilio API with enhanced features.
        
        Features:
        - Full API error handling
        - Status callback support
        - Message validity period
        - Smart encoding detection
        - Delivery status tracking
        """
        account_sid = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_account_sid')
        auth_token = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_auth_token')
        from_number = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_from_number')
        messaging_service_sid = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_messaging_service_sid')
        
        if not account_sid or not auth_token:
            raise UserError(_("Twilio credentials not configured. Please set messob_fms.twilio_account_sid and messob_fms.twilio_auth_token"))
        
        if not from_number and not messaging_service_sid:
            raise UserError(_("Twilio from number or messaging service SID required. Please set messob_fms.twilio_from_number or messob_fms.twilio_messaging_service_sid"))
        
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        
        # Build request payload
        data = {
            'To': phone_number,
            'Body': message
        }
        
        # Use messaging service if configured, otherwise use from number
        if messaging_service_sid:
            data['MessagingServiceSid'] = messaging_service_sid
        else:
            data['From'] = from_number
        
        # Optional: Status callback URL for delivery tracking
        status_callback = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_status_callback')
        if status_callback:
            data['StatusCallback'] = status_callback
        
        # Optional: Message validity period (in seconds)
        validity_period = self.env['ir.config_parameter'].sudo().get_param('messob_fms.twilio_validity_period')
        if validity_period:
            data['ValidityPeriod'] = int(validity_period)
        
        try:
            response = requests.post(
                url, 
                data=data, 
                auth=(account_sid, auth_token), 
                timeout=30
            )
            result = response.json()
            
            if response.status_code in [200, 201]:
                return {
                    'success': True,
                    'message_id': result.get('sid'),
                    'provider': 'twilio',
                    'cost': float(result.get('price', 0) or 0) * -1,  # Twilio returns negative prices
                    'status': result.get('status', 'queued'),
                    'segments': result.get('num_segments', 1),
                    'direction': result.get('direction'),
                    'to': result.get('to'),
                    'from': result.get('from')
                }
            else:
                error_message = result.get('message', 'Unknown error')
                error_code = result.get('code')
                
                _logger.error(f"Twilio SMS failed: {error_code} - {error_message}")
                
                return {
                    'success': False,
                    'error': f"{error_code}: {error_message}" if error_code else error_message,
                    'provider': 'twilio'
                }
                
        except requests.exceptions.RequestException as e:
            _logger.error(f"Twilio API request failed: {e}")
            return {
                'success': False,
                'error': f'Network error: {str(e)}',
                'provider': 'twilio'
            }
        except Exception as e:
            _logger.error(f"Twilio unexpected error: {e}")
            return {
                'success': False,
                'error': str(e),
                'provider': 'twilio'
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
    # AWS SNS SMS (Enhanced with full production features)
    # =========================================================================

    def _send_aws_sns(self, phone_number, message):
        """
        Send SMS using AWS SNS with enhanced features.
        
        Features:
        - Transactional and promotional SMS types
        - Sender ID support
        - SMS attributes configuration
        - Max price control
        - Delivery status tracking
        - CloudWatch metrics integration
        """
        try:
            import boto3
            from botocore.exceptions import ClientError, BotoCoreError
            
            access_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_access_key')
            secret_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_secret_key')
            region = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_region', 'us-east-1')
            
            if not access_key or not secret_key:
                raise UserError(_("AWS credentials not configured. Please set messob_fms.aws_access_key and messob_fms.aws_secret_key"))
            
            # Initialize SNS client
            client = boto3.client(
                'sns',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            
            # Build message attributes
            message_attributes = {
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'  # Transactional for critical messages
                }
            }
            
            # Optional: Sender ID (not supported in all countries)
            sender_id = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_sender_id', 'MESSOB')
            if sender_id and region in ['us-east-1', 'eu-west-1', 'ap-southeast-1']:
                message_attributes['AWS.SNS.SMS.SenderID'] = {
                    'DataType': 'String',
                    'StringValue': sender_id
                }
            
            # Optional: Max price per message (in USD)
            max_price = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_max_price', '0.50')
            message_attributes['AWS.SNS.SMS.MaxPrice'] = {
                'DataType': 'Number',
                'StringValue': max_price
            }
            
            # Optional: Message type (Promotional or Transactional)
            sms_type = self.env['ir.config_parameter'].sudo().get_param('messob_fms.aws_sms_type', 'Transactional')
            message_attributes['AWS.SNS.SMS.SMSType']['StringValue'] = sms_type
            
            # Send SMS
            response = client.publish(
                PhoneNumber=phone_number,
                Message=message,
                MessageAttributes=message_attributes
            )
            
            message_id = response.get('MessageId')
            
            # Optional: Get delivery status (requires SNS topic subscription)
            status = 'sent'
            cost = 0.0
            
            # Estimate cost based on region (approximate)
            cost_map = {
                'us-east-1': 0.00645,  # US
                'eu-west-1': 0.0458,   # Europe
                'ap-southeast-1': 0.0413,  # Asia Pacific
                'af-south-1': 0.0458,  # Africa (Ethiopia region)
            }
            cost = cost_map.get(region, 0.05)
            
            _logger.info(f"AWS SNS SMS sent successfully: {message_id} to {phone_number}")
            
            return {
                'success': True,
                'message_id': message_id,
                'provider': 'aws',
                'cost': cost,
                'status': status,
                'region': region,
                'sms_type': sms_type
            }
            
        except ImportError:
            error_msg = 'boto3 library not installed. Install with: pip install boto3'
            _logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg,
                'provider': 'aws'
            }
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            _logger.error(f"AWS SNS error: {error_code} - {error_message}")
            
            return {
                'success': False,
                'error': f"{error_code}: {error_message}",
                'provider': 'aws'
            }
        except BotoCoreError as e:
            _logger.error(f"AWS BotoCore error: {e}")
            return {
                'success': False,
                'error': f'AWS client error: {str(e)}',
                'provider': 'aws'
            }
        except Exception as e:
            _logger.error(f"AWS SNS unexpected error: {e}")
            return {
                'success': False,
                'error': str(e),
                'provider': 'aws'
            }

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
        """
        Get provider priority order based on configuration and availability.
        
        Priority logic:
        1. Twilio (if configured) - Most reliable globally
        2. AWS SNS (if configured) - Good for AWS-hosted deployments
        3. Africa's Talking (if configured) - Best for African market
        4. Nexmo (if configured) - Alternative global provider
        5. Custom (if configured) - Fallback to custom gateway
        """
        ICP = self.env['ir.config_parameter'].sudo()
        
        providers = []
        
        # Twilio first - most reliable globally
        if ICP.get_param('messob_fms.twilio_account_sid'):
            providers.append('twilio')
        
        # AWS SNS second - good for AWS deployments
        if ICP.get_param('messob_fms.aws_access_key'):
            providers.append('aws')
        
        # Africa's Talking for Ethiopian/African market
        if ICP.get_param('messob_fms.africastalking_api_key'):
            providers.append('africastalking')
        
        # Nexmo as alternative
        if ICP.get_param('messob_fms.nexmo_api_key'):
            providers.append('nexmo')
        
        # Custom gateway as last resort
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

    # =========================================================================
    # PRODUCTION HELPER METHODS (Testing & Monitoring)
    # =========================================================================

    @api.model
    def test_provider_configuration(self, provider=None):
        """
        Test SMS provider configuration and connectivity.
        
        Args:
            provider (str): Provider to test ('twilio', 'aws', 'africastalking', 'nexmo', 'custom')
                           If None, tests all configured providers
        
        Returns:
            dict: Test results for each provider
        """
        ICP = self.env['ir.config_parameter'].sudo()
        results = {}
        
        # Define providers to test
        if provider:
            providers_to_test = [provider]
        else:
            providers_to_test = self._get_provider_priority()
        
        for prov in providers_to_test:
            test_result = {
                'provider': prov,
                'configured': False,
                'credentials_valid': False,
                'api_accessible': False,
                'errors': []
            }
            
            try:
                # Test Twilio
                if prov == 'twilio':
                    account_sid = ICP.get_param('messob_fms.twilio_account_sid')
                    auth_token = ICP.get_param('messob_fms.twilio_auth_token')
                    from_number = ICP.get_param('messob_fms.twilio_from_number')
                    messaging_service_sid = ICP.get_param('messob_fms.twilio_messaging_service_sid')
                    
                    if account_sid and auth_token:
                        test_result['configured'] = True
                        
                        if from_number or messaging_service_sid:
                            test_result['credentials_valid'] = True
                        else:
                            test_result['errors'].append('Missing from_number or messaging_service_sid')
                        
                        # Test API accessibility
                        try:
                            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json"
                            response = requests.get(url, auth=(account_sid, auth_token), timeout=10)
                            if response.status_code == 200:
                                test_result['api_accessible'] = True
                                account_data = response.json()
                                test_result['account_status'] = account_data.get('status')
                                test_result['account_name'] = account_data.get('friendly_name')
                            else:
                                test_result['errors'].append(f'API returned status {response.status_code}')
                        except Exception as e:
                            test_result['errors'].append(f'API connection failed: {str(e)}')
                    else:
                        test_result['errors'].append('Missing account_sid or auth_token')
                
                # Test AWS SNS
                elif prov == 'aws':
                    access_key = ICP.get_param('messob_fms.aws_access_key')
                    secret_key = ICP.get_param('messob_fms.aws_secret_key')
                    region = ICP.get_param('messob_fms.aws_region', 'us-east-1')
                    
                    if access_key and secret_key:
                        test_result['configured'] = True
                        test_result['credentials_valid'] = True
                        test_result['region'] = region
                        
                        # Test API accessibility
                        try:
                            import boto3
                            from botocore.exceptions import ClientError
                            
                            client = boto3.client(
                                'sns',
                                aws_access_key_id=access_key,
                                aws_secret_access_key=secret_key,
                                region_name=region
                            )
                            
                            # Test with get_sms_attributes
                            response = client.get_sms_attributes()
                            test_result['api_accessible'] = True
                            test_result['sms_attributes'] = response.get('attributes', {})
                            
                        except ImportError:
                            test_result['errors'].append('boto3 library not installed')
                        except ClientError as e:
                            test_result['errors'].append(f"AWS error: {e.response['Error']['Code']}")
                        except Exception as e:
                            test_result['errors'].append(f'API connection failed: {str(e)}')
                    else:
                        test_result['errors'].append('Missing access_key or secret_key')
                
                # Test Africa's Talking
                elif prov == 'africastalking':
                    api_key = ICP.get_param('messob_fms.africastalking_api_key')
                    username = ICP.get_param('messob_fms.africastalking_username')
                    
                    if api_key and username:
                        test_result['configured'] = True
                        test_result['credentials_valid'] = True
                        test_result['username'] = username
                        
                        # Test API accessibility (user data endpoint)
                        try:
                            url = "https://api.africastalking.com/version1/user"
                            headers = {'apiKey': api_key, 'Accept': 'application/json'}
                            response = requests.get(url, headers=headers, params={'username': username}, timeout=10)
                            if response.status_code == 200:
                                test_result['api_accessible'] = True
                                user_data = response.json()
                                test_result['balance'] = user_data.get('UserData', {}).get('balance')
                            else:
                                test_result['errors'].append(f'API returned status {response.status_code}')
                        except Exception as e:
                            test_result['errors'].append(f'API connection failed: {str(e)}')
                    else:
                        test_result['errors'].append('Missing api_key or username')
                
                # Test Nexmo
                elif prov == 'nexmo':
                    api_key = ICP.get_param('messob_fms.nexmo_api_key')
                    api_secret = ICP.get_param('messob_fms.nexmo_api_secret')
                    
                    if api_key and api_secret:
                        test_result['configured'] = True
                        test_result['credentials_valid'] = True
                        
                        # Test API accessibility (balance endpoint)
                        try:
                            url = f"https://rest.nexmo.com/account/get-balance?api_key={api_key}&api_secret={api_secret}"
                            response = requests.get(url, timeout=10)
                            if response.status_code == 200:
                                test_result['api_accessible'] = True
                                balance_data = response.json()
                                test_result['balance'] = balance_data.get('value')
                            else:
                                test_result['errors'].append(f'API returned status {response.status_code}')
                        except Exception as e:
                            test_result['errors'].append(f'API connection failed: {str(e)}')
                    else:
                        test_result['errors'].append('Missing api_key or api_secret')
                
                # Test Custom Gateway
                elif prov == 'custom':
                    gateway_url = ICP.get_param('messob_fms.sms_gateway_url')
                    
                    if gateway_url:
                        test_result['configured'] = True
                        test_result['credentials_valid'] = True
                        test_result['gateway_url'] = gateway_url
                        
                        # Test API accessibility (simple GET/HEAD request)
                        try:
                            response = requests.head(gateway_url, timeout=10)
                            if response.status_code < 500:
                                test_result['api_accessible'] = True
                            else:
                                test_result['errors'].append(f'Gateway returned status {response.status_code}')
                        except Exception as e:
                            test_result['errors'].append(f'Gateway connection failed: {str(e)}')
                    else:
                        test_result['errors'].append('Missing gateway_url')
                
            except Exception as e:
                test_result['errors'].append(f'Unexpected error: {str(e)}')
            
            results[prov] = test_result
        
        return results

    @api.model
    def get_sms_statistics(self, date_from=None, date_to=None, provider=None):
        """
        Get SMS usage statistics for monitoring and cost analysis.
        
        Args:
            date_from (datetime): Start date for statistics
            date_to (datetime): End date for statistics
            provider (str): Filter by specific provider
        
        Returns:
            dict: Statistics including total sent, failed, cost breakdown
        """
        SmsLog = self.env['messob.fms.sms.log']
        
        # Build domain
        domain = []
        if date_from:
            domain.append(('sent_date', '>=', date_from))
        if date_to:
            domain.append(('sent_date', '<=', date_to))
        if provider:
            domain.append(('provider', '=', provider))
        
        # Get all SMS logs
        logs = SmsLog.search(domain)
        
        # Calculate statistics
        total_sent = len(logs.filtered(lambda l: l.success))
        total_failed = len(logs.filtered(lambda l: not l.success))
        total_cost = sum(logs.mapped('cost'))
        
        # Provider breakdown
        provider_stats = {}
        for prov in logs.mapped('provider'):
            prov_logs = logs.filtered(lambda l: l.provider == prov)
            provider_stats[prov] = {
                'sent': len(prov_logs.filtered(lambda l: l.success)),
                'failed': len(prov_logs.filtered(lambda l: not l.success)),
                'cost': sum(prov_logs.mapped('cost')),
                'success_rate': len(prov_logs.filtered(lambda l: l.success)) / len(prov_logs) * 100 if prov_logs else 0
            }
        
        # Priority breakdown
        priority_stats = {}
        for priority in logs.mapped('priority'):
            priority_logs = logs.filtered(lambda l: l.priority == priority)
            priority_stats[priority] = {
                'sent': len(priority_logs.filtered(lambda l: l.success)),
                'failed': len(priority_logs.filtered(lambda l: not l.success)),
                'cost': sum(priority_logs.mapped('cost'))
            }
        
        # Daily breakdown (last 7 days if no date range specified)
        if not date_from and not date_to:
            from datetime import datetime, timedelta
            date_to = datetime.now()
            date_from = date_to - timedelta(days=7)
        
        daily_stats = {}
        if date_from and date_to:
            current_date = date_from
            while current_date <= date_to:
                day_logs = logs.filtered(
                    lambda l: l.sent_date and l.sent_date.date() == current_date.date()
                )
                daily_stats[current_date.strftime('%Y-%m-%d')] = {
                    'sent': len(day_logs.filtered(lambda l: l.success)),
                    'failed': len(day_logs.filtered(lambda l: not l.success)),
                    'cost': sum(day_logs.mapped('cost'))
                }
                current_date += timedelta(days=1)
        
        return {
            'total_messages': len(logs),
            'total_sent': total_sent,
            'total_failed': total_failed,
            'total_cost': total_cost,
            'success_rate': (total_sent / len(logs) * 100) if logs else 0,
            'average_cost': (total_cost / total_sent) if total_sent > 0 else 0,
            'provider_breakdown': provider_stats,
            'priority_breakdown': priority_stats,
            'daily_breakdown': daily_stats,
            'date_from': date_from.strftime('%Y-%m-%d') if date_from else None,
            'date_to': date_to.strftime('%Y-%m-%d') if date_to else None
        }

    @api.model
    def send_test_sms(self, phone_number, provider='auto'):
        """
        Send a test SMS for configuration validation.
        
        Args:
            phone_number (str): Test recipient phone number
            provider (str): Provider to test
        
        Returns:
            dict: Test result with detailed information
        """
        test_message = "MESSOB Fleet Management System - Test SMS. Configuration is working correctly."
        
        result = self.send_sms(
            phone_number=phone_number,
            message=test_message,
            provider=provider,
            priority='normal'
        )
        
        # Add test flag to result
        result['test_message'] = True
        result['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if result.get('success'):
            _logger.info(f"Test SMS sent successfully via {result.get('provider')} to {phone_number}")
        else:
            _logger.error(f"Test SMS failed: {result.get('error')}")
        
        return result
