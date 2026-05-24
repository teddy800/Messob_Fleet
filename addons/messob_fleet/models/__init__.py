# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System - Models Package
# ---------------------------------------------------------------------------
# Import audit_log FIRST because it contains the base.model.audit.mixin
# that other models inherit from
from . import audit_log

# Now import models that use the audit mixin
from . import trip_request
from . import trip_request_dispatch
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

# Import advanced services
from ..services import geocoding_service
from ..services import routing_service
from ..services import sms_service
