// src/signalRConnection.js
import * as signalR from '@microsoft/signalr';

let connection;

export const createConnection = (roomId) => {
    const connection = new signalR.HubConnectionBuilder()
    .withUrl(`https://localhost:7153/gameSessionHub?roomId=${roomId}`)  
    .withAutomaticReconnect()
    .build();
  

    return connection;
};

export const getConnection = () => connection;
