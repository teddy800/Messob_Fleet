from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import ValidationError # type: ignore

class TripRequest(models.Model):
    _name = 'messob.trip.request'
    _description = 'Vehicle Trip Request'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    # --- YOUR EXISTING FIELDS ---
    name = fields.Char(string="Request ID", readonly=True, default="New")
    requester_id = fields.Many2one('res.users', string="Staff Member", default=lambda self: self.env.user)
    purpose = fields.Text(string="Justification", required=True)
    vehicle_category_needed = fields.Selection([
          ('sedan', 'Sedan'),
          ('suv', 'SUV'), 
          ('pickup', 'Pickup'),
          ('bus', 'Bus'),
          ('minibus', 'Mini-Bus')
    ], string="Vehicle Category Required", required=True)
    
    start_datetime = fields.Datetime(string="Start Date/Time", required=True)
    end_datetime = fields.Datetime(string="End Date/Time", required=True)
    
    pickup_location = fields.Char(string="Pickup Location", required=True)
    dest_location = fields.Char(string="Destination Location", required=True)
    
    assigned_vehicle_id = fields.Many2one('fleet.vehicle', string="Assigned Vehicle", tracking=True)
    assigned_driver_id = fields.Many2one('messob.driver', string="Assigned Driver", tracking=True)
    
    priority = fields.Selection([
        ('0', 'Low'),
        ('1', 'Normal'),
        ('2', 'High'),
        ('3', 'Urgent')
    ], string='Priority', default='1', tracking=True)

    status = fields.Selection([
        ('draft', 'Draft'), ('pending', 'Pending'), ('approved', 'Approved'),
        ('rejected', 'Rejected'), ('canceled', 'Canceled'), ('in_progress', 'In-Progress'),
        ('completed', 'Completed'), ('closed', 'Closed')
    ], default='draft', tracking=True)

    # --- CONSTRAINTS ---
    
    @api.constrains('start_datetime', 'end_datetime')
    def _check_dates(self):
        for record in self:
            if record.start_datetime and record.end_datetime and record.end_datetime < record.start_datetime:
                raise ValidationError(_("The End Date/Time cannot be before the Start Date/Time."))

    @api.constrains('assigned_vehicle_id', 'start_datetime', 'end_datetime', 'status')
    def _check_vehicle_overlap(self):
        for record in self:
            if record.assigned_vehicle_id and record.status in ['approved', 'in_progress']:
                domain = [
                    ('id', '!=', record.id),
                    ('assigned_vehicle_id', '=', record.assigned_vehicle_id.id),
                    ('status', 'in', ['approved', 'in_progress']),
                    ('start_datetime', '<', record.end_datetime),
                    ('end_datetime', '>', record.start_datetime),
                ]
                if self.search_count(domain) > 0:
                    raise ValidationError(_("The selected vehicle is already assigned to another overlapping trip."))

    @api.constrains('assigned_driver_id', 'start_datetime', 'end_datetime', 'status')
    def _check_driver_overlap(self):
        for record in self:
            if record.assigned_driver_id and record.status in ['approved', 'in_progress']:
                domain = [
                    ('id', '!=', record.id),
                    ('assigned_driver_id', '=', record.assigned_driver_id.id),
                    ('status', 'in', ['approved', 'in_progress']),
                    ('start_datetime', '<', record.end_datetime),
                    ('end_datetime', '>', record.start_datetime),
                ]
                if self.search_count(domain) > 0:
                    raise ValidationError(_("The selected driver is already assigned to another overlapping trip."))

    # --- NEW LOGIC METHODS START HERE ---

    def action_submit(self):
        """Changes status from Draft to Pending (Manager Review)"""
        for record in self:
            if record.status == 'draft':
                record.status = 'pending'

    def action_approve(self):
        """Changes status to Approved"""
        for record in self:
            record.status = 'approved'
            
    def action_reject(self):
        """Changes status to Rejected"""
        for record in self:
            record.status = 'rejected'

    def action_cancel(self):
        """Changes status to Canceled"""
        for record in self:
            if record.status in ['draft', 'pending']:
                record.status = 'canceled'
            else:
                raise ValidationError(_("You can only cancel trips in Draft or Pending state."))

    def action_complete(self):
        """Changes status to Completed when trip is finished"""
        for record in self:
            record.status = 'completed'