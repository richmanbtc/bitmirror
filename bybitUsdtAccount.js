
const _ = require('lodash')
const ccxt = require('ccxt')

const updateInterval = 10 * 1000

const sideToInt = (side) => {
    return side.toLowerCase() === 'buy' ? 1 : -1
}

class BybitUsdtAccount {
    constructor(config) {
        const exchange = new ccxt.bybit(_.extend({
            enableRateLimit: true,
        }, config.exchangeConfig))

        let positions = []
        let lastUpdatedAt = new Date().getTime()

        const updatePositions = async () => {
            const positions2 = (await exchange.privateLinearGetPositionList()).result
            const balance = (await exchange.v2PrivateGetWalletBalance({ coin: 'USDT' })).result['USDT']
            // console.log(balance)
            const collateral = +balance['equity']

            console.log('BybitUsdtAccount updatePositions')
            // console.log(positions2)

            const aggDollorSizes = {}

            _.each(_.map(positions2, 'data'), (pos) => {
                const symbol = pos['symbol']
                aggDollorSizes[symbol] = (aggDollorSizes[symbol] || 0) + sideToInt(pos['side']) * (+pos['position_value'])
            })

            positions = _.map(aggDollorSizes, (dollorSize, symbol) => {
                return {
                    market: symbol,
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

module.exports = BybitUsdtAccount
