///
/// @file   stock.js
/// @brief  API routing for our stock functions.
///

// Imports
const express           = require('express');
const stockController   = require('../controllers/stock');

// Export our router.
module.exports = (socket) => {
    const router = express.Router();

    // AUTOMATIC: Periodically update our stocks as the trading day progresses.
    function automaticUpdate (ms) {
        stockController.updateStocks(true, socket, () => {
            setTimeout(automaticUpdate, ms, ms);
        });
    }
    setTimeout(automaticUpdate, 1000, 10000);
    stockController.updateStocks(false, socket, () => {});

    // POST: Add a new stock to the watch list.
    router.post('/watch/:symbol', (req, res) => {
        stockController.watchStock(req.params.symbol, socket, (err, ok) => {
            if (err) { return res.status(err.status).json({ error: err }); }
            return res.status(200).json(ok);
        });
    });

    // GET: Fetch stored session data on our watched stocks.
    router.get('/fetch', (req, res) => {
        stockController.fetchStocks((err, ok) => {
            if (err) { return res.status(err.status).json({ error: err }); }
            return res.status(200).json(ok);
        });
    });

    // DELETE: Removes a stock from the watch list.
    router.delete('/unwatch/:symbol', (req, res) => {
        stockController.unwatchStock(req.params.symbol, socket, (err, ok) => {
            if (err) { return res.status(err.status).json({ error: err }); }
            return res.status(200).json(ok);
        });
    });

    return router;
}