import logging
import hashlib

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
        if not params:
            params = list(self.fields_get().keys())
        for field in ['lbp_usd_rate', 'display_lbp_total']:
            if field not in params:
                params.append(field)
        return params

    def authenticate_pos_user(self, username, password):
        """Authenticate a user for POS login via username and password.

        Strategy:
          1. Find user by login
          2. Read password hash from database
          3. Verify with passlib (Odoo's own dependency)
          4. Return user + employee info
        """
        self.ensure_one()
        _logger.info("POS auth attempt for user '%s' on config %s", username, self.id)

        # 1. Find user
        try:
            user = self.env['res.users'].sudo().search([
                ('login', '=', username),
            ], limit=1)
        except Exception as e:
            _logger.error("POS auth: error searching user '%s': %s", username, e)
            return {'success': False, 'message': 'System error. Please try again.'}

        if not user:
            _logger.info("POS auth: user '%s' not found", username)
            return {'success': False, 'message': 'User not found.'}

        _logger.info("POS auth: found user '%s' (id=%s)", user.login, user.id)

        # 2. Read password hash
        try:
            self.env.cr.execute(
                "SELECT COALESCE(password, '') FROM res_users WHERE id=%s",
                (user.id,),
            )
            row = self.env.cr.fetchone()
        except Exception as e:
            _logger.error("POS auth: error reading password for user %s: %s", user.id, e)
            return {'success': False, 'message': 'System error. Please try again.'}

        if not row or not row[0]:
            _logger.warning("POS auth: no password set for user '%s'", username)
            return {'success': False, 'message': 'No password set for this user.'}

        stored_hash = row[0]
        _logger.info("POS auth: retrieved password hash for user '%s' (len=%d)", username, len(stored_hash))

        # 3. Verify password
        try:
            from passlib.context import CryptContext
            ctx = CryptContext(['pbkdf2_sha512', 'plaintext'], deprecated=['plaintext'])
            valid = ctx.verify(password, stored_hash)
        except ImportError:
            _logger.warning("POS auth: passlib not available, trying fallback")
            # Ultra-fallback: try to use Odoo's own utility
            try:
                from odoo.tools.misc import verify_password  # noqa
                valid = verify_password(password, stored_hash)
            except (ImportError, AttributeError):
                _logger.error("POS auth: no password verification method available")
                return {'success': False, 'message': 'Password verification unavailable.'}
        except Exception as e:
            _logger.error("POS auth: password verification error for '%s': %s", username, e)
            return {'success': False, 'message': 'Invalid password.'}

        if not valid:
            _logger.info("POS auth: invalid password for user '%s'", username)
            return {'success': False, 'message': 'Invalid password.'}

        _logger.info("POS auth: password verified for user '%s'", username)

        # 4. Find linked employee
        try:
            employee = self.env['hr.employee'].sudo().search([
                ('user_id', '=', user.id),
            ], limit=1)
        except Exception as e:
            _logger.warning("POS auth: error searching employee for user %s: %s", user.id, e)
            employee = False

        result = {
            'success': True,
            'user_id': user.id,
            'employee_id': employee.id if employee else False,
            'user_name': user.name,
        }
        _logger.info("POS auth: success for user '%s' → %s", username, result)
        return result
