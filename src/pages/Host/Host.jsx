import React, { useState, useEffect, useRef } from 'react';
import { Layout, Row, Col, Card, Avatar, Button, Typography, message, Modal } from 'antd';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Host.css';

const { Content } = Layout;
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
      .catch(() => message.error('Cannot fetch session info'));
  }, [gamePin]);

  // Setup SignalR
  useEffect(() => {
    const connect = async () => {
      const conn = new HubConnectionBuilder()
        .withUrl('https://localhost:7153/gameSessionHub', { skipNegotiation: true, transport: HttpTransportType.WebSockets })
        .withAutomaticReconnect()
        .build();

      conn.on('Error', err => message.error(err));
      try {
        await conn.start();
        connectionRef.current = conn;
      } catch {
        message.error('Cannot connect to server');
      }
    };
    connect();
    return () => connectionRef.current?.stop();
  }, []);

  // Poll players
  useEffect(() => {
    if (!sessionId) return;
    const fetchPlayers = async () => {
      try {
        const res = await axios.get(`https://localhost:7153/api/sessions/${sessionId}/players`);
        if (res.data?.statusCode === 200) {
          const list = res.data.data;
          const newbies = list.filter(p => !prevPlayersRef.current.some(x => x.playerId === p.playerId));
          if (newbies.length) {
            setNewPlayer(newbies[0]);
            setIsModalVisible(true);
            message.success(`New player joined: ${newbies[0].nickname}`);
          }
          setPlayers(list);
          prevPlayersRef.current = list;
        }
      } catch {}
    };
    fetchPlayers();
    const id = setInterval(fetchPlayers, 3000);
    return () => clearInterval(id);
  }, [sessionId]);

  // Start game
  const handleStart = async () => {
    if (!sessionId || !connectionRef.current) return;
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
      }
    } catch {
      message.error('Failed to start the game');
    }
  };

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
        <Row justify="center" gutter={[16, 16]}>
          {players.map(p => (
            <Col key={p.playerId} xs={12} sm={8} md={6} lg={4}>
              <Card style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)' }}>
                <Avatar size={64} style={{ backgroundColor: '#95A5A6' }}>
                  {p.nickname.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ marginTop: 12, color: '#000' }}>{p.nickname}</div>
              </Card>
            </Col>
          ))}
          {!players.length && (
            <Col span={24} style={{ textAlign: 'center', color: '#000' }}>
              No players yet!
            </Col>
          )}
        </Row>
        <Row justify="center" style={{ marginTop: 24 }}>
          <Button type="primary" onClick={handleStart} disabled={isStarted || players.length < 1}>
            {isStarted ? 'Game Started' : 'Start Game'}
          </Button>
        </Row>
      </Content>
      <Modal title="New Player Joined" open={isModalVisible} onOk={() => setIsModalVisible(false)} onCancel={() => setIsModalVisible(false)}>
        <p>New player joined: {newPlayer?.nickname}</p>
      </Modal>
    </Layout>
  );
};

export default Host;
