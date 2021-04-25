const express = require('express')
const _ = require('lodash')
const logger = require('morgan');
const config = require('./config')
const BybitUsdtAccount = require('./bybitUsdtAccount.js')
const FtxAccount = require('./ftxAccount.js')

const app = express()
const port = 3000
const license = 'CC0'

app.set('json spaces', 2)
app.use(logger('dev'))

let accesses = []

app.use((req, res, next) => {
    const now = new Date().getTime()

    accesses.push({
        ip: req.ip,
        accessedAt: now,
    })

    if (now - accesses[0].accessedAt > 25 * 60 * 60 * 1000) {
        accesses = _.filter(accesses, (access) => {
            return now - access.accessedAt < 24 * 60 * 60 * 1000
        })
    }

    next()
});

_.each(config.accounts, async (accountConfig) => {
    const accountType = accountConfig.type

    let account
    if (accountType === 'bybit_usdt') {
        account = new BybitUsdtAccount(accountConfig)
    } else if (accountType === 'ftx') {
        account = new FtxAccount(accountConfig)
    } else {
        console.log('unknown account type ' + accountType)
        return
    }

    app.get(`/${accountConfig.id}/positions`, async (req, res) => {
        res.json(_.extend({
            license: license
        }, await account.getPositions()))
    })
})

app.get('/status', async (req, res) => {
    res.json({
        accessIn24Hour: accesses.length,
        uniqueIpIn24Hour: _.uniq(_.map(accesses, 'ip')).length,
        acesssByIpIn24Hour: _.sortBy(_.map(_.countBy(accesses, 'ip')), _.toNumber),
        license: license,
    })
})

app.get('/', async (req, res) => {
    res.header('Content-Type', 'text/plain;charset=utf-8')
    res.end(`All data sent from this server is licensed under CC0 (https://creativecommons.org/publicdomain/zero/1.0/legalcode).`)
})

app.listen(port, () => {
    console.log(`bitmirror listening at http://localhost:${port}`)
})
