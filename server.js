const express = require('express')
const _ = require('lodash')
const ccxt = require('ccxt')
const config = require('./config')

const app = express()
const port = 3000
const updateInterval = 10 * 1000
const license = 'CC0'

// const sideToInt = (side) => {
//     return side.toLowerCase() === 'buy' ? 1 : -1
// }

_.each(config.accounts, async (accountConfig) => {
    const exchange = new ccxt.ftx(_.extend({
        enableRateLimit: true,
    }, accountConfig.exchangeConfig))

    let positions = []
    let lastUpdatedAt = new Date().getTime()

    const updatePositions = async () => {
        const account = (await exchange.privateGetAccount()).result

        // console.log(account)

        positions = _.map(account.positions, (pos) => {
            // cost = netSize * entryPrice
            // unrealizedPnl = netSize * (currentPrice - entryPrice)
            // cost + unrealizedPnl = netSize * currentPrice
            const dollorSize = (+pos['cost']) + (+pos['unrealizedPnl'])

            return {
                market: pos['future'],
                leverage: dollorSize / (+account['collateral'])
            }
        })
        positions.sort()
    }

    await updatePositions()

    app.get(`/${accountConfig.id}/positions`, async (req, res) => {

        const now = new Date().getTime()
        if (now - lastUpdatedAt > updateInterval) {
            await updatePositions()
            lastUpdatedAt = now
        }

        const output = JSON.stringify({
            positions: positions,
            license: license,
        }, null, 2)
        res.send(output)
    })
})


app.listen(port, () => {
    console.log(`bitmirror listening at http://localhost:${port}`)
})
