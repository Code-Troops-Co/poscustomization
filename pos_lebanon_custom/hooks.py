"""
Post-install hook: link the Cash (LBP) payment method to all existing POS configs.
Also called on module upgrade so new configs are covered too.
"""


def post_init_hook(env):
    """Link Cash (LBP) payment method to every POS config automatically."""
    _link_lbp_payment_method(env)


def uninstall_hook(env):
    """Remove Cash (LBP) from POS configs on uninstall (optional clean-up)."""
    pass


def _link_lbp_payment_method(env):
    """Find (or create) the Cash (LBP) payment method and link to all POS configs."""
    PaymentMethod = env["pos.payment.method"]
    PosConfig = env["pos.config"]

    # Find existing Cash (LBP) method
    lbp_method = PaymentMethod.search(
        [("name", "ilike", "Cash (LBP)")], limit=1
    )

    if not lbp_method:
        # Create it if it doesn't exist yet
        lbp_method = PaymentMethod.create({
            "name": "Cash (LBP)",
            "is_cash_count": True,
        })

    # Link to every POS config that doesn't already have it
    all_configs = PosConfig.search([])
    for config in all_configs:
        existing_ids = config.payment_method_ids.ids
        if lbp_method.id not in existing_ids:
            config.write({
                "payment_method_ids": [(4, lbp_method.id)],
            })
