import React, { useState } from 'react';
import { Input, Button, Layout, ConfigProvider, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios'; // Import axios
import '../EnterRoom/EnterRoom.css';

const { Content } = Layout;

const EnterroomPage = () => {
  const [gamePin, setGamePin] = useState('');
  const [nickname, setNickname] = useState('');
  const [isNameModalVisible, setIsNameModalVisible] = useState(false); // Modal nhập tên người chơi
  const [sessionId, setSessionId] = useState(null); // Lưu sessionId
  const navigate = useNavigate(); // Dùng hook để điều hướng đến lobby
  

  const fetchSessionId = async (pin) => {
    try {
      // Gửi yêu cầu lấy thông tin game session với game pin
      const response = await axios.get(`https://localhost:7153/api/gamesession/GetGameSessionWithPin/${pin}`);
  
      if (response.data?.statusCode === 200 && response.data?.data) {
        // Lấy sessionId và các thông tin khác từ dữ liệu trả về
        const { sessionId, quizId, status, pin, enableSpeedBonus, enableStreak, gameMode, maxPlayers, autoAdvance, showLeaderboard, loadingInGame } = response.data.data;
  
        // Lưu sessionId vào state
        setSessionId(sessionId);
  
        // Lưu các thông tin khác (nếu cần)
        console.log('Game session details:', {
          sessionId,
          quizId,
          status,
          pin,
          enableSpeedBonus,
          enableStreak,
          gameMode,
          maxPlayers,
          autoAdvance,
          showLeaderboard,
          loadingInGame
        });
  
      } else {
        message.error('Không tìm thấy game với PIN này!');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      message.error('Có lỗi xảy ra khi lấy thông tin game!');
    }
  };
  

  const handleEnter = async () => {
    if (!gamePin) {
      message.warning('Vui lòng nhập Game PIN!');
      return;
    }
  
    // Lấy sessionId từ API
    await fetchSessionId(gamePin);
  
    if (sessionId) {
      // Hiển thị modal để nhập tên người chơi
      setIsNameModalVisible(true);
    }
  };
  
  const handleNameModalOk = async () => {
    if (!nickname) {
      message.warning('Vui lòng nhập tên người chơi!');
      return;
    }
  
    if (!sessionId) {
      message.error('Không có sessionId hợp lệ!');
      return;
    }
  
    try {
      const response = await axios.post('https://localhost:7153/api/player/CreatePlayer', {
        sessionId: sessionId, // Sử dụng sessionId lấy từ API
        nickname: nickname,
      });
      console.log('Player created:', response.data);
  
      setIsNameModalVisible(false);
      // Chuyển hướng đến lobby với gamePin và nickname
      navigate(`/lobby/${gamePin}`, { state: { gamePin, nickname } });
    } catch (error) {
      console.error('Error creating player:', error);
      message.error('Đã có lỗi xảy ra: ' + (error.response ? error.response.data : error.message));
    }
  };
  

  // Xử lý khi đóng modal
  const handleNameModalCancel = () => {
    setIsNameModalVisible(false); // Đóng modal
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
              onChange={(e) => setGamePin(e.target.value)} // Cập nhật giá trị Game PIN
            />
            <Button
              type="primary"
              size="large"
              block
              className="enter-button"
              onClick={handleEnter} // Khi nhấn vào nút Enter
            >
              Enter
            </Button>
          </div>
        </div>
      </Layout>

      <Modal
        title="Nhập Tên Người Chơi"
        visible={isNameModalVisible}
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
