import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, List, Card, message, Modal } from 'antd';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Host.css';

const { Title } = Typography;

const Host = () => {
  const { gamePin } = useParams();
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const connectionRef = useRef(null);
  const prevPlayersRef = useRef([]);
  const navigate = useNavigate();

  // Fetch sessionId by gamePin
  useEffect(() => {
    if (!gamePin) return;
    axios.get(`https://localhost:7153/api/gamesession/GetGameSessionWithPin/${gamePin}`)
      .then(res => {
        if (res.data?.statusCode === 200) {
          setSessionId(res.data.data.sessionId);
        } else {
          message.error('Cannot fetch session info');
        }
      })
      .catch(err => {
        console.error('Error fetching session:', err);
        message.error('Cannot fetch session info');
      });
  }, [gamePin]);

  // Setup SignalR connection
  useEffect(() => {
    const connectToHub = async () => {
      const connection = new HubConnectionBuilder()
        .withUrl('https://localhost:7153/gameSessionHub', {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .build();

      connection.on('Error', (error) => {
        message.error(error);
      });

      try {
        await connection.start();
        connectionRef.current = connection;
        console.log('Host connected to SignalR!');
      } catch (error) {
        console.error('Connection error:', error);
        message.error('Cannot connect to server');
      }
    };

    connectToHub();
    return () => { connectionRef.current?.stop(); };
  }, []);

  // Poll players every 3s
  useEffect(() => {
    if (!sessionId) return;
    const fetchPlayers = async () => {
      try {
        const res = await axios.get(`https://localhost:7153/api/sessions/${sessionId}/players`);
        if (res.data?.statusCode === 200) {
          const fetched = res.data.data;
          const news = fetched.filter(p => !prevPlayersRef.current.some(x => x.playerId === p.playerId));
          if (news.length) {
            setNewPlayer(news[0]);
            setIsModalVisible(true);
            message.success(`New player joined: ${news[0].nickname}`);
          }
          setPlayers(fetched);
          prevPlayersRef.current = fetched;
        }
      } catch (err) {
        console.error('Error fetching players:', err);
      }
    };

    fetchPlayers();
    const id = setInterval(fetchPlayers, 3000);
    return () => clearInterval(id);
  }, [sessionId]);

  // Start game
  const handleStartGame = async () => {
    if (!sessionId || !connectionRef.current) {
      message.error('Session not ready or not connected');
      return;
    }
    if (players.length < 1) {
      message.error('Need at least 1 player to start');
      return;
    }
    try {
      await connectionRef.current.invoke('StartGameSession', parseInt(sessionId, 10));
      setIsStarted(true);
      message.success('Game is starting!');

      const res = await axios.get(`https://localhost:7153/api/game-sessions/${sessionId}/questions-in-game`);
      if (res.data?.statusCode === 200) {
        const first = res.data.data.find(q => q.orderIndex === 1);
        if (first) navigate(`/HostQuestionPage/${sessionId}/${first.questionInGameId}`);
        else message.error('No first question found!');
      } else message.error('Cannot fetch questions!');
    } catch (err) {
      console.error('Error starting game:', err);
      message.error('Failed to start the game');
    }
  };

  return (
    <div className="lobby-container">
      <div className="header-container">
        <div className="pin-header">
          <span className="pin-text">
            Join at <b>www.kahoot.it</b> with Game PIN: <b>{gamePin}</b>
          </span>
        </div>
      </div>
      <div className="title-bar">
        <h1 className="logo">QUIZZZZ!</h1>
      </div>
      <div className="player-list">
        {players.length ? (
          <List
            grid={{ gutter: 1600, column: 8 }}
            dataSource={players}
            renderItem={p => (
              <List.Item key={p.playerId}>
                <Card className="player-card">
                  <span className="nickname">{p.nickname}</span>
                </Card>
              </List.Item>
            )}
          />
        ) : <p>No players yet!</p>}
      </div>

      <Button
        className="custom-button"
        onClick={handleStartGame}
        disabled={isStarted || players.length < 1}
        style={{ marginTop: 20 }}
      >
        {isStarted ? 'Game Started' : 'Start Game'}
      </Button>

      <Modal
        title="New Player Joined"
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
      >
        <p>New player joined: {newPlayer?.nickname}</p>
      </Modal>
    </div>
  );
};

export default Host;
