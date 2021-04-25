
const _ = require('lodash')
const ccxt = require('ccxt')

const updateInterval = 10 * 1000

class FtxAccount {
    constructor(config) {
        const exchange = new ccxt.ftx(_.extend({
            enableRateLimit: true,
        }, config.exchangeConfig))

        let positions = []
        let lastUpdatedAt = new Date().getTime()

        const updatePositions = async () => {
            const account = (await exchange.privateGetAccount()).result
            const collateral = +account['collateral']

            console.log('FtxAccount updatePositions')
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

        this.getPositions = async () => {
            const now = new Date().getTime()
            if (now - lastUpdatedAt > updateInterval) {
                lastUpdatedAt = now
                currentPromise = updatePositions()
            }
            await currentPromise

            return {
                positions: positions,
                timestamp: lastUpdatedAt / 1000,
            }
        }
    }
}

module.exports = FtxAccount
