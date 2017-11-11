import { Component, OnInit, Input } from '@angular/core';
import { Stock, Session } from '../../interfaces/stock';
import { StockService } from '../../services/stock.service';

@Component({
  selector: 'app-stock-card',
  templateUrl: './stock-card.component.html',
  styles: []
})
export class StockCardComponent implements OnInit {

  private working: boolean = false;
  private stockError: string = '';
  private stockErrorTimeout: number = null;
  private viewHistory: boolean = false;
  @Input() stock: Stock;

  ///
  /// @fn     recentSession
  /// @brief  Retrieves the stock's most recent trading session stats.
  ///
  private recentSession (): Session {
    return this.stock.sessions[this.stock.sessions.length - 1];
  }

  ///
  /// @fn     getChangeClass
  /// @brief  Returns a CSS class that co-responds to the change in a stock's value.
  ///
  private getChangeClass (change: number): string {
    if (change < 0) { return 'down'; }
    else if (change > 0) { return 'up'; }
    else { return 'unchanged'; }
  }

  constructor(private stockService: StockService) { }

  ///
  /// @fn     onUnwatchClicked
  /// @brief  Fired when the Unwatch Stock button is clicked.
  ///
  /// The Unwatch Stock button will show as a red 'X' at the top-right
  /// corner of the stock card.
  ///
  onUnwatchClicked (ev) {
    ev.preventDefault();

    // Ask the user if they wish to go though with this operation.
    const ays = confirm(`Are you sure you wish to unwatch stock ${this.stock.symbol}?`);
    if (ays === false) {
      return;
    }

    // Prepare our working flag.
    this.working = true;
    this.stockError = '';

    // Ask the backend to un-watch our stock.
    this.stockService.unwatchStock(this.stock.symbol).subscribe(
      () => {},
      (error) => {
        const { message } = error.json().error;
        this.stockError = message;
        this.working = false;
        
        this.stockErrorTimeout = setTimeout(() => { this.stockError = '' }, 10000);
      }
    );
  }

  ///
  /// @fn     onHistoryClicked
  /// @brief  Toggles the Session History portion of the card.
  ///
  onHistoryClicked (ev) {
    ev.preventDefault();
    
    this.viewHistory = !this.viewHistory;
  }

  ngOnInit() {
  }

}
