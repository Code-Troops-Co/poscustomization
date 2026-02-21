{
    'name': 'POS Lebanon Customization',
    'version': '19.0.3.0.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Custom POS layout and multi-currency support for Lebanon (USD/LBP)',
    'description': """
        This module provides:
        - Dual currency display (USD and LBP) on all POS screens
        - Payment Screen, Receipt, and Closing Register multi-currency
        - WhatsApp receipt sharing
        - Always-visible keypad
        - Full category sidebar with hierarchy
        - Username/Password login screen
        - Exchange rate footer bar
        - Backend configuration for LBP/USD rate
    """,
    'author': 'Code Troops',
    'depends': ['point_of_sale', 'pos_hr'],
    'data': [
        'views/pos_config_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_lebanon_custom/static/src/**/*',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
