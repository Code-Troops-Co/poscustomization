/** @odoo-module **/

import { OrderDisplay } from "@point_of_sale/app/components/order_display/order_display";
import { patch } from "@web/core/utils/patch";

/**
 * Extend OrderDisplay to add LBP formatting for taxes and totals.
 */
patch(OrderDisplay.prototype, {
    /**
     * Convert a USD amount to LBP and format with thousands separators.
     * Used by the XML template for both tax and total LBP display.
     * @param {number} usdAmount - The amount in USD.
     * @returns {string} Formatted LBP string.
     */
    formatLbpAmount(usdAmount) {
        const rate = this.order.config_id?.lbp_usd_rate || 89500;
        const lbpAmount = Math.round((usdAmount || 0) * rate);
        return lbpAmount.toLocaleString("en-US");
    },
});
