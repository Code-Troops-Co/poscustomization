/** @odoo-module **/

import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { patch } from "@web/core/utils/patch";

/**
 * Extend ProductScreen to support:
 * - LBP exchange rate footer bar
 */
patch(ProductScreen.prototype, {

    /**
     * Whether to show the LBP footer bar.
     */
    showLbpFooter() {
        return !!this.pos.config.display_lbp_total && !this.ui.isSmall;
    },

    /**
     * Format the exchange rate with thousands separators.
     */
    formattedLbpRate() {
        const rate = this.pos.config.lbp_usd_rate || 89500;
        return Math.round(rate).toLocaleString("en-US");
    },

    /**
     * Get the LBP equivalent of the current order total.
     */
    get lbpTotal() {
        if (!this.currentOrder) {
            return "0";
        }
        const rate = this.pos.config.lbp_usd_rate || 89500;
        const totalIncl = this.currentOrder.priceIncl || 0;
        return Math.round(totalIncl * rate).toLocaleString("en-US");
    },
});
