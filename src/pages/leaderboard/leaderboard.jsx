import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Typography, List, Avatar } from 'antd';
import { CrownFilled, CrownOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import './Leaderboard.css';

const { Title, Text } = Typography;

// Mock data tạm thời
const mockData = [
  { key: '1', rank: 1, nickname: 'Alice', score: 2500 },
  { key: '2', rank: 2, nickname: 'Bob', score: 2449 },
  { key: '3', rank: 3, nickname: 'Charlie', score: 2400 },
  { key: '4', rank: 4, nickname: 'Diana', score: 2000 }
];

const medalIcons = {
  1: <CrownFilled style={{ color: '#FFD700', fontSize: 24 }} />,
  2: <CrownFilled style={{ color: '#C0C0C0', fontSize: 24 }} />,
  3: <CrownFilled style={{ color: '#cd7f32', fontSize: 24 }} />
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Sử dụng mockData để hiển thị tạm giao diện
    setPlayers(mockData);
  }, []);

  const renderStars = (score) => {
    // mỗi 500 điểm = 1 sao
    const filledCount = Math.min(5, Math.floor(score / 500));
    return Array.from({ length: 5 }).map((_, idx) =>
      idx < filledCount ? <StarFilled key={idx} /> : <StarOutlined key={idx} />
    );
  };

  return (
    <div className="leaderboard-wrapper">
      <Title level={2} className="leaderboard-title" style={{color: 'white'}}>Leaderboard</Title>
      <List
        itemLayout="horizontal"
        dataSource={players}
        renderItem={item => (
          <List.Item onClick={() => navigate(-1)} className="leader-item">
            <Row align="middle" style={{ width: '100%' }}>
              <Col flex="40px" className="leader-rank">
                {medalIcons[item.rank] || <Text strong>{item.rank}</Text>}
              </Col>
              <Col flex="60px">
                <Avatar size={40} icon={<CrownOutlined />} />
              </Col>
              <Col flex="auto" className="leader-info">
                <div className="leader-name">{item.nickname}</div>
                <div className="leader-score">{item.score}</div>
              </Col>

            </Row>
          </List.Item>
        )}
      />
    </div>
  );
};

export default Leaderboard;
