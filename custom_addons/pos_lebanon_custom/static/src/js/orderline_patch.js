/** @odoo-module **/

import { Orderline } from "@point_of_sale/app/components/orderline/orderline";
import { patch } from "@web/core/utils/patch";

/**
 * Extend Orderline to show LBP equivalent for each order line price.
 */
patch(Orderline.prototype, {
    /**
     * Get the LBP equivalent of this order line's display price.
     * @returns {string} Formatted LBP string.
     */
    getLineLbp() {
        const line = this.props.line;
        const rate = line.order_id?.config_id?.lbp_usd_rate || 89500;
        const price = line.displayPrice || 0;
        return Math.round(price * rate).toLocaleString("en-US");
    },
});
