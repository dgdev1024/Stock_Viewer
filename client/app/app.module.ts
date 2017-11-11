import { BrowserModule } from '@angular/platform-browser';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { SocketService } from './services/socket.service';
import { StockService } from './services/stock.service';
import { AddStockComponent } from './components/add-stock/add-stock.component';
import { StockViewComponent } from './components/stock-view/stock-view.component';
import { StockCardComponent } from './components/stock-card/stock-card.component';
import { StockChartComponent } from './components/stock-chart/stock-chart.component';

@NgModule({
  declarations: [
    AppComponent,
    AddStockComponent,
    StockViewComponent,
    StockCardComponent,
    StockChartComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [SocketService, StockService],
  bootstrap: [AppComponent]
})
export class AppModule { }
