// src/signalRConnection.js
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export const createConnection = (sessionId, onStatusChange) => {
  const connection = new HubConnectionBuilder()
    .withUrl('https://localhost:7153/gameSessionHub')
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: retryContext => {
        console.warn(`⚡ Retry attempt #${retryContext.previousRetryCount + 1}`);
        return 5000;
      }
    })
    .configureLogging(LogLevel.Information)
    .build();

  connection.onreconnecting(error => {
    console.warn('🔄 SignalR reconnecting...', error);
    onStatusChange && onStatusChange('reconnecting');
  });

  connection.onreconnected(connectionId => {
    console.log('✅ SignalR reconnected!', connectionId);
    onStatusChange && onStatusChange('connected');
  });

  connection.onclose(error => {
    if (error) {
      console.error('❌ SignalR closed with error:', error);
    } else {
      console.warn('⚠️ SignalR closed normally.');
    }
    onStatusChange && onStatusChange('disconnected');
  });
  
  return connection;
};
