/** @odoo-module **/
// ---------------------------------------------------------------------------
// MESSOB Fleet Management System
// Component: Staff Dashboard
// Description: Landing page shown when staff opens MESSOB FMS.
//              Two buttons: New Request and My Previous Requests.
// ---------------------------------------------------------------------------

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component } from "@odoo/owl";

class StaffDashboard extends Component {
    static template = "messob_fleet.StaffDashboard";

    setup() {
        this.action = useService("action");
    }

    // Opens the 4-step new request wizard
    openNewRequest() {
        this.action.doAction("messob_fleet.action_new_trip_wizard");
    }

    // Opens the grouped list of all previous requests
    openMyRequests() {
        this.action.doAction("messob_fleet.action_my_trips_dashboard");
    }
}

registry.category("actions").add("messob_fleet.staff_dashboard", StaffDashboard);
