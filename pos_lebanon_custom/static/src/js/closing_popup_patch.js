/** @odoo-module **/

import { ClosePosPopup } from "@point_of_sale/app/components/popups/closing_popup/closing_popup";
import { patch } from "@web/core/utils/patch";

/**
 * Extend ClosePosPopup with LBP formatting helpers.
 */
patch(ClosePosPopup.prototype, {
    formatLbpAmount(usdAmount) {
        const rate = this.pos.config.lbp_usd_rate || 89500;
        return Math.round((usdAmount || 0) * rate).toLocaleString("en-US");
    },

    get showLbp() {
        try {
            return !!this.pos.config.display_lbp_total;
        } catch {
            return false;
        }
    },
});
