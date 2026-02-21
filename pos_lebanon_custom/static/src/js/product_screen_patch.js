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
     * Get all categories sorted by sequence for the right sidebar.
     * Returns all available POS categories with defensive null checks.
     * @returns {Array} Sorted array of category records.
     */
    getLbpCategories() {
        try {
            const categoryModel = this.pos.models["pos.category"];
            if (!categoryModel) {
                return [];
            }
            const allCategories = categoryModel.getAll();
            if (!allCategories || allCategories.length === 0) {
                return [];
            }

            const { limit_categories, iface_available_categ_ids } = this.pos.config;
            let categories = allCategories;

            // Filter by allowed categories if limit is set
            if (limit_categories && iface_available_categ_ids && iface_available_categ_ids.length > 0) {
                const allowedIds = new Set(
                    iface_available_categ_ids.map((c) => (typeof c === "object" ? c.id : c))
                );
                categories = allCategories.filter((c) => allowedIds.has(c.id));
            }

            return categories.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        } catch (e) {
            console.warn("getLbpCategories error:", e);
            return [];
        }
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
