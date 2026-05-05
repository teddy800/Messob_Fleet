# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.audit.log
# Description: Automatic audit trail for critical system actions (FR-5.3).
#
# Logs: user logins, request approvals/rejections, vehicle changes,
#       user role assignments. Each entry has timestamp, user, action,
#       resource type, and details.
# ---------------------------------------------------------------------------

from odoo import models, fields


class MessobFmsAuditLog(models.Model):
    """Read-only audit trail. Records are created by system actions only."""

    _name = 'messob.fms.audit.log'
    _description = 'MESSOB FMS - Audit Log'
    _order = 'timestamp desc'
    _rec_name = 'action'

    timestamp = fields.Datetime(
        string='Timestamp',
        default=fields.Datetime.now,
        readonly=True,
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='User',
        readonly=True,
        default=lambda self: self.env.user,
    )

    action = fields.Selection(
        selection=[
            ('CREATE',   'CREATE'),
            ('UPDATE',   'UPDATE'),
            ('DELETE',   'DELETE'),
            ('APPROVE',  'APPROVE'),
            ('REJECT',   'REJECT'),
            ('LOGIN',    'LOGIN'),
            ('ASSIGN',   'ASSIGN'),
        ],
        string='Action',
        required=True,
        readonly=True,
    )

    resource = fields.Char(
        string='Resource',
        readonly=True,
        help='Type of record affected e.g. User, Trip Request, Vehicle.',
    )

    details = fields.Char(
        string='Details',
        readonly=True,
        help='Human-readable description of what changed.',
    )
