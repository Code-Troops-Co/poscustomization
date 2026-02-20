{
    'name': 'POS Lebanon Customization',
    'version': '19.0.1.0.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Custom POS layout and multi-currency support for Lebanon (USD/LBP)',
    'description': """
        This module provides:
        - Right sidebar with vertical category list and utility buttons
        - Dual currency display (USD and LBP) on product cards, order lines, and totals
        - Exchange rate footer bar
        - Backend configuration for LBP/USD rate
    """,
    'author': 'Code Troops',
    'depends': ['point_of_sale'],
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
