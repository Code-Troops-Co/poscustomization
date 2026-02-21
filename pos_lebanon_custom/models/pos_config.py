import logging

from passlib.context import CryptContext

from odoo import api, models, fields
from odoo.exceptions import AccessDenied

_logger = logging.getLogger(__name__)

# Odoo's password hashing context
_crypt_context = CryptContext(
    ['pbkdf2_sha512', 'plaintext'],
    deprecated=['plaintext'],
)


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
        if not params:
            params = list(self.fields_get().keys())
        for field in ['lbp_usd_rate', 'display_lbp_total']:
            if field not in params:
                params.append(field)
        return params

    def authenticate_pos_user(self, username, password):
        """Authenticate a user for POS login via username and password.

        Verifies the password hash directly from the database to avoid
        the full _check_credentials chain (which may require a request
        context due to auth_totp modules).
        """
        self.ensure_one()
        try:
            # 1. Find the user by login
            user = self.env['res.users'].sudo().search([
                ('login', '=', username),
            ], limit=1)

            if not user:
                return {'success': False, 'message': 'User not found.'}

            # 2. Read the hashed password directly from database
            self.env.cr.execute(
                "SELECT COALESCE(password, '') FROM res_users WHERE id=%s",
                [user.id],
            )
            row = self.env.cr.fetchone()
            if not row or not row[0]:
                return {'success': False, 'message': 'No password set for this user.'}

            stored_hash = row[0]

            # 3. Verify the password against the stored hash
            valid, _new_hash = _crypt_context.verify_and_update(
                password, stored_hash
            )
            if not valid:
                return {'success': False, 'message': 'Invalid password.'}

            # 4. Find linked employee for POS cashier
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
