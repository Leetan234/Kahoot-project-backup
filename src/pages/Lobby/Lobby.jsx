import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, List, Card, message, Modal } from 'antd';
import axios from 'axios'; // Import axios
import { useLocation } from 'react-router-dom'; // To access the gamePin and nickname
import '../Lobby/Lobby.css';
import { createConnection } from '../../signalRConnection';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Lobby = () => {
  const { state } = useLocation();
  const [gamePin, setGamePin] = useState(state?.gamePin || '123456');
  const [nickname, setNickname] = useState(state?.nickname || 'Dev Tester');
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [sessionId, setSessionId] = useState(null);  // Add state to store sessionId

  const prevPlayersRef = useRef([]);
  const navigate = useNavigate();

  // Fetch the game session to get the sessionId
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
  

  useEffect(() => {
    if (sessionId) {
      const connection = createConnection(sessionId);
      connection.start().then(() => {
        connection.on("GameStarted", async (sessionId) => {
          try {
            const res = await axios.get(`https://localhost:7153/api/question-in-game/GetQuestionsInGameBySessionId/${sessionId}`);
            
            if (res.data?.statusCode === 200) {
              const questions = res.data.data;
              const firstQuestion = questions.find(q => q.orderIndex === 1);
              
              if (firstQuestion) {
                navigate(`/QuestionPage/${sessionId}/${firstQuestion.questionId}`);
              } else {
                message.error('Không tìm thấy câu hỏi đầu tiên!');
              }
            } else {
              message.error('Không thể lấy câu hỏi!');
            }
          } catch (err) {
            console.error('Lỗi khi load câu hỏi đầu tiên:', err);
            message.error('Lỗi khi bắt đầu câu hỏi!');
          }
        });
      });
  
      return () => {
        connection.stop();
      };
    }
  }, [sessionId, navigate]);
  

  // Handle modal actions
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
            grid={{ gutter: 1700, column: 8 }} 
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
          <p>No players yet!</p> // Message if no players
        )}
      </div>

      {/* New Player Modal */}
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

export default Lobby;
