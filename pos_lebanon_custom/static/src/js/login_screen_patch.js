/** @odoo-module **/

import { LoginScreen } from "@point_of_sale/app/screens/login_screen/login_screen";
import { patch } from "@web/core/utils/patch";
import { useState } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

/**
 * Extend LoginScreen to use username + password text inputs instead of
 * the default "Open Register" button.
 */
patch(LoginScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.loginState = useState({
            username: "",
            password: "",
            isLoading: false,
        });
    },

    /**
     * Override openRegister to authenticate via username/password.
     */
    async openRegister() {
        const { username, password } = this.loginState;

        if (!username || !password) {
            this.notification.add(_t("Please enter both username and password."), { type: "warning" });
            return;
        }

        this.loginState.isLoading = true;
        try {
            // Authenticate credentials via server-side RPC
            const result = await this.orm.call(
                "pos.config",
                "authenticate_pos_user",
                [[this.pos.config.id], username, password]
            );

            if (result && result.success) {
                // Find the matching cashier in loaded employees/users
                let cashier = null;
                const employees = this.pos.models["hr.employee"]?.getAll?.() || [];
                if (result.employee_id) {
                    cashier = employees.find(e => e.id === result.employee_id);
                }
                if (!cashier && result.user_id) {
                    cashier = employees.find(e => e.user_id?.id === result.user_id);
                }
                // Fallback to current user
                if (!cashier) {
                    cashier = this.pos.user;
                }

                this.selectOneCashier(cashier);
            } else {
                this.notification.add(
                    result?.message || _t("Invalid username or password."),
                    { type: "danger" }
                );
            }
        } catch (e) {
            console.error("POS Login error:", e);
            this.notification.add(
                _t("Authentication service error. Please try again."),
                { type: "danger" }
            );
        } finally {
            this.loginState.isLoading = false;
        }
    },

    onUsernameKeydown(ev) {
        if (ev.key === "Enter") {
            const passInput = ev.target?.closest?.(".login-form")?.querySelector?.('input[type="password"]');
            if (passInput) passInput.focus();
        }
    },

    onPasswordKeydown(ev) {
        if (ev.key === "Enter") {
            this.openRegister();
        }
    },
});
