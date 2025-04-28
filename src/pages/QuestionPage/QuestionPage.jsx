import React, { useState, useEffect, useRef } from 'react';
import { Typography, Row, Col, Button, message } from 'antd';
import {
    CaretUpOutlined,
    CaretRightOutlined,
    CaretDownOutlined,
    CaretLeftOutlined,
} from '@ant-design/icons';
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './QuestionPage.css';

const { Title } = Typography;
const COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#27ae60'];

const QuestionPage = () => {
    const { sessionId, questionInGameId } = useParams();
    const [questionData, setQuestionData] = useState(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [answersCount, setAnswersCount] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [feedbackColor, setFeedbackColor] = useState(null);
    const [shakeWrong, setShakeWrong] = useState(false);
    const connectionRef = useRef(null);
    const playerId = localStorage.getItem('playerId');

    // Force reload once to avoid stale state
    useEffect(() => {
        const hasReloaded = sessionStorage.getItem('reloaded');
        if (!hasReloaded) {
            sessionStorage.setItem('reloaded', 'true');
            window.location.reload();
        }
    }, []);

    // Fetch question data
    useEffect(() => {
        const fetchQuestion = async () => {
            try {
                const inGameRes = await axios.get(
                    `https://localhost:7153/api/questions-in-game/${questionInGameId}`
                );
                const questionId = inGameRes.data?.data?.questionId;
                if (!questionId) {
                    message.error('Cannot find question ID from QuestionInGame');
                    return;
                }

                const questionRes = await axios.get(
                    `https://localhost:7153/api/questions/${questionId}`
                );
                const data = questionRes.data.data;
                setQuestionData(data);
                setTimeLeft(data.timeLimit);
            } catch (error) {
                console.error('Error fetching question:', error);
                message.error('Error loading question!');
            }
        };

        if (questionInGameId) {
            fetchQuestion();
        }
    }, [questionInGameId]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    // Submit answer
    const handleAnswer = async (optionIndex) => {
        if (!connectionRef.current || !playerId || !questionInGameId) {
            message.error('Not ready to submit answer');
            console.log('Invalid submit conditions:', {
                connection: connectionRef.current,
                playerId,
                questionInGameId,
            });
            return;
        }

        console.log('Sending answer...', {
            playerId: parseInt(playerId, 10),
            questionInGameId: parseInt(questionInGameId, 10),
            selectedOption: optionIndex + 1,
        });

        try {
            await connectionRef.current.invoke(
                'SubmitResponse',
                parseInt(playerId, 10),
                parseInt(questionInGameId, 10),
                optionIndex + 1
            );
            console.log('Answer submitted');
            setSelectedOption(optionIndex);
            // Remove local count increment; server will broadcast updated count
        } catch (error) {
            console.error('Submit error:', error);
            message.error('Failed to submit answer');
        }
    };

    // SignalR connection
    useEffect(() => {
        const connectToHub = async () => {
            const connection = new HubConnectionBuilder()
                .withUrl(`https://localhost:7153/gameSessionHub`, {
                    transport: HttpTransportType.WebSockets,
                    skipNegotiation: true,
                })
                .configureLogging(LogLevel.Information)
                .withAutomaticReconnect()
                .build();
    
            // Lắng nghe sự kiện ResponseCountUpdated
            connection.on('ResponseCountUpdated', (data) => {
                console.log('ResponseCountUpdated event received:', data);  // Log dữ liệu nhận được từ server
                if (data && typeof data.ResponseCount === 'number') {
                    setAnswersCount(data.ResponseCount);
                    console.log(`Log: ${data.ResponseCount} players have answered so far.`);
                } else {
                    console.error("Invalid data format for ResponseCountUpdated:", data);
                }
            });
    
            connection.on('ResponseSubmitted', (data) => {
                message.success(data.isCorrect ? 'Correct Answer!' : 'Wrong Answer!');
                if (data.isCorrect) {
                    setFeedbackColor('#2ecc71');
                } else {
                    setFeedbackColor('#e74c3c');
                    setShakeWrong(true);
                }
                setTimeout(() => {
                    setFeedbackColor(null);
                    setShakeWrong(false);
                }, 1000);
            });
    
            connection.on('Error', (errorMsg) => {
                console.error('Server error:', errorMsg);
                message.error(errorMsg);
            });
    
            try {
                await connection.start();
                connectionRef.current = connection;
                console.log('Connected to SignalR');
                // Gọi phương thức để lấy số lượng câu trả lời ban đầu
                connection.invoke('GetResponseCount', parseInt(sessionId)).catch((err) => console.error('Init count error:', err));
            } catch (error) {
                console.error('Connection failed:', error);
            }
        };
    
        if (sessionId) {
            connectToHub();
        }
    
        return () => {
            if (connectionRef.current) connectionRef.current.stop();
        };
    }, [sessionId]);
    
    
    if (!questionData) {
        return <div>Loading...</div>;
    }

    const options = [
        questionData.option1,
        questionData.option2,
        questionData.option3,
        questionData.option4,
    ];

    return (
        <div
            className={`question-container ${shakeWrong ? 'shake' : ''}`}
            style={{
                backgroundColor: feedbackColor || '',
                transition: 'background-color 0.5s ease',
            }}
        >
            <div className="question-header">
                <div className="timer-circle">
                    <span>{timeLeft}</span>
                </div>
                <div className="question-image">
                    {questionData.imageUrl?.trim() && (
                        <img
                            src={questionData.imageUrl}
                            alt="question"
                            style={{ maxWidth: '100%', maxHeight: '200px' }}
                        />
                    )}
                </div>
                <div className="answer-count">
                    <Title level={4}>{answersCount}</Title>
                    <span>Answers</span>
                </div>
                <div className="question-header-bar">
                    <Title level={2} className="question-text">
                        {questionData.text}
                    </Title>
                </div>
            </div>
            <Row gutter={[50, 16]} className="answer-options">
                {options.map((text, idx) => (
                    <Col xs={24} sm={10} key={idx}>
                        <Button
                            className="answer-button"
                            style={{
                                backgroundColor: COLORS[idx],
                                opacity:
                                    selectedOption === null
                                        ? 1
                                        : selectedOption === idx
                                            ? 1
                                            : 0.5,
                                border: selectedOption === idx ? '3px solid #fff' : undefined,
                                transform: selectedOption === idx ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                            }}
                            block
                            size="large"
                            onClick={() => handleAnswer(idx)}
                            disabled={selectedOption !== null || timeLeft === 0}
                        >
                            {text}
                        </Button>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default QuestionPage;
