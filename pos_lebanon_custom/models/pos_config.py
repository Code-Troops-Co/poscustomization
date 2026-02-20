from odoo import api, models, fields


class PosConfig(models.Model):
    _inherit = 'pos.config'

    lbp_usd_rate = fields.Float(
        string='LBP/USD Exchange Rate',
        default=89500.0,
        digits=(16, 2),
        help='Current Lebanese Pound to US Dollar exchange rate. '
             'E.g. 89500 means 1 USD = 89,500 LBP.',
    )
    display_lbp_total = fields.Boolean(
        string='Display LBP Prices',
        default=True,
        help='Show prices in both USD and LBP across the POS interface.',
    )

    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        # If parameters are empty, it means we hit the default mixin implementation
        # which returns an empty list. This causes standard POS fields to be missing.
        # We must populate it with all fields to ensure the POS loads correctly.
        if not params:
            params = list(self.fields_get().keys())
        
        # Add our custom fields if they aren't already included
        for field in ['lbp_usd_rate', 'display_lbp_total']:
            if field not in params:
                params.append(field)
        
        return params
