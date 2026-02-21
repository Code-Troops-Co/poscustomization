/** @odoo-module **/

import { PaymentScreenPaymentLines } from "@point_of_sale/app/screens/payment_screen/payment_lines/payment_lines";
import { patch } from "@web/core/utils/patch";

/**
 * Extend PaymentScreenPaymentLines to show LBP equivalent
 * next to each payment line amount.
 */
patch(PaymentScreenPaymentLines.prototype, {
    /**
     * Format a USD amount as LBP with thousands separators.
     * @param {number} usdAmount
     * @returns {string}
     */
    formatLbpAmount(usdAmount) {
        try {
            const rate = this.env.services.pos?.config?.lbp_usd_rate || 89500;
            return Math.round((usdAmount || 0) * rate).toLocaleString("en-US");
        } catch {
            return "0";
        }
    },

    /**
     * Whether to show LBP amounts.
     */
    get showLbp() {
        try {
            return !!this.env.services.pos?.config?.display_lbp_total;
        } catch {
            return false;
        }
    },
});
