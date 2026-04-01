from odoo import models, fields  # type: ignore


class GpsTrack(models.Model):
    """Timestamped GPS location history for vehicles (FR-3.2)."""
    _name = 'messob.gps.track'
    _description = 'Vehicle GPS Track'
    _order = 'timestamp desc'

    vehicle_id = fields.Many2one('fleet.vehicle', string='Vehicle', required=True, ondelete='cascade', index=True)
    timestamp = fields.Datetime(string='Timestamp', default=fields.Datetime.now, required=True, index=True)
    lat = fields.Float(string='Latitude', digits=(10, 7), required=True)
    lng = fields.Float(string='Longitude', digits=(10, 7), required=True)
