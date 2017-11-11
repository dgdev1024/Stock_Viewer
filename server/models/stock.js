///
/// @file   stock.js
/// @brief  The database model for the session data on a stock.
///

// Imports
const mongoose = require('mongoose');

// Stock Session Schema
const sessionSchema = new mongoose.Schema({
    // The session's date ('YYYY-MM-DD').
    date: { type: String, required: true },

    // The closing value of the session, or its current value in the
    // case of a trading session ongoing.
    close: { type: Number, required: true },

    // The opening value of the stock, per Alpha Vantage. This will
    // only be necessary in the case of a stock's first day of trading, when
    // we need a number to compare to the closing value.
    open: { type: Number, required: true },

    // The high and low of the session.
    high: { type: Number, required: true },
    low: { type: Number, required: true }
});

// Stock Schema
const stockSchema = new mongoose.Schema({
    // The call symbol of the stock.
    symbol: { type: String, required: true },

    // The delta of the most recent session.
    change: { type: Number, required: true },

    // The stock's most recent trading sessions. Up to 100 sessions are recorded.
    sessions: [sessionSchema]
});

// Finds the 100-day high and low for the stock (intra-day).
stockSchema.virtual('intradayHigh').get(function () {
    return this.sessions.reduce((previous, current) => {
        return Math.max(previous.high, current.high);
    });
});

stockSchema.virtual('intradayLow').get(function () {
    return this.sessions.reduce((previous, current) => {
        return Math.min(previous.low, current.low);
    });
});

// Finds the 100-day high and low for the stock (closing).
stockSchema.virtual('closingHigh').get(function () {
    return this.sessions.reduce((previous, current) => {
        return Math.max(previous.close, current.close);
    });
});

stockSchema.virtual('closingLow').get(function () {
    return this.sessions.reduce((previous, current) => {
        return Math.min(previous.close, current.close);
    });
});

// Compile and export the model.
module.exports = mongoose.model('stock', stockSchema);