///
/// @file   stock.ts
/// @brief  Interfaces for our watch stocks and session datas.
///

///
/// @interface  Session
/// @brief      Contains data on a given trading session.
///
export interface Session {
    date: string,
    close: number,
    high: number,
    low: number,
    change: number
}

///
/// @interface  Stock
/// @brief      Contains recent session data on a given stock.
///
export interface Stock {
    symbol: string,
    change: number,
    sessions: Session[],
    color?: string
}
