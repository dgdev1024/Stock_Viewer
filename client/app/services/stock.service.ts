///
/// @fn     stock.service.ts
/// @brief  The service in charge of fetching and updating our stocks.
///

import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class StockService {

  constructor(private httpService: Http) { }

  ///
  /// @fn     fetchStocks
  /// @brief  Fetches recent stored session data on our watched stocks.
  ///
  fetchStocks () {
    return this.httpService.get('/api/stocks/fetch');
  }

  ///
  /// @fn     watchStock
  /// @brief  Adds a new stock to our watch list.
  ///
  /// @param  {string} symbol The stock's call symbol.
  ///
  watchStock (symbol: string) {
    return this.httpService.post(`/api/stocks/watch/${symbol}`, {});
  }

  ///
  /// @fn     unwatchStock
  /// @brief  Removes a stock from our watch list.
  ///
  /// @param  {string} symbol The stock's call symbol.
  ///
  unwatchStock (symbol: string) {
    return this.httpService.delete(`/api/stocks/unwatch/${symbol}`);
  }
}
