///
/// @file   socket.service.ts
/// @brief  The service in charge of our Socket.IO client.
///

import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';

@Injectable()
export class SocketService {

  private client: SocketIOClient.Socket;

  constructor() {
    this.client = io();
  }

  ///
  /// @fn     on
  /// @brief  Adds a new event listener.
  ///
  /// @param  {string} id The string ID of the event.
  /// @param  {function} callback The callback function to run when the event is fired.
  ///
  on (id: string, callback: (data: object) => void) {
    this.client.on(id, callback);
  }

  ///
  /// @fn     clear
  /// @brief  Clears all socket event listeners.
  ///
  clear () {
    this.client.removeAllListeners();
  }

}