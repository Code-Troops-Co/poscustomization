/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { PaymentScreenStatus } from "@point_of_sale/app/screens/payment_screen/payment_status/payment_status";
import { patch } from "@web/core/utils/patch";

function _toLbp(amount, rate) {
    return Math.round((amount || 0) * rate).toLocaleString("en-US");
}

/**
 * PaymentScreen patch — LBP info display only.
 * NO conversion in updateSelectedPaymentline (that caused the 3M$ bug).
 * Cash LBP stores USD amount; we show LBP equivalent as a label.
 */
patch(PaymentScreen.prototype, {

    get lbpRate() {
        return this.pos.config.lbp_usd_rate || 89500;
    },

    get lbpTotalDue() {
        try {
            return _toLbp(this.currentOrder?.totalDue || 0, this.lbpRate);
        } catch { return "0"; }
    },

    get showLbp() {
        try { return !!this.pos.config.display_lbp_total; }
        catch { return false; }
    },

    get formattedLbpRate() {
        return Math.round(this.lbpRate).toLocaleString("en-US");
    },

    /**
     * True when the selected payment line is an LBP-named method.
     * Used to show an info label — NO conversion performed.
     */
    get isLbpLineSelected() {
        try {
            const line = this.paymentLines?.find((l) => l.selected);
            if (!line) return false;
            return (line.payment_method_id?.name || "").toLowerCase().includes("lbp");
        } catch { return false; }
    },

    /**
     * LBP equivalent of the currently selected LBP payment line amount (info only).
     */
    get selectedLineLbpAmount() {
        try {
            const line = this.paymentLines?.find((l) => l.selected);
            if (!line) return "0";
            return _toLbp(line.getAmount?.() || 0, this.lbpRate);
        } catch { return "0"; }
    },

    formatLbpAmount(usdAmount) {
        return _toLbp(usdAmount, this.lbpRate);
    },
});

/**
 * PaymentScreenStatus — LBP remaining / change display.
 */
patch(PaymentScreenStatus.prototype, {
    formatLbpAmount(usdAmount) {
        const rate = this.props.order?.config_id?.lbp_usd_rate || 89500;
        return _toLbp(usdAmount, rate);
    },
    get showLbp() {
        try { return !!this.props.order?.config_id?.display_lbp_total; }
        catch { return false; }
    },
});
