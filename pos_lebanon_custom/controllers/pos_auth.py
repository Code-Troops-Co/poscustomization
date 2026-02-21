import logging

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class PosAuthController(http.Controller):

    @http.route('/pos/authenticate_user', type='jsonrpc', auth='user')
    def authenticate_user(self, config_id, username, password):
        """Authenticate a POS user by username and password.

        Uses direct password hash verification to avoid issues with
        _check_credentials requiring a full web request context.
        """
        _logger.info(
            "POS auth request: user='%s', config_id=%s", username, config_id
        )

        # 1. Find the user by login
        user = request.env['res.users'].sudo().search([
            ('login', '=', username),
        ], limit=1)

        if not user:
            _logger.info("POS auth: user '%s' not found", username)
            return {'success': False, 'message': 'User not found.'}

        # 2. Read password hash directly from database
        request.env.cr.execute(
            "SELECT COALESCE(password, '') FROM res_users WHERE id=%s",
            (user.id,),
        )
        row = request.env.cr.fetchone()
        if not row or not row[0]:
            _logger.warning("POS auth: no password set for user '%s'", username)
            return {'success': False, 'message': 'No password set for this user.'}

        stored_hash = row[0]

        # 3. Verify password using passlib (Odoo's built-in dependency)
        try:
            from passlib.context import CryptContext
            ctx = CryptContext(
                ['pbkdf2_sha512', 'plaintext'],
                deprecated=['plaintext'],
            )
            valid = ctx.verify(password, stored_hash)
        except Exception as e:
            _logger.error("POS auth: password verification error: %s", e)
            return {'success': False, 'message': 'Password verification failed.'}

        if not valid:
            _logger.info("POS auth: invalid password for user '%s'", username)
            return {'success': False, 'message': 'Invalid password.'}

        _logger.info("POS auth: password verified for user '%s' (id=%s)", username, user.id)

        # 4. Find linked employee for POS cashier assignment
        employee = request.env['hr.employee'].sudo().search([
            ('user_id', '=', user.id),
        ], limit=1)

        result = {
            'success': True,
            'user_id': user.id,
            'employee_id': employee.id if employee else False,
            'user_name': user.name,
        }
        _logger.info("POS auth: success → %s", result)
        return result
