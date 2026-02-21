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
 *
 * Handles both pos_hr (employee-based cashier) and non-pos_hr (user-based
 * cashier) configurations.
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
                if (this.pos.config.module_pos_hr) {
                    // ─── pos_hr is enabled: cashier must be an hr.employee ───
                    console.log("POS Login: pos_hr mode – looking up hr.employee for user_id:", result.user_id);

                    let employee = null;

                    if (result.employee_id) {
                        employee = this.pos.models["hr.employee"]?.get?.(result.employee_id);
                        console.log("POS Login: found employee by employee_id:", !!employee, result.employee_id);
                    }

                    // Fallback: search employees linked to this user
                    if (!employee && result.user_id) {
                        const allEmployees = this.pos.models["hr.employee"]?.getAll?.() || [];
                        employee = allEmployees.find(
                            (emp) => emp.user_id && emp.user_id.id === result.user_id
                        );
                        console.log("POS Login: found employee by user_id search:", !!employee);
                    }

                    if (!employee) {
                        console.warn("POS Login: no hr.employee found for user. Employee-based login required when pos_hr is enabled.");
                        this.notification.add(
                            _t("No employee record linked to this user. Please contact your administrator."),
                            { type: "danger" }
                        );
                        return;
                    }

                    // Set cashier as the hr.employee (what pos_hr expects)
                    this.pos.setCashier(employee);
                    this.pos.hasLoggedIn = true;

                    // Navigate to the default page (same logic as cashierLogIn / selectCashier mixin)
                    const selectedScreen = this.pos.defaultPage;
                    const props = {
                        ...selectedScreen.params,
                        orderUuid: this.pos.selectedOrderUuid,
                    };
                    if (selectedScreen.page === "FloorScreen") {
                        delete props.orderUuid;
                    }
                    this.pos.navigate(selectedScreen.page, props);

                    console.log("POS Login: success – navigated to", selectedScreen.page);

                } else {
                    // ─── No pos_hr: cashier is a res.users record ───
                    let cashier = null;

                    if (result.user_id) {
                        cashier = this.pos.models["res.users"]?.get?.(result.user_id);
                        console.log("POS Login: found res.users record:", !!cashier);
                    }

                    // Fallback: use the currently logged-in POS user
                    if (!cashier) {
                        console.log("POS Login: using fallback this.pos.user");
                        cashier = this.pos.user;
                    }

                    this.selectOneCashier(cashier);
                }
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
