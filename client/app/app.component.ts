import { Component, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { getRandomInt } from './utility/random';
import { Stock, Session } from './interfaces/stock';
import { StockService } from './services/stock.service';
import { SocketService } from './services/socket.service';
import { StockViewComponent } from './components/stock-view/stock-view.component';
import { StockChartComponent } from './components/stock-chart/stock-chart.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styles: []
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private working: boolean = false;
  private watchStocks: Stock[] = [];
  private stockError: string = '';
  private stockErrorTimeout: number = null;

  // Grab the stock chart.
  @ViewChild('stockChart') stockChart;

  ///
  /// @fn     initializeEvents
  /// @brief  Initializes our Socket.IO event handlers.
  ///
  private initializeEvents () {
    this.socketService.on('watch stock', (data) => {
      const stock = {
        symbol: data['symbol'],
        change: data['change'],
        sessions: data['sessions'],
        color: `rgb(${getRandomInt(0, 200)}, ${getRandomInt(0, 200)}, ${getRandomInt(0, 200)})`
      }
      this.watchStocks.push(stock);
      this.stockChart.addStock(stock);
    });

    this.socketService.on('unwatch stock', (data) => {
      for (let i = 0; i < this.watchStocks.length; ++i) {
        if (this.watchStocks[i].symbol === data['symbol']) {
          this.watchStocks.splice(i, 1);
          this.stockChart.removeStock(data['symbol']);
          return;
        }
      }
    });
    
    this.socketService.on('update stock', (data) => {
      for (let i = 0; i < this.watchStocks.length; ++i) {
        if (this.watchStocks[i].symbol === data['symbol']) {
          this.watchStocks[i].sessions = data['updated'];
          this.stockChart.updateStock(data['symbol'], data['updated']);
        }
      }
    });
  }

  ///
  /// @fn     fetchStocks
  /// @brief  Fetchs stock data from the backend.
  ///
  private fetchStocks () {
    // Prepare the work flag.
    this.working = true;
    this.stockError = '';

    // Fetch our stocks from the backend.
    this.stockService.fetchStocks().subscribe(
      (response) => {
        this.watchStocks = response.json();
        this.watchStocks = this.watchStocks.map(s => {
          return { 
            ...s, 
            color: `rgb(${getRandomInt(0, 200)}, ${getRandomInt(0, 200)}, ${getRandomInt(0, 200)})`
          };
        })
        this.working = false;
        this.initializeEvents();
        this.stockChart.initializeChart(this.watchStocks);
      },

      (error) => {
        const { status, message } = error.json().error;

        this.working = false;
        if (status !== 404) {
          this.stockError = message;
          this.stockErrorTimeout = setTimeout(() => { this.stockError = ''; }, 10000);
        } else {
          this.initializeEvents();
          this.stockChart.initializeChart(this.watchStocks);
        }
      }
    );
  }

  constructor (
    private socketService: SocketService,
    private stockService: StockService
  ) {}

  ngAfterViewInit () {
    this.fetchStocks();
  }

  ngOnDestroy () {
    this.socketService.clear();
  }
}
