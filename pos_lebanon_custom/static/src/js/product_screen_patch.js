/** @odoo-module **/

import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { patch } from "@web/core/utils/patch";

/**
 * Extend ProductScreen to support:
 * - Right sidebar category list
 * - LBP exchange rate footer bar
 */
patch(ProductScreen.prototype, {

    /**
     * Get root-level categories sorted by sequence for the right sidebar.
     * @returns {Array} Sorted array of category records.
     */
    getLbpCategories() {
        const allCategories = this.pos.models["pos.category"].getAll();
        const { limit_categories, iface_available_categ_ids } = this.pos.config;
        let categories = allCategories;
        if (limit_categories && iface_available_categ_ids.length > 0) {
            const allowedIds = new Set(iface_available_categ_ids.map((c) => c.id));
            categories = allCategories.filter((c) => allowedIds.has(c.id));
        }
        return categories
            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    },

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
