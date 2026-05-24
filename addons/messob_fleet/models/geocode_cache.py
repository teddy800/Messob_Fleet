# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.geocode.cache
# Description: Geocoding cache for performance optimization
# ---------------------------------------------------------------------------

from odoo import models, fields, api
from datetime import datetime, timedelta


class MessobFmsGeocodeCache(models.Model):
    """
    Geocoding Cache Model.
    Stores geocoding results to reduce API calls and improve performance.
    """

    _name = 'messob.fms.geocode.cache'
    _description = 'MESSOB FMS - Geocode Cache'
    _order = 'create_date desc'

    # =========================================================================
    # FIELDS
    # =========================================================================

    address = fields.Char(
        string='Address',
        index=True,
        help='Original address query (for forward geocoding)'
    )

    cache_key = fields.Char(
        string='Cache Key',
        index=True,
        help='Unique cache key (lat,lng for reverse geocoding)'
    )

    cache_type = fields.Selection([
        ('forward', 'Forward Geocoding'),
        ('reverse', 'Reverse Geocoding')
    ], string='Cache Type', required=True, index=True)

    latitude = fields.Float(
        string='Latitude',
        digits=(10, 7)
    )

    longitude = fields.Float(
        string='Longitude',
        digits=(10, 7)
    )

    formatted_address = fields.Char(
        string='Formatted Address'
    )

    city = fields.Char(
        string='City'
    )

    country = fields.Char(
        string='Country'
    )

    provider = fields.Char(
        string='Provider',
        help='Geocoding provider used (google, mapbox, osm, here, fallback)'
    )

    confidence = fields.Float(
        string='Confidence',
        help='Confidence score (0-1)'
    )

    expiry_date = fields.Datetime(
        string='Expiry Date',
        required=True,
        index=True,
        help='Cache entry expires after this date'
    )

    hit_count = fields.Integer(
        string='Hit Count',
        default=0,
        help='Number of times this cache entry was used'
    )

    # =========================================================================
    # METHODS
    # =========================================================================

    @api.model
    def cleanup_expired(self):
        """
        Cleanup expired cache entries.
        Called by scheduled action.
        """
        expired = self.search([
            ('expiry_date', '<', datetime.now())
        ])

        count = len(expired)
        expired.unlink()

        return {
            'success': True,
            'deleted': count
        }

    def increment_hit_count(self):
        """Increment cache hit counter."""
        self.ensure_one()
        self.hit_count += 1
