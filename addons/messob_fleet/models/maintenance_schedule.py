from odoo import models, fields, api  # type: ignore


class MaintenanceSchedule(models.Model):
    """Preventive maintenance schedule definitions per vehicle (FR-4.3)."""
    _name = 'messob.maintenance.schedule'
    _description = 'Preventive Maintenance Schedule'
    _order = 'next_due_date asc'

    vehicle_id = fields.Many2one('fleet.vehicle', string='Vehicle', required=True, ondelete='cascade', index=True)
    name = fields.Char(string='Service Name', required=True)
    interval_km = fields.Float(string='Interval (KM)', help='Trigger alert when odometer exceeds last service + this value')
    interval_days = fields.Integer(string='Interval (Days)', help='Trigger alert after this many days since last service')
    last_service_date = fields.Date(string='Last Service Date')
    last_service_odometer = fields.Float(string='Last Service Odometer')
    next_due_date = fields.Date(string='Next Due Date', compute='_compute_next_due', store=True)
    next_due_odometer = fields.Float(string='Next Due Odometer', compute='_compute_next_due', store=True)
    is_overdue = fields.Boolean(string='Overdue', compute='_compute_overdue', store=True)
    notes = fields.Text(string='Notes')

    @api.depends('last_service_date', 'interval_days', 'last_service_odometer', 'interval_km')
    def _compute_next_due(self):
        import datetime
        for rec in self:
            if rec.last_service_date and rec.interval_days:
                rec.next_due_date = rec.last_service_date + datetime.timedelta(days=rec.interval_days)
            else:
                rec.next_due_date = False
            rec.next_due_odometer = (rec.last_service_odometer or 0) + (rec.interval_km or 0)

    @api.depends('next_due_date', 'next_due_odometer', 'vehicle_id.odometer')
    def _compute_overdue(self):
        today = fields.Date.today()
        for rec in self:
            date_overdue = rec.next_due_date and rec.next_due_date < today
            odometer_overdue = rec.next_due_odometer and rec.vehicle_id.odometer and \
                rec.vehicle_id.odometer >= rec.next_due_odometer
            rec.is_overdue = bool(date_overdue or odometer_overdue)
