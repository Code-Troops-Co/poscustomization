/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { formatCurrency } from "@web/core/currency";

/**
 * Extend the product.template model to expose formatted USD and LBP prices
 * for use in the ProductCard template.
 *
 * We patch the prototype of the product.template record class which is
 * dynamically created by the Odoo data model system. The patch is applied
 * once the model registry is populated by the POS loader.
 */

// We use a deferred patching strategy via the pos_hook import
import { reactive } from "@odoo/owl";

/**
 * Helper: format an amount as LBP with thousands separators.
 */
function _toLbp(amount, rate) {
    return Math.round((amount || 0) * rate).toLocaleString("en-US");
}

/**
 * Since product.template records are plain reactive objects (not class instances
 * with a patchable prototype), we extend the ProductCard component instead
 * to compute these values at render time.
 */
import { ProductCard } from "@point_of_sale/app/components/product_card/product_card";

patch(ProductCard.prototype, {
    setup() {
        super.setup(...arguments);
    },

    /**
     * Get the USD price formatted with currency symbol.
     */
    get formattedUsdPrice() {
        const product = this.props.product;
        if (!product) {
            return "";
        }
        try {
            const pos = this.env.services.pos;
            // FIX: Use the default_pricelist object, not the config ID
            const pricelist = pos.default_pricelist;
            const price = product.getPrice(pricelist, 1, 0, false, product);
            const currencyId = pos?.currency?.id || pos?.config?.currency_id?.id;
            if (currencyId) {
                return formatCurrency(price, currencyId);
            }
            return `$${price.toFixed(2)}`;
        } catch {
            return "";
        }
    },

    /**
     * Get the LBP equivalent price formatted string.
     */
    get formattedLbpPrice() {
        const product = this.props.product;
        if (!product) {
            return "";
        }
        try {
            const pos = this.env.services.pos;
            // FIX: Use the default_pricelist object, not the config ID
            const pricelist = pos.default_pricelist;
            const price = product.getPrice(pricelist, 1, 0, false, product);
            const rate = pos?.config?.lbp_usd_rate || 89500;
            return _toLbp(price, rate) + " LBP";
        } catch {
            return "";
        }
    },

    /**
     * Whether to show LBP price.
     */
    get showLbpPrice() {
        try {
            const pos = this.env.services.pos;
            return !!pos?.config?.display_lbp_total;
        } catch {
            return false;
        }
    },
});
