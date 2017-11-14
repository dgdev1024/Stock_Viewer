///
/// @file   stock.js
/// @brief  Controller functions for our stocks.
///

// Imports
const escape        = require('html-escape');
const axios         = require('axios').default;
const waterfall     = require('async').waterfall;
const asyncForEach  = require('async').forEachSeries;
const stockModel    = require('../models/stock');
const checkSymbol   = require('check-ticker-symbol');

// Private Functions
const private = {
    ///
    /// @fn     tradingUnderway
    /// @brief  Determines whether a trading session is currently underway.
    ///
    /// A standard trading day on the New York Stock Exchange begins at 9:30 AM ET
    /// and ends at 4:00 PM ET - that is 2:30 PM to 9:00 PM in UTC. The range of time at
    /// which this function will return true will be between five minutes before the start
    /// of trading and 15 minutes after the end of trading, to account for settling of stocks.
    ///
    /// @return {boolean} True if a session is underway.
    ///
    tradingUnderway () {
        // Get the current date and time, in UTC day, hours, and minutes.
        const now = new Date();
        const days = now.getUTCDay();
        const hours = now.getUTCHours();
        const minutes = now.getUTCMinutes();

        // The NYSE is closed on weekends. Check to see if it is not a weekend.
        if (days === 0 || days === 6) {
            return false; 
        }

        // Check to see if we are currently before the start of trading. Allow a couple of
        // minutes of leeway.
        if (hours < 14 || (hours === 14 && minutes < 28)) {
            return false;
        }

        // Check to see if the trading day has ended. Allow 15 minutes of leeway here, so we can
        // account for stocks to settle down at their final values.
        if (hours > 21 || (hours === 21 && minutes >= 15)) {
            return false;
        }

        // There is a trading day currently underway.
        return true;
    },

    ///
    /// @fn     fetchSessionData
    /// @brief  Polls the Alpha Vantage API for the latest session data on the given stock.
    ///
    /// @param  {string} symbol The stock's call symbol.
    /// @param  {function} done Run when finished.
    ///
    fetchSessionData (symbol, done) {
        // The URL of the API to be polled.
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.STOCK_API_KEY}`;

        // Use Axios to poll the API for the session data.
        axios.get(url).then((response) => {
            // Check to see if the session data has been retrieved. If nothing is retrieved,
            // then early out with no error and no data.
            //
            // It's worth noting, by the way, that each session is stored as individual objects within
            // the object that is returned below.
            const timeSeriesDaily = response.data['Time Series (Daily)'];
            if (!timeSeriesDaily) { return done(null, null, null); }

            // Iterate through each session in the time series. Record each session's date,
            // high, low, and close.
            let sessions = [];
            for (const session in timeSeriesDaily) {
                sessions.push({
                    date: session,      // The session object's key is the session's date, and will be recorded here.
                    high: Number(timeSeriesDaily[session]['2. high']).toFixed(2),
                    low: Number(timeSeriesDaily[session]['3. low']).toFixed(2),
                    close: Number(timeSeriesDaily[session]['4. close']).toFixed(2),
                    open: Number(timeSeriesDaily[session]['1. open']).toFixed(2),
                    change: 0
                });

                // Bring in only the last twenty-five sessions - slightly above the number of
                // business days in an average month.
                if (sessions.length === 25) { break; }
            }

            for (let i = 0; i < sessions.length; ++i) {
                if (i === sessions.length - 1) {
                    sessions[i].change = (sessions[i].close - sessions[i].open).toFixed(2);
                } else {
                    sessions[i].change = (sessions[i].close - sessions[i + 1].close).toFixed(2);
                }
            }

            const change = sessions[0].change;
            
            // Return the array of sessions - reversed so that the most recent session
            // is at the last element of the array - and that recent session's close
            // in the callback.
            return done(null, sessions.reverse(), change);
        }).catch((err) => {
            return done(err);
        });
    }
};

// Export Controller Functions
module.exports = {
    ///
    /// @fn     watchStock
    /// @brief  Adds a new stock to the watch list.
    ///
    /// @param  {string} symbol The stock's call symbol.
    /// @param  {object} socket The Socket.IO object.
    /// @param  {function} done Run when finished.
    ///
    watchStock (symbol, socket, done) {
        // Make sure our call symbol is uppercase.
        symbol = escape(symbol.toUpperCase());

        // Our waterfall...
        waterfall(
            [
                // First, check to see if this stock is already being watched.
                (next) => {
                    stockModel.findOne({ symbol }).then((stock) => {
                        // If the stock is present in our database, then it is already being watched.
                        if (stock) {
                            return next({ status: 404, message: `The stock ${symbol} is already being watched.` });
                        }

                        // Next function.
                        return next(null);
                    }).catch((err) => {
                        console.error(`stockController.watchStock (check exists) - ${err.stack}`);
                        return next({ status: 500, message: 'An error occured. Try again later.' });
                    });
                },

                // Next, poll the Alpha Vantage API for the latest session data on the stock.
                (next) => {
                    // Poll the API.
                    private.fetchSessionData(symbol, (err, sessions, change) => {
                        if (err) {
                            console.error(`stockController.watchStock (poll api) - ${err.stack}`);
                            return next({ status: 500, message: 'An error occured. Try again later.' });
                        }

                        // Check to see if any session data was returned.
                        if (!sessions) {
                            return next({ status: 404, message: `The stock ${symbol} could not be found.` });
                        }

                        // Send the session data, and the delta of the most recent session,
                        // to the next function.
                        return next(null, sessions, change);
                    });
                },

                // Finally, save that session data to the database and broadcast that data with
                // our web sockets.
                (sessions, change, next) => {
                    stockModel.create({ symbol, sessions, change }).then((stock) => {
                        // Broadcast our newly-watched stock data to all clients.
                        socket.emit('watch stock', { symbol, sessions, change });

                        // Done.
                        return next(null);
                    }).catch((err) => {
                        console.error(`stockController.watchStock (save stock) - ${err.stack}`);
                        return next({ status: 500, message: 'An error occured. Try again later.' });
                    });
                }
            ],
            (err) => {
                if (err) { return done(err); }
                return done(null, { message: `The stock ${symbol} is now being watched.` });
            }
        );
    },

    ///
    /// @fn     fetchStocks
    /// @brief  Fetches stored session data on all watched stocks.
    ///
    /// @param  {function} done Run when finished.
    ///
    fetchStocks (done) {
        stockModel.find({}).then((stocks) => {
            // Was any data returned?
            if (!stocks || stocks.length === 0) {
                return done({ status: 404, message: 'No stocks are currently being watched.' });
            }

            // Return our stocks, such that any database IDs are stripped out.
            return done(null, stocks.map((stock) => {
                return {
                    symbol: stock.symbol,
                    change: stock.change,
                    sessions: stock.sessions.map((session, index, array) => {
                        return {
                            date: session.date,
                            close: session.close,
                            high: session.high,
                            low: session.low,
                            change: index === 0 ? 
                                    (session.close - session.open).toFixed(2) : 
                                    (session.close - array[index - 1].close).toFixed(2)
                        };
                    })
                };
            }));
        }).catch((err) => {
            console.error(`stockController.fetchStocks (check database) - ${err.stack}`);
            return done({ status: 500, message: 'An error occured. Try again later.' });
        });
    },

    ///
    /// @fn     updateStocks
    /// @brief  Updates the session data on all stocks.
    ///
    /// @param  {boolean} automatic Is this function being called automatically?
    /// @param  {object} socket The Socket.IO object.
    /// @param  {function} done Run when finished.
    ///
    updateStocks (automatic, socket, done) {
        // No need to run this function if there is no trading session underway.
        if (automatic === true && private.tradingUnderway() === false) {
            return done(null);
        }

        // Execute our waterfall.
        waterfall(
            [
                // First, look up all of the stocks we are watching.
                (next) => {
                    stockModel.find({}).then((stocks) => {
                        // Are any stocks currently being watched?
                        if (!stocks || stocks.length === 0) {
                            return next({ status: 404, message: 'No stocks are currently being watched.' });
                        }

                        // Send the stocks to the next function.
                        return next(null, stocks);
                    }).catch((err) => {
                        console.error(`stockController.updateStocks (check database) - ${err.stack}`);
                        return next({ status: 500, message: 'An error occured. Try again later.' });
                    });
                },

                // Poll the API and update the session data on each stock.
                (stocks, next) => {
                    // Iterate through each of our stock entries and synchronously update them.
                    asyncForEach(
                        stocks,
                        (stock, forNext) => {
                            // Poll the API for the latest session data on the current stock.
                            private.fetchSessionData(stock.symbol, (err, sessions, change) => {
                                if (err) {
                                    console.error(`stockController.updateStocks (fetch stock ${stock.symbol}) - ${err.stack}`);
                                    return forNext({ status: 500, message: 'An error occured. Try again later.' });
                                }

                                // Was any session data fetched?
                                if (!sessions) {
                                    return forNext(null);
                                }

                                // Compare the dates on the most recent session stored and the most recent
                                // session that was just fetched. Is this a new trading session?
                                const oldRecentSession = stock.sessions[stock.sessions.length - 1];
                                const newRecentSession = sessions[sessions.length - 1];

                                // If it is, then we'll update the sessions array as a whole. If it isn't,
                                // then we'll just update the last element in that array.
                                let newTradingSession = false;
                                if (oldRecentSession.date === newRecentSession.date) {
                                    stock.sessions.pop();
                                    stock.sessions.push(newRecentSession);
                                } else {
                                    stock.sessions = sessions;
                                    newTradingSession = true;
                                }

                                // Update the point change of the stock from its close in the previous
                                // session.
                                stock.change = change;

                                // Save the updated stock data in our database.
                                stock.save().then(() => {
                                    // Broadcast the new session data to our clients.
                                    socket.emit('update stock', {
                                        symbol: stock.symbol,
                                        change,
                                        updated: sessions,
                                        newTradingSession
                                    });

                                    // Next iteration of our array.
                                    return forNext(null);
                                }).catch((err) => {
                                    console.error(`stockController.updateStocks (save stock ${stock.symbol}) - ${err.stack}`);
                                    return forNext({ status: 500, message: 'An error occured. Try again later.' });
                                });
                            });
                        },
                        (err) => {
                            if (err) { return next(err); }
                            return next(null);
                        }
                    );
                }
            ],
            (err) => {
                if (err) { return done(err); }
                return done(null);
            }
        );
    },

    ///
    /// @fn     unwatchStock
    /// @brief  Removes a stock with the given call symbol from the watch list.
    ///
    /// @param  {string} symbol The stock's call symbol.
    /// @param  {object} socket The Socket.IO object.
    /// @param  {function} done Run when finished.
    ///
    unwatchStock (symbol, socket, done) {
        // As per usual, our symbol needs to be uppercase.
        symbol = escape(symbol.toUpperCase());

        // Find the stock with our symbol in the database. If it exists, then remove it.
        stockModel.findOneAndRemove({ symbol }).then((stock) => {
            if (!stock) {
                return done({ status: 404, message: `The stock ${symbol} is not currently being watched.` });
            }

            // Let the frontend know to remove the stock, too.
            socket.emit('unwatch stock', { symbol });

            // Done.
            return done(null, { message: `The stock ${symbol} is no longer being watched.` });
        }).catch((err) => {
            console.error(`stockController.unwatchStock (find and remove) - ${err.stack}`);
            return done({ status: 500, message: 'An error occured. Try again later.' });
        })
    }
};