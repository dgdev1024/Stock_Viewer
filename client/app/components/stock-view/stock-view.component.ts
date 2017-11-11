///
/// @file   stock-view.component.ts
/// @brief  Presents our list of watched stocks to the user.
///

import { Component, OnInit, Input } from '@angular/core';
import { Stock } from '../../interfaces/stock';
import { AddStockComponent } from '../add-stock/add-stock.component';
import { StockCardComponent } from '../stock-card/stock-card.component';

@Component({
  selector: 'app-stock-view',
  templateUrl: './stock-view.component.html',
  styles: []
})
export class StockViewComponent implements OnInit {

  @Input() watchStocks: Stock[];

  ngOnInit() {
  }

}
