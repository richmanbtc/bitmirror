const express = require('express')
const _ = require('lodash')
const ccxt = require('ccxt')
const logger = require('morgan');
const config = require('./config')

const app = express()
const port = 3000
const updateInterval = 10 * 1000
const license = 'CC0'

// const sideToInt = (side) => {
//     return side.toLowerCase() === 'buy' ? 1 : -1
// }

app.set('json spaces', 2)
app.use(logger('dev'))

let accesses = []

app.use((req, res, next) => {
    const now = new Date().getTime()

    accesses.push({
        ip: req.ip,
        accessedAt: now,
    })

    accesses = _.filter(accesses, (access) => {
        return now - access.accessedAt < 24 * 60 * 60 * 1000
    })

    next()
});

_.each(config.accounts, async (accountConfig) => {
    const exchange = new ccxt.ftx(_.extend({
        enableRateLimit: true,
    }, accountConfig.exchangeConfig))

    let positions = []
    let lastUpdatedAt = new Date().getTime()

    const updatePositions = async () => {
        const account = (await exchange.privateGetAccount()).result
        const collateral = +account['collateral']

        console.log('updatePositions')
        // console.log(account)

        positions = _.map(account.positions, (pos) => {
            // cost = netSize * entryPrice
            // unrealizedPnl = netSize * (currentPrice - entryPrice)
            // cost + unrealizedPnl = netSize * currentPrice
            const dollorSize = (+pos['cost']) + (+pos['unrealizedPnl'])

            return {
                market: pos['future'],
                leverage: dollorSize / collateral
            }
        })

        positions = _.sortBy(positions, (pos) => {
            return pos.market
        })
    }

    let currentPromise = updatePositions()

    app.get(`/${accountConfig.id}/positions`, async (req, res) => {

        const now = new Date().getTime()
        if (now - lastUpdatedAt > updateInterval) {
            lastUpdatedAt = now
            currentPromise = updatePositions()
        }
        await currentPromise

        res.json({
            positions: positions,
            timestamp: lastUpdatedAt / 1000,
            license: license,
        })
    })
})

app.get('/status', async (req, res) => {
    res.json({
        accessIn24Hour: accesses.length,
        uniqueIpIn24Hour: _.uniq(_.map(accesses, 'ip')).length,
        license: license,
    })
})

app.get('/', async (req, res) => {
    res.header('Content-Type', 'text/plain;charset=utf-8')
    res.end(`All data sent from this server is licensed under ${license}.`)
})

app.listen(port, () => {
    console.log(`bitmirror listening at http://localhost:${port}`)
})
