import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Button } from 'antd';
import {
    CaretUpOutlined,
    CaretRightOutlined,
    CaretDownOutlined,
    CaretLeftOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import './HostQuestionPage.css'; // dùng lại CSS



const { Title } = Typography;
const COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#27ae60'];

const HostQuestionPage = () => {
    const [questionData, setQuestionData] = useState(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [answersCount, setAnswersCount] = useState(0);

    useEffect(() => {
        const fetchQuestion = async () => {
            try {
                const response = await axios.get('https://localhost:7153/api/question/GetQuestionById/1');
                const data = response.data.data;
                setQuestionData(data);
                setTimeLeft(data.timeLimit);
            } catch (error) {
                console.error('Error fetching question:', error);
            }
        };

        fetchQuestion();
    }, []);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    const handleNext = () => {
        console.log('Next question clicked!');
        // TODO: Implement logic to fetch the next question
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
                    Done
                </Button>
            </div>


            <div className="question-header">

                <div className="timer-circle">
                    <span>{timeLeft}</span>
                </div>

                <div className="question-image">
                    {questionData.imageUrl && questionData.imageUrl.trim() !== '' && (
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
                            className="answer-button"
                            style={{ backgroundColor: COLORS[idx] }}
                            block
                            size="large"
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
