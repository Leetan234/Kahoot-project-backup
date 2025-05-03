import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Layout, Row, Col, Card, Avatar, List, Typography, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';

const { Content } = Layout;
const { Text } = Typography;

const TeamLobbyPage = () => {
  const { state } = useLocation();
  const [gamePin] = useState(state?.gamePin || '');
  const [nickname] = useState(state?.nickname || '');
  const [sessionId, setSessionId] = useState(null);
  const [teams, setTeams] = useState([]);          // mỗi phần tử: { teamId, name, players: [...] }
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const connectionRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const navigate = useNavigate();

  // --- SignalR setup (unchanged) ---
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
      
    connection.onreconnected(async () => {
      if (hasJoinedRef.current) {
        await connection.invoke('JoinGameSession', gamePin, nickname);
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
      } catch {
        message.error('Cannot connect or join game');
      }
    };
    startAndJoin();
    connectionRef.current = connection;
    return () => connection.stop();
  }, [gamePin, nickname, navigate]);

  // Lấy sessionId từ gamePin
  useEffect(() => {
    if (!gamePin) return;
    axios.get(`https://localhost:7153/api/gamesession/GetGameSessionWithPin/${gamePin}`)
      .then(res => {
        if (res.data?.statusCode === 200 && res.data.data?.sessionId) {
          setSessionId(res.data.data.sessionId);
        } else {
          message.error('Không lấy được thông tin phiên chơi');
        }
      })
      .catch(() => message.error('Không lấy được thông tin phiên chơi'));
  }, [gamePin]);

  // Hàm fetch teams + players
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

  // Chọn team và gọi AddPlayerToTeam
  const handleTeamSelect = async team => {
    // nếu đã chọn rồi thì không cho chọn thêm
    if (selectedTeamId) {
      message.warning('Bạn chỉ được chọn 1 đội duy nhất.');
      return;
    }

    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      message.error('Không tìm thấy playerId');
      return;
    }

    try {
      // Gọi API thêm player vào team
      await axios.post(
        `https://localhost:7153/api/team/AddPlayerToTeam/${team.teamId}?playerId=${playerId}`
      );
      // Cập nhật UI
      setSelectedTeamId(team.teamId);
      message.success(`Bạn đã tham gia đội "${team.name}"`);
      // Refresh lại danh sách players ngay lập tức
      await fetchAll();
    } catch (err) {
      console.error('Add to team error', err);
      message.error('Không thể thêm bạn vào đội');
    }
  };

  const selectedTeam = teams.find(t => t.teamId === selectedTeamId);

  return (
    <Layout style={{ height: '100vh', background: '#864cbf' }}>
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

      <Content style={{ padding: 24 }}>
        {selectedTeam && (
          <div style={{ marginBottom: 16, color: '#fff' }}>
            Đội bạn: <b>{selectedTeam.name}</b>
          </div>
        )}

        {/* Team Cards */}
        <Row gutter={[16, 16]}>
          {teams.map(team => {
            const isActive = team.teamId === selectedTeamId;
            return (
              <Col key={team.teamId} xs={12} sm={8} md={6} lg={4}>
                <Card
                  hoverable={selectedTeamId === null}
                  onClick={selectedTeamId === null ? () => handleTeamSelect(team) : undefined}
                  style={{
                    textAlign: 'center',
                    background: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                    border: isActive ? '2px solid #1890ff' : 'none'
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Avatar size={64} style={{ backgroundColor: '#fff', color: '#000' }}>
                    {team.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ marginTop: 12, fontWeight: 'bold', color: '#000' }}>
                    {team.name}
                  </div>
                  {team.players?.length > 0 ? (
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
                    <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                      No players
                    </Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Content>
    </Layout>
  );
};

export default TeamLobbyPage;
