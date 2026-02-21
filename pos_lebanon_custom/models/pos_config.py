import logging

from odoo import api, models, fields
from odoo.exceptions import AccessDenied

_logger = logging.getLogger(__name__)


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
        # CRITICAL: If the parent returns an empty list (pos.load.mixin default),
        # we must load ALL fields. Otherwise standard POS fields like
        # use_pricelist, currency_id, etc. will be missing and POS crashes.
        if not params:
            params = list(self.fields_get().keys())
        # Add our custom fields if they aren't already included
        for field in ['lbp_usd_rate', 'display_lbp_total']:
            if field not in params:
                params.append(field)
        return params

    def authenticate_pos_user(self, username, password):
        """Authenticate a user for POS login via username and password.
        
        Returns a dict with success status and user/employee info.
        Called from the POS frontend login screen patch.
        """
        self.ensure_one()
        try:
            # Find user by login
            user = self.env['res.users'].sudo().search([
                ('login', '=', username),
            ], limit=1)

            if not user:
                return {'success': False, 'message': 'User not found.'}

            # Validate password via Odoo's authentication
            try:
                self.env['res.users'].sudo()._check_credentials(
                    password, {'interactive': False}
                )
            except AccessDenied:
                # Try authenticating with the found user's context
                try:
                    db_name = self.env.cr.dbname
                    uid = self.env['res.users'].authenticate(
                        db_name, username, password, {'interactive': False}
                    )
                    if not uid:
                        return {'success': False, 'message': 'Invalid password.'}
                except Exception:
                    return {'success': False, 'message': 'Invalid password.'}

            # Check if user has a linked employee for POS
            employee = self.env['hr.employee'].sudo().search([
                ('user_id', '=', user.id),
            ], limit=1)

            return {
                'success': True,
                'user_id': user.id,
                'employee_id': employee.id if employee else False,
                'user_name': user.name,
            }

        except Exception as e:
            _logger.warning("POS login error for user '%s': %s", username, e)
            return {
                'success': False,
                'message': 'Authentication failed. Please try again.',
            }
