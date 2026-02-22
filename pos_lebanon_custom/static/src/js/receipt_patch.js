/** @odoo-module **/

import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { patch } from "@web/core/utils/patch";
import { useState } from "@odoo/owl";

/**
 * Helper: format an amount as LBP with thousands separators.
 */
function _toLbp(amount, rate) {
    return Math.round((amount || 0) * rate).toLocaleString("en-US");
}

/**
 * Extend OrderReceipt to add LBP formatting for all receipt amounts.
 */
patch(OrderReceipt.prototype, {
    formatLbpAmount(usdAmount) {
        const rate = this.props.order?.config?.lbp_usd_rate ||
            this.props.order?.config_id?.lbp_usd_rate || 89500;
        return _toLbp(usdAmount, rate);
    },

    get showLbp() {
        try {
            return !!(this.props.order?.config?.display_lbp_total ||
                this.props.order?.config_id?.display_lbp_total);
        } catch {
            return false;
        }
    },
});

/**
 * Extend ReceiptScreen to add LBP amount display and WhatsApp sharing.
 */
patch(ReceiptScreen.prototype, {
    setup() {
        super.setup(...arguments);
        const partner = this.currentOrder?.getPartner?.();
        this.lbpState = useState({
            whatsappPhone: partner?.phone || partner?.mobile || "",
        });
    },

    get lbpOrderAmount() {
        try {
            const order = this.currentOrder;
            const rate = order?.config_id?.lbp_usd_rate || this.pos.config.lbp_usd_rate || 89500;
            const total = order?.priceIncl || 0;
            return _toLbp(total, rate);
        } catch {
            return "0";
        }
    },

    get showLbp() {
        try {
            return !!(this.currentOrder?.config_id?.display_lbp_total ||
                this.pos.config.display_lbp_total);
        } catch {
            return false;
        }
    },

    get isValidWhatsApp() {
        const phone = this.lbpState.whatsappPhone;
        return phone && /^\+?[() \d\s\-.]{8,18}$/.test(phone);
    },

    async sendViaWhatsApp() {
        if (!this.isValidWhatsApp) {
            return;
        }
        try {
            // Normalize phone number
            let phone = this.lbpState.whatsappPhone.replace(/[^\d+]/g, "");
            if (!phone.startsWith("+")) {
                phone = "+961" + phone;
            }
            const cleanPhone = phone.replace("+", "");

            const order = this.currentOrder;
            const rate = order?.config_id?.lbp_usd_rate || this.pos.config.lbp_usd_rate || 89500;
            const totalUsd = (order.priceIncl || 0).toFixed(2);
            const totalLbp = _toLbp(order.priceIncl, rate);
            const subtotalUsd = (order.priceExcl || 0).toFixed(2);
            const taxUsd = ((order.priceIncl || 0) - (order.priceExcl || 0)).toFixed(2);
            const shopName = this.pos.config.name || "Our Store";
            const orderName = order.name || order.tracking_number || "";

            const now = new Date();
            const dateStr = now.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });

            const lines = [];

            // Header
            lines.push(`*${shopName} - Receipt*`);
            lines.push(`Order: ${orderName}`);
            lines.push(`Date: ${dateStr}`);
            lines.push(`---------------------------------`);

            // Order lines — left-aligned name, right-aligned price separated by dots
            const orderlines = order.getOrderlines ? order.getOrderlines() : (order.lines || []);
            for (const line of orderlines) {
                const name = line.product_id?.display_name || line.full_product_name || "Item";
                const qty = line.qty || 1;
                const lineTotal = line.prices?.total_included || line.displayPrice || 0;
                const priceStr = `$${lineTotal.toFixed(2)}`;
                // Format: "2x Product Name    $46.00"
                const label = `${qty}x ${name}`;
                lines.push(`${label}    ${priceStr}`);
            }

            lines.push(`---------------------------------`);

            // Totals
            lines.push(`Subtotal:    $${subtotalUsd}`);
            if (parseFloat(taxUsd) > 0) {
                lines.push(`Tax:         $${taxUsd}`);
            }
            lines.push(`*Total:      $${totalUsd}*`);
            lines.push(`*            ${totalLbp} LBP*`);
            lines.push(`Rate: 1 USD = ${Math.round(rate).toLocaleString("en-US")} LBP`);
            lines.push(``);
            lines.push(`Thank you for shopping with us!`);
            lines.push(`We hope to see you again soon.`);

            const message = encodeURIComponent(lines.join("\n"));
            const url = `https://wa.me/${cleanPhone}?text=${message}`;
            window.open(url, "_blank");
        } catch (e) {
            console.error("WhatsApp share error:", e);
            this.notification.add("Failed to open WhatsApp. Please try again.", { type: "danger" });
        }
    },
});
