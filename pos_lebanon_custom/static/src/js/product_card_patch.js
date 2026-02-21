/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { formatCurrency } from "@web/core/currency";

/**
 * Extend ProductCard to display dual pricing (USD + LBP).
 *
 * Root-cause fix: The previous code called product.getPrice(pricelist, 1, 0, false, product)
 * but `product` here is a product.template, while getPrice() expects a product.product
 * as the `variant` parameter. This caused `variant.product_tmpl_id` to be undefined → crash → $0.00.
 *
 * Fix: Use product.list_price for the raw USD price and config.pricelist_id for pricelist-aware pricing
 * by passing product.product_variant_ids[0] as the proper variant.
 */

import { ProductCard } from "@point_of_sale/app/components/product_card/product_card";

/**
 * Helper: format an amount as LBP with thousands separators.
 */
function _toLbp(amount, rate) {
    return Math.round((amount || 0) * rate).toLocaleString("en-US");
}

patch(ProductCard.prototype, {
    setup() {
        super.setup(...arguments);
    },

    /**
     * Get the USD price formatted with currency symbol.
     * Uses the product's first variant and the POS pricelist for accurate pricing.
     */
    get formattedUsdPrice() {
        const product = this.props.product;
        if (!product) {
            return "";
        }
        try {
            const pos = this.env.services.pos;
            const config = pos.config;

            // Get the correct pricelist from config
            const pricelist = config.pricelist_id;

            // Get the first product.product variant (getPrice expects a variant, not a template)
            const variant = product.product_variant_ids && product.product_variant_ids[0];

            let price;
            if (pricelist && variant) {
                // Full pricelist-aware price calculation
                price = product.getPrice(pricelist, 1, 0, false, variant);
            } else {
                // Fallback: use list_price directly
                price = product.list_price || 0;
            }

            // Format with Odoo's currency formatter
            const currencyId = config.currency_id?.id;
            if (currencyId) {
                return formatCurrency(price, currencyId);
            }
            return `$${price.toFixed(2)}`;
        } catch (e) {
            // Last resort fallback: raw list_price
            try {
                const price = this.props.product.list_price || 0;
                return `$${price.toFixed(2)}`;
            } catch {
                return "";
            }
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
            const config = pos.config;
            const pricelist = config.pricelist_id;
            const variant = product.product_variant_ids && product.product_variant_ids[0];

            let price;
            if (pricelist && variant) {
                price = product.getPrice(pricelist, 1, 0, false, variant);
            } else {
                price = product.list_price || 0;
            }

            const rate = config.lbp_usd_rate || 89500;
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
