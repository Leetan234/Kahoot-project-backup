import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, List, Card, message, Modal } from 'antd';
import axios from 'axios'; // Import axios
import { useLocation } from 'react-router-dom'; 
import { useNavigate } from 'react-router-dom';
import './Host.css';

const { Title } = Typography;

const Host = () => {
    const { state } = useLocation();
    const [gamePin, setGamePin] = useState(state?.gamePin || '123456');
    const [nickname, setNickname] = useState(state?.nickname || 'Host');
    const [players, setPlayers] = useState([]);
    const [isStarted, setIsStarted] = useState(false);
    const [newPlayer, setNewPlayer] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [sessionId, setSessionId] = useState(null);  // Add state to store sessionId

    const prevPlayersRef = useRef([]);
    const navigate = useNavigate();

    // Fetch players when the component mounts
    useEffect(() => {
        if (!gamePin) return;
    
        const fetchGameSession = async () => {
          try {
            const response = await axios.get(`https://localhost:7153/api/gamesession/GetGameSessionWithPin/${gamePin}`);
            if (response.data?.statusCode === 200) {
              const { sessionId } = response.data.data;  // Assuming sessionId is in the response
              setSessionId(sessionId);  // Store the sessionId
            } else {
              message.error('Không thể lấy thông tin phiên trò chơi!');
            }
          } catch (error) {
            console.error('Error fetching game session:', error);
            message.error('Không thể lấy thông tin phiên trò chơi!');
          }
        };
    
        fetchGameSession();
      }, [gamePin]);
    
      useEffect(() => {
        if (sessionId) {
          const intervalId = setInterval(() => {
            fetchPlayers(sessionId);  // Fetch players every 5 seconds
          }, 5000);
      
          return () => clearInterval(intervalId);  // Cleanup the interval
        }
      }, [sessionId]);
      
      // Fetch players function with player comparison
      const fetchPlayers = async (sessionId) => {
        if (!sessionId) return;
      
        try {
          const response = await axios.get(`https://localhost:7153/api/player/GetPlayersBySession/${sessionId}`);
      
          if (response.data?.statusCode === 200) {
            const fetchedPlayers = response.data.data;
      
            if (!isFirstLoad) {
              
              const newPlayers = fetchedPlayers.filter(player =>
                !prevPlayersRef.current.some(prevPlayer => prevPlayer.playerId === player.playerId)
              );
              if (newPlayers.length > 0) {
                setNewPlayer(newPlayers[0]);  // Set the new player for modal
                setIsModalVisible(true);  // Show the modal for new player
      
                // Optionally show a toast notification
                message.success(`New player joined: ${newPlayers[0].nickname}`);
              }
            }
      
            // Update players state and store current player list in the ref for next comparison
            setPlayers(fetchedPlayers);
            prevPlayersRef.current = fetchedPlayers;  // Save the current players for next comparison
      
            // After the first load, we don't need to check again for the first load
            if (isFirstLoad) {
              setIsFirstLoad(false);  // Set isFirstLoad to false after first fetch
            }
          } else {
            message.error('Không thể tải danh sách người chơi!');
          }
        } catch (error) {
          console.error('Error fetching players:', error);
          message.error('Không thể tải danh sách người chơi!');
        }
      };
  

      const handleStart = async () => {
        if (players.length < 1) {
          message.error('Phải có ít nhất 1 người chơi để bắt đầu!');
          return;
        }
      
        try {
          // 1. Gọi API Start game
          const startRes = await axios.post(`https://localhost:7153/api/gamesession/Start/${sessionId}`);
          if (startRes.data?.statusCode !== 200) {
            message.error(startRes.data.message || 'Không thể bắt đầu trò chơi!');
            return;
          }
      
          // 2. Gọi API lấy câu hỏi trong game
          const questionRes = await axios.get(
            `https://localhost:7153/api/question-in-game/GetQuestionsInGameBySessionId/${sessionId}`
          );
      
          if (questionRes.data?.statusCode === 200) {
            const questions = questionRes.data.data;
            const firstQuestion = questions.find(q => q.orderIndex === 1);
      
            if (firstQuestion) {
              const questionId = firstQuestion.questionId;
      
              // 3. Gọi API NextQuestion
              const nextQuestionRes = await axios.post(
                `https://localhost:7153/api/gamesession/NextQuestion/${sessionId}/${questionId}`
              );
      
              if (nextQuestionRes.data?.statusCode !== 200) {
                message.warning('Không thể cập nhật trạng thái câu hỏi, nhưng vẫn tiếp tục.');
              }
      
              // 4. Điều hướng sang trang host câu hỏi
              message.success('Trò chơi bắt đầu!');
              navigate(`/HostQuestionPage/${sessionId}/${questionId}`);
            } else {
              message.error('Không tìm thấy câu hỏi đầu tiên!');
            }
          } else {
            message.error('Không thể lấy danh sách câu hỏi!');
          }
        } catch (error) {
          console.error('Start error:', error);
          message.error('Lỗi khi bắt đầu trò chơi!');
        }
      };
      
      

    // Xử lý khi đóng modal
    const handleModalOk = () => {
        setIsModalVisible(false);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
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
                {players.length > 0 ? (
                    <List
                        grid={{ gutter: 1700, column: 8 }} // This will handle grid columns and gaps in a flexible way
                        dataSource={players}
                        renderItem={(player) => (
                            <List.Item key={player.playerId}>
                                <Card className="player-card">
                                    <span className="nickname">{player.nickname}</span>
                                </Card>
                            </List.Item>
                        )}
                    />
                ) : (
                    <p>No players yet!</p>
                )}
            </div>

            <Button
                className="custom-button"  // Thêm class để áp dụng CSS
                onClick={handleStart}
                disabled={isStarted || players.length < 1}
                style={{ marginTop: '20px' }}
            >
                {isStarted ? 'Game Started' : 'Start Game'}
            </Button>

            <Modal
                title="New Player Joined"
                visible={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
            >
                <p>New player joined: {newPlayer?.nickname}</p>
            </Modal>
        </div>
    );
};

export default Host;
