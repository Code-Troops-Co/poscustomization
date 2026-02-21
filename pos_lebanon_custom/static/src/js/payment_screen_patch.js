/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { PaymentScreenStatus } from "@point_of_sale/app/screens/payment_screen/payment_status/payment_status";
import { patch } from "@web/core/utils/patch";

/**
 * Helper: format an amount as LBP with thousands separators.
 */
function _toLbp(amount, rate) {
    return Math.round((amount || 0) * rate).toLocaleString("en-US");
}

/**
 * Extend PaymentScreen to show LBP equivalent of the total due
 * and provide Enter LBP amount functionality.
 */
patch(PaymentScreen.prototype, {
    get lbpTotalDue() {
        try {
            const rate = this.pos.config.lbp_usd_rate || 89500;
            const totalDue = this.currentOrder?.totalDue || 0;
            return _toLbp(totalDue, rate);
        } catch {
            return "0";
        }
    },

    get showLbp() {
        try {
            return !!this.pos.config.display_lbp_total;
        } catch {
            return false;
        }
    },

    get lbpRate() {
        const rate = this.pos.config.lbp_usd_rate || 89500;
        return Math.round(rate).toLocaleString("en-US");
    },

    /**
     * Get LBP equivalent of the total remaining due.
     */
    get lbpRemainingDue() {
        try {
            const rate = this.pos.config.lbp_usd_rate || 89500;
            const remaining = this.currentOrder?.getDue() || 0;
            return _toLbp(remaining, rate);
        } catch {
            return "0";
        }
    },

    /**
     * Format a USD amount as LBP string.
     */
    formatLbpAmount(usdAmount) {
        const rate = this.pos.config.lbp_usd_rate || 89500;
        return _toLbp(usdAmount, rate);
    },
});

/**
 * Extend PaymentScreenStatus to show LBP equivalent of remaining/change.
 */
patch(PaymentScreenStatus.prototype, {
    formatLbpAmount(usdAmount) {
        const rate = this.props.order?.config_id?.lbp_usd_rate || 89500;
        return _toLbp(usdAmount, rate);
    },

    get showLbp() {
        try {
            return !!this.props.order?.config_id?.display_lbp_total;
        } catch {
            return false;
        }
    },
});
