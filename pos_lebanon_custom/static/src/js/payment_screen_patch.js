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
 * Extend PaymentScreen to show LBP equivalents.
 * Auto-converts input when the selected payment line is a "LBP" method.
 */
patch(PaymentScreen.prototype, {

    get lbpRate() {
        return this.pos.config.lbp_usd_rate || 89500;
    },

    get lbpTotalDue() {
        try {
            const totalDue = this.currentOrder?.totalDue || 0;
            return _toLbp(totalDue, this.lbpRate);
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

    get formattedLbpRate() {
        return Math.round(this.lbpRate).toLocaleString("en-US");
    },

    /**
     * Returns true if the currently selected payment line
     * is a "Cash LBP" or any LBP-named payment method.
     */
    get isLbpLineSelected() {
        try {
            const selectedLine = this.paymentLines?.find((l) => l.selected);
            if (!selectedLine) return false;
            const name = selectedLine.payment_method_id?.name || "";
            return name.toLowerCase().includes("lbp");
        } catch {
            return false;
        }
    },

    /**
     * Format a USD amount as LBP string for display.
     */
    formatLbpAmount(usdAmount) {
        return _toLbp(usdAmount, this.lbpRate);
    },

    /**
     * Override updateSelectedPaymentline to auto-convert LBP→USD
     * when the selected payment line is an LBP method.
     * No toggle needed — detection is automatic.
     */
    updateSelectedPaymentline(amount = false) {
        if (this.isLbpLineSelected && amount && amount !== "") {
            const parsed = parseFloat(String(amount).replace(/,/g, ""));
            if (!isNaN(parsed) && parsed > 0) {
                // Convert LBP amount → USD, round to 2 decimals
                amount = Math.round((parsed / this.lbpRate) * 100) / 100;
            }
        }
        return super.updateSelectedPaymentline(amount);
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
