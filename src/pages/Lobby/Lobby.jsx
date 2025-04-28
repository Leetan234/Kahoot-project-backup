import React, { useState, useEffect, useRef } from 'react';
import { List, Card, message, Modal } from 'antd';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../Lobby/Lobby.css';

const Lobby = () => {
  const { state } = useLocation();
  const [gamePin] = useState(state?.gamePin || '');
  const [nickname] = useState(state?.nickname || '');
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const connectionRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const prevPlayersRef = useRef([]);
  const navigate = useNavigate();

  // 1) Lấy sessionId
  useEffect(() => {
    if (!gamePin) return;
    axios
      .get(`https://localhost:7153/api/gamesession/GetGameSessionWithPin/${gamePin}`)
      .then(res => {
        if (res.data?.statusCode === 200) {
          setSessionId(res.data.data.sessionId);
        } else {
          message.error('Cannot fetch session ID');
        }
      })
      .catch(() => message.error('Cannot fetch session ID'));
  }, [gamePin]);

  useEffect(() => {
    if (!gamePin || !nickname) return;

    const connection = new HubConnectionBuilder()
      .withUrl('https://localhost:7153/gameSessionHub', {
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    // khi server emit GameStarted
    connection.on('GameStarted', async startedSessionId => {
      try {
        const res = await axios.get(
          `https://localhost:7153/api/game-sessions/${startedSessionId}/questions-in-game`
        );
        if (res.data?.statusCode === 200) {
          const first = res.data.data.find(q => q.orderIndex === 1);
          if (first) {
            navigate(`/QuestionPage/${startedSessionId}/${first.questionInGameId}`);
          } else {
            message.error('No first question found!');
          }
        } else {
          message.error('Cannot fetch questions!');
        }
      } catch {
        message.error('Failed to fetch first question.');
      }
    });

    // reconnect xong thì re-join
    connection.onreconnected(async () => {
      if (hasJoinedRef.current) {
        try {
          await connection.invoke('JoinGameSession', gamePin, nickname);
          console.log('Re-joined after reconnect');
        } catch (e) {
          console.error('Re-join failed', e);
        }
      }
    });

    // bắt lỗi từ server
    connection.on('Error', err => message.error(err));

   
    connection.on('JoinedGame', (data) => {
      console.log('Joined game successfully:', data);
      localStorage.setItem('playerId', data.playerId);
    });

    // khởi động và join
    const startAndJoin = async () => {
      try {
        await connection.start();
        console.log('SignalR connected');
        await connection.invoke('JoinGameSession', gamePin, nickname);
        hasJoinedRef.current = true;
        console.log('JoinedGameSession');
      } catch (e) {
        console.error('Start/Join error', e);
        message.error('Cannot connect or join game');
      }
    };

    startAndJoin();
    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [gamePin, nickname, navigate]);
  // 3) Poll players mỗi 3s
  useEffect(() => {
    if (!sessionId) return;
    const fetchPlayers = async () => {
      try {
        const res = await axios.get(
          `https://localhost:7153/api/sessions/${sessionId}/players`
        );
        if (res.data?.statusCode === 200) {
          const list = res.data.data;
          const newbies = list.filter(p =>
            !prevPlayersRef.current.some(x => x.playerId === p.playerId)
          );
          if (newbies.length) {
            setNewPlayer(newbies[0]);
            setIsModalVisible(true);
            message.success(`New player joined: ${newbies[0].nickname}`);
          }
          setPlayers(list);
          prevPlayersRef.current = list;
        }
      } catch (err) {
        console.error('Error fetching players', err);
      }
    };

    fetchPlayers();
    const id = setInterval(fetchPlayers, 3000);
    return () => clearInterval(id);
  }, [sessionId]);

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
        {players.length > 0 ? (
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
        ) : (
          <p>No players yet!</p>
        )}
      </div>

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

export default Lobby;
