from odoo import models, fields # type: ignore

class FleetVehicle(models.Model):
    _inherit = 'fleet.vehicle'

    # Add MESSOB specific fields to the standard Odoo vehicle
    messob_id = fields.Char(string="Property ID", help="Internal MESSOB Asset Number")
    vehicle_status = fields.Selection([
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('maintenance', 'Maintenance')
    ], default='available')
    current_lat = fields.Float(string="Current Latitude")
    current_lng = fields.Float(string="Current Longitude")