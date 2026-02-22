/** @odoo-module **/

import { useState } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";

/**
 * Patch ProductScreen to:
 * 1. Show inventory categories in a right sidebar
 * 2. Filter products by selected internal category (product.category)
 * 3. Sticky totals bar (Subtotal / Tax / Total + LBP) above the numpad
 */
patch(ProductScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.categoryState = useState({
            selectedInternalCategId: null,  // null = "All"
        });
    },

    // ── Internal category sidebar ──────────────────────────────────

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
        return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    selectInternalCategory(id) {
        if (this.categoryState.selectedInternalCategId === id) {
            this.categoryState.selectedInternalCategId = null;
        } else {
            this.categoryState.selectedInternalCategId = id;
        }
    },

    get filteredProductGroups() {
        const selectedId = this.categoryState.selectedInternalCategId;
        const nativeGroups = this.pos.productToDisplayByCateg || [];
        if (!selectedId) return nativeGroups;
        const filtered = [];
        for (const [groupKey, products] of nativeGroups) {
            const matching = products.filter(
                (p) => p.categ_id && p.categ_id.id === selectedId
            );
            if (matching.length > 0) filtered.push([groupKey, matching]);
        }
        return filtered;
    },

    // ── LBP helpers ───────────────────────────────────────────────

    get _lbpRate() {
        return this.pos.config.lbp_usd_rate || 89500;
    },

    get showLbp() {
        return !!this.pos.config.display_lbp_total;
    },

    /** @deprecated use showLbp — kept for template backward-compat */
    get showLbpFooter() {
        return this.showLbp && !this.ui.isSmall;
    },

    formattedLbpRate() {
        return Math.round(this._lbpRate).toLocaleString("en-US");
    },

    _fmt(usd) {
        return Math.round((usd || 0) * this._lbpRate).toLocaleString("en-US");
    },

    // ── Sticky totals bar getters ─────────────────────────────────

    get stickySubtotalUsd() {
        if (!this.currentOrder) return "";
        return this.env.utils.formatCurrency(
            (this.currentOrder.priceIncl || 0) - (this.currentOrder.amountTaxes || 0)
        );
    },

    get stickyTaxUsd() {
        if (!this.currentOrder) return "";
        return this.env.utils.formatCurrency(this.currentOrder.amountTaxes || 0);
    },

    get stickyTotalUsd() {
        if (!this.currentOrder) return "";
        return this.env.utils.formatCurrency(this.currentOrder.priceIncl || 0);
    },

    get stickySubtotalLbp() {
        if (!this.currentOrder) return "0";
        return this._fmt(
            (this.currentOrder.priceIncl || 0) - (this.currentOrder.amountTaxes || 0)
        );
    },

    get stickyTaxLbp() {
        if (!this.currentOrder) return "0";
        return this._fmt(this.currentOrder.amountTaxes || 0);
    },

    get stickyTotalLbp() {
        if (!this.currentOrder) return "0";
        return this._fmt(this.currentOrder.priceIncl || 0);
    },

    get hasTax() {
        return (this.currentOrder?.amountTaxes || 0) > 0;
    },

    // ── Kept for backward compat ──────────────────────────────────
    get lbpTotal() {
        return this.stickyTotalLbp;
    },
});
