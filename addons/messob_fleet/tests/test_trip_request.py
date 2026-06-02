# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Unit Tests: Trip Request Model
# Description: Comprehensive tests for FR-1.x requirements
# ---------------------------------------------------------------------------

from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError
from datetime import datetime, timedelta


class TestTripRequest(TransactionCase):
    """Test trip request functionality (FR-1.x)"""

    def setUp(self):
        super(TestTripRequest, self).setUp()
        
        # Create test user (staff)
        self.staff_user = self.env['res.users'].create({
            'name': 'Test Staff',
            'login': 'staff@test.com',
            'email': 'staff@test.com',
            'groups_id': [(6, 0, [self.env.ref('messob_fleet.group_fms_user').id])]
        })
        
        # Create test dispatcher
        self.dispatcher_user = self.env['res.users'].create({
            'name': 'Test Dispatcher',
            'login': 'dispatcher@test.com',
            'email': 'dispatcher@test.com',
            'groups_id': [(6, 0, [self.env.ref('messob_fleet.group_fms_dispatcher').id])]
        })
        
        # Create test vehicle
        self.vehicle = self.env['fleet.vehicle'].create({
            'model_id': self.env['fleet.vehicle.model'].create({
                'name': 'Test Model',
                'brand_id': self.env['fleet.vehicle.model.brand'].create({
                    'name': 'Test Brand'
                }).id
            }).id,
            'license_plate': 'TEST-123',
        })
        
        # Create test driver
        self.driver = self.env['res.partner'].create({
            'name': 'Test Driver',
            'phone': '+251911234567',
            'email': 'driver@test.com'
        })

    def test_01_create_trip_request(self):
        """FR-1.1: Test trip request creation with 4-step wizard data"""
        trip = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Test trip for official business meeting',
            'vehicle_category': 'sedan',
            'start_dt': datetime.now() + timedelta(days=1),
            'end_dt': datetime.now() + timedelta(days=1, hours=3),
            'pickup': 'MESSOB HQ',
            'destination': 'Ministry of Transport',
        })
        
        self.assertEqual(trip.state, 'draft')
        self.assertEqual(trip.requester_id, self.staff_user.partner_id)
        self.assertTrue(trip.name.startswith('REQ/'))

    def test_02_purpose_validation(self):
        """FR-1.1: Test purpose minimum 10 characters validation"""
        with self.assertRaises(UserError):
            self.env['messob.fms.trip'].with_user(self.staff_user).create({
                'purpose': 'Short',  # Less than 10 characters
                'vehicle_category': 'sedan',
                'start_dt': datetime.now() + timedelta(days=1),
                'end_dt': datetime.now() + timedelta(days=1, hours=3),
                'pickup': 'MESSOB HQ',
                'destination': 'Test Destination',
            })

    def test_03_date_validation(self):
        """FR-1.1: Test end date cannot be before start date"""
        with self.assertRaises(UserError):
            self.env['messob.fms.trip'].with_user(self.staff_user).create({
                'purpose': 'Test trip for validation',
                'vehicle_category': 'sedan',
                'start_dt': datetime.now() + timedelta(days=2),
                'end_dt': datetime.now() + timedelta(days=1),  # Before start
                'pickup': 'MESSOB HQ',
                'destination': 'Test Destination',
            })

    def test_04_submit_request(self):
        """FR-1.3: Test submit action (draft → pending)"""
        trip = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Test trip for submission',
            'vehicle_category': 'suv',
            'start_dt': datetime.now() + timedelta(days=1),
            'end_dt': datetime.now() + timedelta(days=1, hours=4),
            'pickup': 'MESSOB HQ',
            'destination': 'Test Destination',
        })
        
        trip.action_submit()
        self.assertEqual(trip.state, 'pending')

    def test_05_cancel_pending_request(self):
        """FR-1.3: Test staff can cancel pending request"""
        trip = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Test trip for cancellation',
            'vehicle_category': 'bus',
            'start_dt': datetime.now() + timedelta(days=1),
            'end_dt': datetime.now() + timedelta(days=1, hours=2),
            'pickup': 'MESSOB HQ',
            'destination': 'Test Destination',
            'state': 'pending'
        })
        
        trip.action_cancel()
        self.assertEqual(trip.state, 'draft')

    def test_06_cannot_cancel_approved(self):
        """FR-1.3: Test cannot cancel approved request"""
        trip = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Test trip already approved',
            'vehicle_category': 'minibus',
            'start_dt': datetime.now() + timedelta(days=1),
            'end_dt': datetime.now() + timedelta(days=1, hours=3),
            'pickup': 'MESSOB HQ',
            'destination': 'Test Destination',
            'state': 'approved'
        })
        
        with self.assertRaises(UserError):
            trip.action_cancel()

    def test_07_approve_with_resources(self):
        """BR-1, FR-2.2: Test dispatcher can approve with vehicle and driver"""
        trip = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Test trip for approval',
            'vehicle_category': 'sedan',
            'start_dt': datetime.now() + timedelta(days=1),
            'end_dt': datetime.now() + timedelta(days=1, hours=3),
            'pickup': 'MESSOB HQ',
            'destination': 'Test Destination',
            'state': 'pending'
        })
        
        # Assign resources
        trip.with_user(self.dispatcher_user).write({
            'assigned_vehicle_id': self.vehicle.id,
            'assigned_driver_id': self.driver.id
        })
        
        # Approve
        trip.with_user(self.dispatcher_user).action_approve()
        self.assertEqual(trip.state, 'approved')

    def test_08_vehicle_double_booking_prevention(self):
        """BR-2: Test vehicle cannot be double-booked"""
        start = datetime.now() + timedelta(days=1)
        end = start + timedelta(hours=3)
        
        # Create first approved trip
        trip1 = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'First trip for conflict test',
            'vehicle_category': 'sedan',
            'start_dt': start,
            'end_dt': end,
            'pickup': 'Location A',
            'destination': 'Location B',
            'state': 'approved',
            'assigned_vehicle_id': self.vehicle.id,
            'assigned_driver_id': self.driver.id
        })
        
        # Try to create overlapping trip with same vehicle
        trip2 = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Second trip causing conflict',
            'vehicle_category': 'sedan',
            'start_dt': start + timedelta(hours=1),  # Overlaps
            'end_dt': end + timedelta(hours=1),
            'pickup': 'Location C',
            'destination': 'Location D',
            'state': 'pending',
            'assigned_vehicle_id': self.vehicle.id,
            'assigned_driver_id': self.env['res.partner'].create({
                'name': 'Another Driver'
            }).id
        })
        
        # Should raise error when trying to approve
        with self.assertRaises(UserError):
            trip2.with_user(self.dispatcher_user).action_approve()

    def test_09_audit_logging(self):
        """FR-5.3: Test audit logging on trip creation"""
        trip = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Test trip for audit logging',
            'vehicle_category': 'pickup',
            'start_dt': datetime.now() + timedelta(days=1),
            'end_dt': datetime.now() + timedelta(days=1, hours=2),
            'pickup': 'MESSOB HQ',
            'destination': 'Test Destination',
        })
        
        # Check audit log was created
        audit_logs = self.env['messob.fms.audit.log'].search([
            ('resource_model', '=', 'messob.fms.trip'),
            ('resource_id', '=', trip.id),
            ('action', '=', 'CREATE')
        ])
        
        self.assertTrue(len(audit_logs) > 0)

    def test_10_collaborative_users(self):
        """FR-3.3: Test get collaborative users on same vehicle"""
        start = datetime.now() + timedelta(days=1)
        end = start + timedelta(hours=4)
        
        # Create main trip
        trip1 = self.env['messob.fms.trip'].with_user(self.staff_user).create({
            'purpose': 'Main trip for collaboration',
            'vehicle_category': 'bus',
            'start_dt': start,
            'end_dt': end,
            'pickup': 'MESSOB HQ',
            'destination': 'Conference Center',
            'state': 'approved',
            'assigned_vehicle_id': self.vehicle.id,
            'assigned_driver_id': self.driver.id
        })
        
        # Create second user
        staff2 = self.env['res.users'].create({
            'name': 'Staff Member 2',
            'login': 'staff2@test.com',
            'groups_id': [(6, 0, [self.env.ref('messob_fleet.group_fms_user').id])]
        })
        
        # Create collaborative trip (same vehicle, overlapping time)
        trip2 = self.env['messob.fms.trip'].with_user(staff2).create({
            'purpose': 'Collaborative trip',
            'vehicle_category': 'bus',
            'start_dt': start + timedelta(minutes=30),
            'end_dt': end,
            'pickup': 'Branch Office',
            'destination': 'Conference Center',
            'state': 'approved',
            'assigned_vehicle_id': self.vehicle.id,
            'assigned_driver_id': self.driver.id
        })
        
        # Get collaborative users
        result = trip1.get_collaborative_users()
        
        self.assertTrue(result['success'])
        self.assertEqual(len(result['service_users']), 1)
        self.assertEqual(result['service_users'][0]['trip_id'], trip2.id)
