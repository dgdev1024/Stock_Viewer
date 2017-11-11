///
/// @file   add-stock.component.ts
/// @brief  Presents the Add Stock form to the user.
///

import { Component, OnInit } from '@angular/core';
import { StockService } from '../../services/stock.service';

@Component({
  selector: 'app-add-stock',
  templateUrl: './add-stock.component.html',
  styles: []
})
export class AddStockComponent implements OnInit {

  private working: boolean = false;
  private stockQuery: string = '';
  private stockError: string = '';
  private stockErrorTimeout: number = null;

  constructor(private stockService: StockService) { }

  ///
  /// @fn     onStockSubmit
  /// @brief  Fired when the submit button is clicked.
  ///
  onStockSubmit (ev) {
    // Prevents the page from reloading on submit.
    ev.preventDefault();

    // Make sure the user entered something.
    if (this.stockQuery === '') {
      this.stockError = 'Please enter a stock symbol.';
      this.stockErrorTimeout = setTimeout(() => { this.stockError = '' }, 10000);
      return;
    }

    // Reset our work flag and error string.
    this.working = true;
    this.stockError = '';

    // Tell the backend to watch our new stock.
    this.stockService.watchStock(this.stockQuery).subscribe(
      () => {
        this.working = false;
        this.stockQuery = '';
      },

      (error) => {
        const { message } = error.json().error;
        this.stockError = message;
        this.working = false;

        this.stockErrorTimeout = setTimeout(() => { this.stockError = '' }, 10000);
      }
    );
  }

  ngOnInit() {
  }

}
