import React, { useState } from 'react';
import { Input, Button, Layout, ConfigProvider, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../EnterRoom/EnterRoom.css';

const { Content } = Layout;

const EnterroomPage = () => {
  const [gamePin, setGamePin] = useState('');
  const [nickname, setNickname] = useState('');
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [gameMode, setGameMode] = useState('solo'); // default fallback
  const navigate = useNavigate();

  const handleEnter = async () => {
    if (!gamePin) {
      message.warning('Vui lòng nhập Game PIN!');
      return;
    }

    try {
      const response = await axios.get(
        `https://localhost:7153/api/gamesession/GetGameSessionWithPin/${gamePin}`
      );

      if (response.data?.statusCode === 200 && response.data?.data) {
        const { sessionId: fetchedSessionId, gameMode: fetchedMode } = response.data.data;
        setSessionId(fetchedSessionId);
        setGameMode(fetchedMode);
        setIsNameModalVisible(true);
      } else {
        message.error('Không tìm thấy game với PIN này!');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      message.error('Có lỗi xảy ra khi lấy thông tin game!');
    }
  };

  const handleNameModalOk = () => {
    if (!nickname) {
      message.warning('Vui lòng nhập tên người chơi!');
      return;
    }

    if (!sessionId) {
      message.error('Không có sessionId hợp lệ!');
      return;
    }

    setIsNameModalVisible(false);
    // Navigate based on gameMode
    if (gameMode === 'solo') {
      navigate(`/lobby/${gamePin}`, { state: { gamePin, nickname, sessionId } });
    } else {
      navigate(`/teamlobby/${gamePin}`, { state: { gamePin, nickname, sessionId } });
    }
  };

  const handleNameModalCancel = () => {
    setIsNameModalVisible(false);
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#5a0fcd' } }}>
      <Layout className="kahoot-layout">
        <div className="centered-content">
          <h1 className="logo">QUIZZZZ!</h1>

          <div className="kahoot-box">
            <Input
              placeholder="Game PIN"
              size="large"
              className="pin-input"
              value={gamePin}
              onChange={(e) => setGamePin(e.target.value)}
            />
            <Button
              type="primary"
              size="large"
              block
              className="enter-button"
              onClick={handleEnter}
            >
              Enter
            </Button>
          </div>
        </div>
      </Layout>

      <Modal
        title="Nhập Tên Người Chơi"
        open={isNameModalVisible}
        onOk={handleNameModalOk}
        onCancel={handleNameModalCancel}
        okText="Tham gia"
        cancelText="Hủy"
      >
        <Input
          placeholder="Nhập tên người chơi"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </Modal>
    </ConfigProvider>
  );
};

export default EnterroomPage;
