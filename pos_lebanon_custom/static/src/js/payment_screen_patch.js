/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { PaymentScreenStatus } from "@point_of_sale/app/screens/payment_screen/payment_status/payment_status";
import { patch } from "@web/core/utils/patch";
import { useState } from "@odoo/owl";

// ─── Helpers ────────────────────────────────────────────────────────────────

function _toLbp(usdAmount, rate) {
    return Math.round((usdAmount || 0) * rate).toLocaleString("en-US");
}

function _isLbpMethod(paymentMethod) {
    return (paymentMethod?.name || "").toLowerCase().includes("lbp");
}

// ─── PaymentScreen patch ─────────────────────────────────────────────────────
/**
 * How Cash LBP works:
 *   1. User clicks "Cash LBP" → line is created with amount 0 (we clear it)
 *   2. User types LBP amount on numpad (e.g. 9,880,800)
 *   3. Each numpad press → updateSelectedPaymentline(rawLbpValue) is called
 *   4. We divide by the rate → store USD equivalent ($110.40)
 *   5. Change is calculated in USD by Odoo, shown as LBP equivalent by us
 *
 * Scenarios:
 *   • Client owes $110.40 — pays all LBP: types 9,880,800 → stored $110.40
 *   • Client pays $80 USD (Cash) + rest in LBP: adds Cash line $80,
 *     then adds Cash LBP, types 2,705,800 LBP → stored $30.24 → total ≈ $110.24
 *   • Client gives 10,000,000 LBP: stored $111.73 → change = $1.33 / 119,350 LBP
 */
patch(PaymentScreen.prototype, {

    setup() {
        super.setup(...arguments);
        // Track the raw LBP number the user is typing so we can display it
        this._lbpRawInput = useState({ value: 0 });
    },

    // ── LBP helpers ─────────────────────────────────────────────────────────

    get lbpRate() {
        return this.pos.config.lbp_usd_rate || 89500;
    },

    get showLbp() {
        try { return !!this.pos.config.display_lbp_total; }
        catch { return false; }
    },

    get formattedLbpRate() {
        return Math.round(this.lbpRate).toLocaleString("en-US");
    },

    formatLbpAmount(usdAmount) {
        return _toLbp(usdAmount, this.lbpRate);
    },

    // ── Is an LBP payment line currently selected? ───────────────────────────

    get isLbpLineSelected() {
        try {
            const line = this.paymentLines?.find((l) => l.selected);
            return _isLbpMethod(line?.payment_method_id);
        } catch { return false; }
    },

    // ── LBP total due (the big number above the lines) ───────────────────────

    get lbpTotalDue() {
        try { return _toLbp(this.currentOrder?.totalDue || 0, this.lbpRate); }
        catch { return "0"; }
    },

    // ── The raw LBP amount being typed right now ─────────────────────────────

    get currentLbpInputFormatted() {
        if (!this.isLbpLineSelected) return "";
        return Math.round(this._lbpRawInput.value || 0).toLocaleString("en-US");
    },

    // ── USD equivalent of the LBP being typed ───────────────────────────────

    get currentLbpInputUsd() {
        if (!this.isLbpLineSelected) return "";
        const usd = (this._lbpRawInput.value || 0) / this.lbpRate;
        return usd.toFixed(2);
    },

    // ── LBP equivalent of selected line's stored USD amount ─────────────────

    get selectedLineLbpAmount() {
        try {
            const line = this.paymentLines?.find((l) => l.selected);
            if (!line) return "0";
            return _toLbp(line.getAmount?.() || 0, this.lbpRate);
        } catch { return "0"; }
    },

    // ── LBP change / remaining ────────────────────────────────────────────────

    get lbpChange() {
        const change = this.currentOrder?.change || 0;
        return _toLbp(change, this.lbpRate);
    },

    get lbpRemaining() {
        const rem = this.currentOrder?.remainingDue || 0;
        return _toLbp(rem, this.lbpRate);
    },

    // ── Override: adding a new payment line ──────────────────────────────────

    addNewPaymentLine(paymentMethod) {
        const result = super.addNewPaymentLine(...arguments);
        if (_isLbpMethod(paymentMethod)) {
            // Clear the auto-filled USD amount so user types LBP from scratch
            const line = this.paymentLines?.find((l) => l.selected);
            if (line) {
                line.update({ amount: 0 });
                this._lbpRawInput.value = 0;
            }
        } else {
            this._lbpRawInput.value = 0;
        }
        return result;
    },

    // ── Override: numpad sends amount here on every keypress ─────────────────
    /**
     * When a Cash LBP line is selected, the user is typing LBP on the numpad.
     * We store the raw LBP for display, then convert to USD before saving.
     * For all other methods, pass through unchanged.
     */
    updateSelectedPaymentline(amount) {
        if (this.isLbpLineSelected) {
            this._lbpRawInput.value = amount;            // raw LBP typed
            const usdAmount = (amount || 0) / this.lbpRate;
            // Call super with the converted USD amount
            return super.updateSelectedPaymentline(usdAmount);
        }
        this._lbpRawInput.value = 0;
        return super.updateSelectedPaymentline(amount);
    },

    // ── When a different line is selected, reset the raw LBP tracker ─────────
    selectPaymentLine(line) {
        const result = super.selectPaymentLine(...arguments);
        if (_isLbpMethod(line?.payment_method_id)) {
            // Update LBP raw input to reflect this line's stored USD value
            this._lbpRawInput.value = Math.round((line.getAmount?.() || 0) * this.lbpRate);
        } else {
            this._lbpRawInput.value = 0;
        }
        return result;
    },
});

// ─── PaymentScreenStatus patch ───────────────────────────────────────────────
patch(PaymentScreenStatus.prototype, {
    formatLbpAmount(usdAmount) {
        const rate = this.props.order?.config_id?.lbp_usd_rate || 89500;
        return Math.round((usdAmount || 0) * rate).toLocaleString("en-US");
    },
    get showLbp() {
        try { return !!this.props.order?.config_id?.display_lbp_total; }
        catch { return false; }
    },
    get lbpRemainingOrChange() {
        const order = this.props.order;
        if (!order) return "0";
        const amount = order.remainingDue > 0 ? order.remainingDue : (order.change || 0);
        const rate = order.config_id?.lbp_usd_rate || 89500;
        return Math.round(amount * rate).toLocaleString("en-US");
    },
    get isChange() {
        return (this.props.order?.remainingDue || 0) <= 0;
    },
});
