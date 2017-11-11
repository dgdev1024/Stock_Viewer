import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Stock, Session } from '../../interfaces/stock';
import * as ChartJS from 'chart.js';

// Keep only 25 sessions per stock.
const SESSION_COUNT: number = 25;

@Component({
  selector: 'app-stock-chart',
  templateUrl: './stock-chart.component.html',
  styles: []
})
export class StockChartComponent implements OnInit, OnDestroy {

  private chart: ChartJS = null;
  private maxSessionCount: number = 0;
  @ViewChild('stockChart') stockChart;

  constructor() { }

  ngOnInit() {
  }

  ngOnDestroy () {
    if (this.chart !== null) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  initializeChart (stocks: Stock[]) {
    // Sort the stock array by number of sessions descending. We'll need to
    // do this in order to properly set up our chart's labels.
    const sortedStocks = stocks.slice().sort((a, b) => {
      return b.sessions.length - a.sessions.length;
    });

    // Use that sorted array to figure out which of our watched stocks
    // has the most sessions recorded. Map a session dates array from it.
    const sessionDates = sortedStocks.length > 0 ?
      sortedStocks[0].sessions.map(s => s.date) : [];

    // Record the length of that array.
    this.maxSessionCount = sessionDates.length;

    // Create the chart configuration.
    const chartConfig: ChartJS.ChartConfiguration = {
      // Line chart.
      type: 'line',

      // Chart data.
      data: {
        // Use the session dates array we created above to create our chart's labels.
        // In case that array has fewer than 25 elements (indicating a reletively new stock
        // with fewer than 25 sessions), we'll pad the empty spots with a new array of dots.
        labels: new Array(SESSION_COUNT - sessionDates.length).fill('').concat(sessionDates),

        // Map our stocks out as datasets.
        datasets: stocks.map((stock) => {

          return {
            // Use the stock's call symbol as our label.
            label: stock.symbol,

            // Use the closing values of the stock's last 25 sessions as our
            // data points. In case of stocks with fewer than 25 sessions recorded,
            // pad this array with a new array of zeroes.
            data: new Array(SESSION_COUNT - stock.sessions.length).fill(0).concat(
              stock.sessions.map(s => s.close)
            ),

            // Configure the dataset's visuals.
            backgroundColor: 'transparent',
            borderColor: stock.color,
            borderWidth: 2
          };
        })
      },

      // Disable animation and the legend.
      options: {
        animation: {
          duration: 0
        },
        legend: {
          display: false
        }
      }
    };

    // Create the chart.
    const context = this.stockChart.nativeElement.getContext('2d');
    this.chart = new ChartJS.Chart(
      context, chartConfig
    );
  }

  addStock (stock: Stock) {
    // Add the stock as a new dataset.
    this.chart.data.datasets.push({
      label: stock.symbol,
      data: new Array(SESSION_COUNT - stock.sessions.length).fill(0).concat(
        stock.sessions.map(s => s.close)
      ),
      backgroundColor: 'transparent',
      borderColor: stock.color,
      borderWidth: 1
    });

    if (stock.sessions.length > this.maxSessionCount) {
      this.chart.data.labels = new Array(SESSION_COUNT - stock.sessions.length).fill('.').concat(
        stock.sessions.map(s => s.date)
      );
    }

    this.chart.update(0);
  }

  removeStock (symbol: string) {
    for (let i = 0; i < this.chart.data.datasets.length; ++i) {
      if (this.chart.data.datasets[i].label === symbol) {
        this.chart.data.datasets.splice(i, 1);
        this.chart.update(0);
        return;
      }
    }
  }

  updateStock (symbol: string, sessions: Session[]) {
    for (let i = 0; i < this.chart.data.datasets.length; ++i) {
      if (this.chart.data.datasets[i].label === symbol) {
        this.chart.data.datasets[i].data = new Array(SESSION_COUNT - sessions.length).fill(0).concat(
          sessions.map(s => s.close)
        );
        this.chart.update(0);
        return;
      }
    }
  }

}
