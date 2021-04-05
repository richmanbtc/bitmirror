module.exports = {
    accounts: [
        {
            id: 'my_ftx_strategy',
            exchangeConfig: {
                apiKey: 'my_api_key',
                secret: 'my_api_secret',
                headers: {
                    'FTX-SUBACCOUNT': 'my_subaccount'
                },
            }
        }
    ]
}
