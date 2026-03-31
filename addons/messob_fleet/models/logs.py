from odoo import models, fields, api # type: ignore

class TripLog(models.Model):
    _name = 'messob.trip.log'
    _description = 'Trip Progress Log'
    _order = 'timestamp desc'

    request_id = fields.Many2one('messob.trip.request', string="Trip Request", required=True, ondelete='cascade')
    timestamp = fields.Datetime(string="Timestamp", default=fields.Datetime.now, required=True)
    status = fields.Selection([
        ('depart', 'Depart'),
        ('arrive', 'Arrive'),
        ('delay', 'Delayed')
    ], string="Status Update", required=True)
    odometer = fields.Float(string="Odometer Reading")
    notes = fields.Text(string="Notes")

class FuelLog(models.Model):
    _name = 'messob.fuel.log'
    _description = 'Fuel Consumption Log'
    _order = 'date desc'

    vehicle_id = fields.Many2one('fleet.vehicle', string="Vehicle", required=True, ondelete='cascade')
    driver_id = fields.Many2one('messob.driver', string="Driver")
    date = fields.Date(string="Date", default=fields.Date.today, required=True)
    volume = fields.Float(string="Volume (Liters)", required=True)
    cost = fields.Float(string="Cost")
    odometer = fields.Float(string="Odometer Reading")
    station = fields.Char(string="Fuel Station")

class MaintenanceLog(models.Model):
    _name = 'messob.maintenance.log'
    _description = 'Vehicle Maintenance Log'
    _order = 'date desc'

    vehicle_id = fields.Many2one('fleet.vehicle', string="Vehicle", required=True, ondelete='cascade')
    date = fields.Date(string="Date", default=fields.Date.today, required=True)
    type = fields.Char(string="Type of Service", required=True)
    description = fields.Text(string="Description Notes")
    cost = fields.Float(string="Cost")
    service_provider = fields.Char(string="Service Provider")
    next_due_odometer = fields.Float(string="Next Due Odometer")
    next_due_date = fields.Date(string="Next Due Date")
