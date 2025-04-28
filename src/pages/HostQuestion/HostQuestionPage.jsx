import React, { useState, useEffect, useRef } from 'react';
import { Typography, Row, Col, Button, message } from 'antd';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './HostQuestionPage.css';

const { Title } = Typography;
const COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#27ae60'];

const HostQuestionPage = () => {
  const { sessionId, QuestionInGameID } = useParams();
  const [questionData, setQuestionData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answersCount, setAnswersCount] = useState(0);

  const connectionRef = useRef(null);
  const navigate = useNavigate();

  // Fetch question and reset timer
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const inGameRes = await axios.get(
          `https://localhost:7153/api/questions-in-game/${QuestionInGameID}`
        );
        const questionId = inGameRes.data?.data?.questionId;
        if (!questionId) {
          message.error('Cannot find question ID');
          return;
        }
        const questionRes = await axios.get(
          `https://localhost:7153/api/questions/${questionId}`
        );
        const data = questionRes.data.data;
        setQuestionData(data);
        setTimeLeft(data.timeLimit);
        // Let server broadcast the reset count
      } catch (error) {
        console.error('Error fetching question:', error);
        message.error('Error loading question!');
      }
    };

    if (QuestionInGameID) {
      fetchQuestion();
    }
  }, [QuestionInGameID]);

  // SignalR connection for response count
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(
        `https://localhost:7153/gameSessionHub?sessionId=${sessionId}`,
        {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
        }
      )
      .withAutomaticReconnect()
      .build();

    connection.on('ResponseCountUpdated', (data) => {
      if (typeof data.ResponseCount === 'number') {
        setAnswersCount(data.ResponseCount);
      }
    });

    connection.on('GameStarted', (startedSessionId) => {
      // Optionally handle redirect or initial game start
    });

    connection
      .start()
      .then(() => {
        console.log('SignalR connected in HostQuestionPage');
        connection
          .invoke('GetResponseCount', parseInt(sessionId))
          .catch((err) => console.error('Error fetching initial response count:', err));
      })
      .catch((err) => {
        console.error('Connection error:', err);
        message.error('Cannot connect to server');
      });

    connectionRef.current = connection;
    return () => {
      if (connectionRef.current) connectionRef.current.stop();
    };
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Move to next question
  const handleNext = async () => {
    if (!connectionRef.current) {
      message.error('Not connected to server');
      return;
    }
    try {
      await connectionRef.current.invoke(
        'NextQuestion',
        parseInt(sessionId, 10),
        parseInt(QuestionInGameID, 10)
      );
      message.success('Moving to next question...');
    } catch (error) {
      console.error('Error moving to next question:', error);
      message.error('Failed to move to next question');
    }
  };

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
    <div className="question-container">
      <div className="done-button-wrapper">
        <Button className="done-button" onClick={handleNext}>
          Next
        </Button>
      </div>

      <div className="question-header">
        <div className="timer-circle">
          <span>{timeLeft}</span>
        </div>

        <div className="question-image">
          {questionData.imageUrl && (
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

      <Row gutter={[16, 16]} className="answer-options">
        {options.map((text, idx) => (
          <Col xs={24} sm={12} key={idx}>
            <Button
              className="answer-button-host"
              style={{ backgroundColor: COLORS[idx] }}
              block
              size="large"
              disabled
            >
              {text}
            </Button>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default HostQuestionPage;
