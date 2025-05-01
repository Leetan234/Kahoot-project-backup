import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Layout, Row, Col, Card, Avatar, Button, List, Typography, message } from 'antd';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { useNavigate, useParams } from 'react-router-dom';

const { Content } = Layout;
const { Text } = Typography;

const TeamLobbyHostPage = () => {
  const navigate = useNavigate();
  const { gamePin } = useParams();
  const connectionRef = useRef(null);

  const [sessionId, setSessionId] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [teams, setTeams] = useState([]);

  // Fetch sessionId by gamePin
  useEffect(() => {
    if (!gamePin) return;
    axios
      .get(`https://localhost:7153/api/gamesession/GetGameSessionWithPin/${gamePin}`)
      .then(res => {
        if (res.data?.statusCode === 200) {
          setSessionId(res.data.data.sessionId);
        } else {
          message.error('Cannot fetch session info');
        }
      })
      .catch(() => message.error('Cannot fetch session info'));
  }, [gamePin]);

  // Fetch teams and players
  const fetchAll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await axios.get(
        `https://localhost:7153/api/team/GetTeamsBySessionId/${sessionId}`
      );
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      const teamsWithPlayers = await Promise.all(
        data.map(async team => {
          try {
            const pr = await axios.get(
              `https://localhost:7153/api/team/GetPlayersByTeamId/${team.teamId}`
            );
            const list = Array.isArray(pr.data)
              ? pr.data
              : Array.isArray(pr.data?.data)
                ? pr.data.data
                : [];
            return { ...team, players: list };
          } catch {
            return { ...team, players: [] };
          }
        })
      );
      setTeams(teamsWithPlayers);
    } catch (err) {
      console.error('Fetch teams error:', err);
      message.error('Không thể tải danh sách đội');
    }
  }, [sessionId]);

  // Polling mỗi 5s
  useEffect(() => {
    fetchAll();
    const intervalId = setInterval(fetchAll, 5000);
    return () => clearInterval(intervalId);
  }, [fetchAll]);

  // Setup SignalR connection khi có sessionId
  useEffect(() => {
    if (!sessionId) return;
    const connect = async () => {
      const conn = new HubConnectionBuilder()
        .withUrl(
          'https://localhost:7153/gameSessionHub',
          { skipNegotiation: true, transport: HttpTransportType.WebSockets }
        )
        .withAutomaticReconnect()
        .build();

      conn.on('Error', err => message.error(err));

      try {
        await conn.start();
        connectionRef.current = conn;
      } catch (err) {
        console.error('SignalR connection failed:', err);
        message.error('Không thể kết nối tới server.');
      }
    };
    connect();
    return () => connectionRef.current?.stop();
  }, [sessionId]);

  // Tạo team mới
  const handleCreateTeam = async () => {
    if (!sessionId) {
      message.warning('Session ID chưa thiết lập.');
      return;
    }
    const name = window.prompt('Enter new team name');
    if (!name) return;

    try {
      const { data: newTeam } = await axios.post(
        'https://localhost:7153/api/team/CreateTeam',
        { sessionId, name }
      );
      setTeams(prev => [...prev, { ...newTeam, players: [] }]);
      message.success(`Team "${newTeam.name}" created!`);
    } catch (err) {
      console.error('Failed to create team:', err);
      message.error('Tạo đội thất bại.');
    }
  };

  // Bắt đầu game
  const handleStart = async () => {
    if (!sessionId) {
      message.error('Session ID chưa thiết lập.');
      return;
    }
    const totalPlayers = teams.reduce((sum, team) => sum + (team.players?.length || 0), 0);
    if (totalPlayers < 1) {
      message.error('Cần ít nhất 1 người chơi để bắt đầu.');
      return;
    }

    try {
      await connectionRef.current.invoke('StartGameSession', parseInt(sessionId, 10));
      message.success('Game is starting!');

      const res = await axios.get(
        `https://localhost:7153/api/game-sessions/${sessionId}/questions-in-game`
      );
      if (res.data?.statusCode === 200) {
        const first = res.data.data.find(q => q.orderIndex === 1);
        if (first) {
          navigate(`/HostQuestionPage/${sessionId}/${first.questionInGameId}`);
        } else {
          message.error('Không tìm thấy câu hỏi đầu tiên!');
        }
      } else {
        message.error('Không thể tải danh sách câu hỏi.');
      }
    } catch (err) {
      console.error('Failed to start game:', err);
      message.error('Bắt đầu game thất bại.');
    }
  };

  return (
    <Layout style={{ height: '100vh', background: '#864cbf' }}>
      <div className="header-container" style={{ padding: '16px', background: '#864cbf' }}>
        <div className="pin-header">
          <span className="pin-text" style={{ color: '#000', fontSize: '16px' }}>
            Join at <b>www.kahoot.it</b> with Game PIN: <b>{gamePin}</b>
          </span>
        </div>
      </div>
      <div className="title-bar" style={{ textAlign: 'center', padding: '8px 0', background: '#864cbf' }}>
        <h1 className="logo" style={{ color: 'White', margin: 0 }}>QUIZZZZ!</h1>
      </div>
      <Content style={{ padding: 24 }}>
        <Row justify="space-between" style={{ marginBottom: 16 }}>
          <Text style={{ color: '#fff' }}>Total teams: {teams.length}</Text>
          <Button type="dashed" onClick={handleCreateTeam}>
            Create Team
          </Button>
        </Row>
        <Row gutter={[16, 16]}>
          {teams.map(team => (
            <Col key={team.teamId} xs={12} sm={8} md={6} lg={4}>
              <Card style={{ textAlign: 'center', background: 'rgba(255,255,255,0.2)' }} bodyStyle={{ padding: 16 }}>
                <Avatar size={64} style={{ backgroundColor: team.color }}>
                  <span style={{ fontSize: 32 }}>{team.icon}</span>
                </Avatar>
                <div style={{ marginTop: 12, fontWeight: 'bold', color: '#000' }}>
                  {team.name}
                </div>
                {team.players && team.players.length > 0 ? (
                  <List
                    size="small"
                    dataSource={team.players}
                    renderItem={item => (
                      <List.Item style={{ border: 0, padding: '4px 0' }}>
                        <Text>{item.nickname}</Text>
                      </List.Item>
                    )}
                    style={{ marginTop: 8 }}
                  />
                ) : (
                  <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>No players</Text>
                )}
              </Card>
            </Col>
          ))}
        </Row>
        <Row justify="center" style={{ marginTop: 24 }}>
          <Button type="primary" onClick={handleStart} disabled={isStarted}>
            {isStarted ? 'Game Started' : 'Start Game'}
          </Button>
        </Row>
      </Content>
    </Layout>
  );
};

export default TeamLobbyHostPage;
