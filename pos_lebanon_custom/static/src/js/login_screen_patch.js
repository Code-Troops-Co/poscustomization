/** @odoo-module **/

import { LoginScreen } from "@point_of_sale/app/screens/login_screen/login_screen";
import { patch } from "@web/core/utils/patch";
import { useState } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { rpc } from "@web/core/network/rpc";

/**
 * Extend LoginScreen to use username + password text inputs instead of
 * the default employee-icon "Open Register" button.
 */
patch(LoginScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.notification = useService("notification");
        this.loginState = useState({
            username: "",
            password: "",
            isLoading: false,
        });
    },

    /**
     * Override openRegister to authenticate via username/password
     * using a custom HTTP controller endpoint.
     */
    async openRegister() {
        const { username, password } = this.loginState;

        if (!username || !password) {
            this.notification.add(_t("Please enter both username and password."), { type: "warning" });
            return;
        }

        this.loginState.isLoading = true;
        try {
            console.log("POS Login: calling /pos/authenticate_user for user:", username);

            // Call custom HTTP controller endpoint
            const result = await rpc("/pos/authenticate_user", {
                config_id: this.pos.config.id,
                username: username,
                password: password,
            });

            console.log("POS Login: server response:", JSON.stringify(result));

            if (result && result.success) {
                // setCashier expects a res.users record from POS models.
                // Look up the authenticated user in the loaded POS data.
                let cashier = null;

                if (result.user_id) {
                    // Try to find the user in loaded res.users records
                    cashier = this.pos.models["res.users"]?.get?.(result.user_id);
                    console.log("POS Login: found res.users record:", !!cashier);
                }

                // Fallback: use the currently logged-in POS user
                if (!cashier) {
                    console.log("POS Login: using fallback this.pos.user");
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
            console.error("POS Login error details:", e.message, e.data);
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
