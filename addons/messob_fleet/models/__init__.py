# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System - Models Package
# ---------------------------------------------------------------------------
# Import base_model_audit_mixin FIRST because other models inherit from it
from . import base_model_audit_mixin

# Import audit_log SECOND because it uses the mixin
from . import audit_log

# Now import models that use the audit mixin
from . import trip_request
from . import trip_request_dispatch
from . import trip_priority_scoring
from . import trip_driver
from . import fuel_log
from . import maintenance_log
from . import maintenance_alert
from . import fms_driver
from . import location
from . import gps_device
from . import gps_position
from . import gps_gateway
from . import geofence
from . import geocode_cache
from . import sms_log
from . import api_performance

# Import services
from ..services import geocoding_service
from ..services import routing_service
from ..services import sms_service
