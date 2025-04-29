import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Typography, List, message, Button } from 'antd';
import { CrownFilled } from '@ant-design/icons';
import axios from 'axios';
import { HubConnectionBuilder, HttpTransportType, LogLevel, HubConnectionState } from '@microsoft/signalr';
import './Leaderboard.css';
import CustomModal from './CustomModal'; // Import the custom modal

const { Title, Text } = Typography;

const medalIcons = {
  1: <CrownFilled style={{ color: '#FFD700', fontSize: 24 }} />,
  2: <CrownFilled style={{ color: '#C0C0C0', fontSize: 24 }} />,
  3: <CrownFilled style={{ color: '#cd7f32', fontSize: 24 }} />,
};

const Leaderboard = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [hubConnection, setHubConnection] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false); // Modal visibility state
  const [modalContent, setModalContent] = useState(''); // Modal content

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(
          `https://localhost:7153/api/gamesession/GetLeaderboard/${sessionId}`
        );
        setPlayers(res.data.data);
      } catch (err) {
        console.error('[fetchLeaderboard] Error:', err);
        message.error('Không thể tải bảng điểm');
      }
    };

    const conn = new HubConnectionBuilder()
      .withUrl(`https://localhost:7153/gameSessionHub`, {
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    conn.start()
      .then(() => {
        console.log('[SignalR] Connected');
        // Đăng ký sự kiện lắng nghe từ server
        conn.on('ReceiveNextQuestion', (data) => {
          console.log('[ReceiveNextQuestion] Data:', data);
          navigate(`/QuestionPage/${data.sessionId}/${data.qigId}`);
        });
      })
      .catch((err) => {
        console.error('[SignalR] Connect Error:', err);
        message.error('Không thể kết nối đến server');
      });

    setHubConnection(conn);

    if (sessionId) fetchLeaderboard();

    return () => {
      if (conn.state === HubConnectionState.Connected) {
        conn.stop();
        console.log('[SignalR] Connection stopped');
      }
    };
  }, [sessionId]);

  const handleNextClick = async () => {
    if (!hubConnection || hubConnection.state !== HubConnectionState.Connected) {
      message.error('Chưa kết nối server');
      return;
    }

    const qigStr = localStorage.getItem('QuestionInGame');
    if (!qigStr) {
      message.error('Không có QuestionInGame');
      return;
    }

    const qigId = parseInt(qigStr, 10);
    if (isNaN(qigId)) {
      message.error('QuestionInGame không hợp lệ');
      return;
    }

    try {
      console.log('[handleNextClick] Gọi NextQuestion:', sessionId, qigId);
      await hubConnection.invoke('NextQuestion', parseInt(sessionId, 10), qigId);

      const res = await axios.get(`https://localhost:7153/api/game-sessions/${sessionId}/questions-in-game`);
      console.log('[handleNextClick] API response:', res.data);
  
      // Extract the questions array from the response data
      const questions = Array.isArray(res.data.data) ? res.data.data : [];
  
      if (questions.length === 0) {
        message.error('Không có câu hỏi nào trong game');
        return;
      }
  
      // Find the current question in the list
      const currentQuestion = questions.find(q => q.questionInGameId === qigId);
      if (!currentQuestion) {
        message.error('Không tìm thấy câu hỏi hiện tại');
        return;
      }
  
      // Find the next question with a larger orderIndex
      const nextQuestion = questions
        .filter(q => q.orderIndex > currentQuestion.orderIndex)
        .sort((a, b) => a.orderIndex - b.orderIndex)[0];
  
      console.log('Next question:', nextQuestion);

      if (nextQuestion) {
        // Navigate to the next question page
        navigate(`/HostQuestionPage/${sessionId}/${nextQuestion.questionInGameId}`);
      } else {
        // If no next question, show modal to confirm end game
        setModalContent('Đã hết câu hỏi. Bạn có muốn kết thúc trò chơi không?');
        setModalVisible(true); // Show custom modal
      }
    } catch (err) {
      console.error('[handleNextClick] Error:', err);
      message.error('Lỗi khi tải câu hỏi tiếp theo');
    }
  };

  const handleModalConfirm = async () => {
    console.log('Game Ended');
  
    // Check if hubConnection is established
    if (!hubConnection || hubConnection.state !== HubConnectionState.Connected) {
      message.error('Chưa kết nối server');
      return;
    }
  
    try {
      // Log the sessionId to confirm it's correct
      console.log('SessionId:', sessionId);
  
      // Make the call to the server to end the game
      await hubConnection.invoke('EndGameSession', parseInt(sessionId, 10));
  
      // Close the modal after the confirmation
      setModalVisible(false);
      message.success('Game ended successfully');
    } catch (err) {
      console.error('Error calling EndGameSession:', err);
      message.error('Failed to end game');
    }
  };

  const handleModalClose = () => {
    console.log('Game continues');
    setModalVisible(false); // Close the modal
  };

  return (
    <div className="leaderboard-wrapper">
      <div className="done-button-wrapper">
        <Button className="done-button" onClick={handleNextClick}>
          Next
        </Button>
      </div>
      <Title level={2} className="leaderboard-title" style={{ color: 'white' }}>
        Leaderboard
      </Title>
      <List
        itemLayout="horizontal"
        dataSource={players}
        renderItem={(item) => (
          <List.Item className="leader-item">
            <Row align="middle" style={{ width: '100%' }}>
              <Col flex="auto" className="leader-info">
                <Col flex="2px" className="leader-rank">
                  {medalIcons[item.rank] || <Text strong>{item.ranking}</Text>}
                </Col>
                <div className="leader-name">{item.nickname}</div>
                <div className="leader-score">{item.score}</div>
              </Col>
            </Row>
          </List.Item>
        )}
      />
      <CustomModal
        isVisible={isModalVisible}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        content={modalContent}
      />
    </div>
  );
};

export default Leaderboard;
