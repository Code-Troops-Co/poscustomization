/** @odoo-module **/

import { ProductConfiguratorPopup, BaseProductAttribute } from "@point_of_sale/app/components/popups/product_configurator_popup/product_configurator_popup";
import { patch } from "@web/core/utils/patch";

/**
 * Helper: format an amount as LBP with thousands separator.
 */
function _toLbp(amount, rate) {
    return Math.round((amount || 0) * rate).toLocaleString("en-US");
}

/**
 * Patch BaseProductAttribute to show LBP equivalent of price extras.
 * Example: shows "+ $50.00 (4,475,000 LBP)" on each attribute option.
 */
patch(BaseProductAttribute.prototype, {
    getFormatPriceExtra(val) {
        const sign = val < 0 ? "- " : "+ ";
        const usdStr = this.env.utils.formatCurrency(Math.abs(val));

        // Try to get LBP rate from pos config
        try {
            const rate = this.pos?.config?.lbp_usd_rate || 89500;
            const showLbp = !!this.pos?.config?.display_lbp_total;
            if (showLbp && rate) {
                const lbpStr = _toLbp(Math.abs(val), rate);
                return `${sign}${usdStr} (${lbpStr} LBP)`;
            }
        } catch {
            // fall through to default
        }
        return sign + usdStr;
    },
});

/**
 * Patch ProductConfiguratorPopup to show LBP in the dialog title.
 * Title becomes: "Product Name | $50.00 | 4,475,000 LBP"
 */
patch(ProductConfiguratorPopup.prototype, {
    get title() {
        // Call the original title getter
        const originalTitle = super.title;

        try {
            const rate = this.pos?.config?.lbp_usd_rate || 89500;
            const showLbp = !!this.pos?.config?.display_lbp_total;
            if (!showLbp) return originalTitle;

            const order = this.pos.getOrder();
            const overridedValues = {};
            if (order) {
                if (order.pricelist_id) {
                    overridedValues.pricelist = order.pricelist_id;
                }
                if (order.fiscal_position_id) {
                    overridedValues.fiscalPosition = order.fiscal_position_id;
                }
            }
            overridedValues.priceExtra = this.priceExtra;

            const product = this.product || this.props.productTemplate;
            const info = product.getTaxDetails({ overridedValues });
            const rawTotal = info?.raw_total_included_currency || 0;
            const lbpStr = _toLbp(rawTotal, rate);
            return `${originalTitle} | ${lbpStr} LBP`;
        } catch {
            return originalTitle;
        }
    },
});
