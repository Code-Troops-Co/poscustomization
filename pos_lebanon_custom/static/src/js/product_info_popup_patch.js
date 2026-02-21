/** @odoo-module **/

import { ProductInfoPopup } from "@point_of_sale/app/components/popups/product_info_popup/product_info_popup";
import { patch } from "@web/core/utils/patch";

/**
 * Extend ProductInfoPopup to display LBP equivalents
 * for all price amounts shown in the popup.
 */
patch(ProductInfoPopup.prototype, {
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
