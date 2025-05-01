import React, { useState, useEffect, useRef } from 'react';
import { Layout, Row, Col, Card, Avatar, Button, message, Modal } from 'antd';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../Lobby/Lobby.css';

const { Content } = Layout;

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

  // 2) SignalR setup
  useEffect(() => {
    if (!gamePin || !nickname) return;

    const connection = new HubConnectionBuilder()
      .withUrl('https://localhost:7153/gameSessionHub', {
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

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

    connection.onreconnected(async () => {
      if (hasJoinedRef.current) {
        try {
          await connection.invoke('JoinGameSession', gamePin, nickname);
        } catch (e) {
          console.error('Re-join failed', e);
        }
      }
    });

    connection.on('Error', err => message.error(err));
    connection.on('JoinedGame', data => {
      localStorage.setItem('playerId', data.playerId);
    });

    const startAndJoin = async () => {
      try {
        await connection.start();
        await connection.invoke('JoinGameSession', gamePin, nickname);
        hasJoinedRef.current = true;
      } catch (e) {
        message.error('Cannot connect or join game');
      }
    };

    startAndJoin();
    connectionRef.current = connection;

    return () => connection.stop();
  }, [gamePin, nickname, navigate]);

  // 3) Poll players
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
    <Layout style={{ height: '100vh', background: '#864cbf' }}>
      {/* Header */}
      <div className="header-container" style={{ padding: '16px', background: '#864cbf' }}>
        <div className="pin-header">
          <span className="pin-text" style={{ color: '#000', fontSize: '16px' }}>
            Join at <b>www.kahoot.it</b> with Game PIN: <b>{gamePin}</b>
          </span>
        </div>
      </div>
      {/* Title */}
      <div className="title-bar" style={{ textAlign: 'center', padding: '8px 0', background: '#864cbf' }}>
        <h1 className="logo" style={{ color: 'White', margin: 0 }}>QUIZZZZ!</h1>
      </div>

      <Content style={{ padding: '24px' }}>
        <Row justify="end" style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ visibility: 'hidden' }} />
        </Row>

        {/* Player Grid */}
        <Row gutter={[16, 16]}>
          {players.map(p => (
            <Col key={p.playerId} xs={12} sm={8} md={6} lg={4}>
              <Card style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.1)' }}>
                <Avatar size={64} style={{ backgroundColor: '#95A5A6', verticalAlign: 'middle' }}>
                  {p.nickname.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ marginTop: 12, color: '#000' }}>
                  {p.nickname}
                </div>
              </Card>
            </Col>
          ))}
          {!players.length && (
            <Col span={24} style={{ textAlign: 'center', color: '#000' }}>
              No players yet!
            </Col>
          )}
        </Row>
      </Content>

      {/* New Player Modal */}
      <Modal
        title="New Player Joined"
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
      >
        <p>New player joined: {newPlayer?.nickname}</p>
      </Modal>
    </Layout>
  );
};

export default Lobby;
