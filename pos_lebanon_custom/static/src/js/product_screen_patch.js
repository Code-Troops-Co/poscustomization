/** @odoo-module **/

import { useState } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";

/**
 * Patch ProductScreen to:
 * 1. Show inventory categories in a right sidebar
 * 2. Filter products by selected internal category (product.category)
 * 3. Keep existing LBP footer logic
 */
patch(ProductScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.categoryState = useState({
            selectedInternalCategId: null,  // null = "All"
        });
    },

    /**
     * Get all distinct internal (inventory) categories from loaded products.
     * Returns [{id, name, complete_name}] sorted by name.
     */
    get internalCategories() {
        const seen = new Map();
        const products = this.pos.models["product.product"]?.getAll?.() ||
            this.pos.models["product.template"]?.getAll?.() || [];
        for (const p of products) {
            const cat = p.categ_id;
            if (cat && cat.id && !seen.has(cat.id)) {
                seen.set(cat.id, {
                    id: cat.id,
                    name: cat.name || cat.complete_name || "Unknown",
                });
            }
        }
        // Sort alphabetically
        return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Set / toggle the selected internal category. null = All.
     */
    selectInternalCategory(id) {
        if (this.categoryState.selectedInternalCategId === id) {
            // Click same → deselect (show all)
            this.categoryState.selectedInternalCategId = null;
        } else {
            this.categoryState.selectedInternalCategId = id;
        }
    },

    /**
     * Get products to display, filtered by internal category if one is selected.
     * Overrides native productToDisplayByCateg logic for the rightpane display.
     */
    get filteredProductGroups() {
        const selectedId = this.categoryState.selectedInternalCategId;

        // Use Odoo's native grouping (which respects POS category / search)
        const nativeGroups = this.pos.productToDisplayByCateg || [];

        if (!selectedId) {
            return nativeGroups;
        }

        // Filter: keep only products whose categ_id matches selected internal category
        const filtered = [];
        for (const [groupKey, products] of nativeGroups) {
            const matching = products.filter(
                (p) => p.categ_id && p.categ_id.id === selectedId
            );
            if (matching.length > 0) {
                filtered.push([groupKey, matching]);
            }
        }
        return filtered;
    },

    get showLbpFooter() {
        return !!this.pos.config.display_lbp_total && !this.ui.isSmall;
    },

    formattedLbpRate() {
        const rate = this.pos.config.lbp_usd_rate || 89500;
        return Math.round(rate).toLocaleString("en-US");
    },

    get lbpTotal() {
        if (!this.currentOrder) return "0";
        const rate = this.pos.config.lbp_usd_rate || 89500;
        const totalIncl = this.currentOrder.priceIncl || 0;
        return Math.round(totalIncl * rate).toLocaleString("en-US");
    },
});
