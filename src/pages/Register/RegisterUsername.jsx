import React, { useState } from 'react';
import { Input, Button, Typography, Tooltip, message } from 'antd';
import { InfoCircleOutlined, StarOutlined } from '@ant-design/icons';
import './RegisterUser.css';

const { Title, Text } = Typography;

const MAX_LENGTH = 20;

const RegisterPage = () => {
  const [nickname, setNickname] = useState('');

  const handleRegister = () => {
    if (!nickname.trim()) {
      message.error('Vui lòng nhập tên đăng nhập!');
      return;
    }

    message.success(`Tên "${nickname}" đã được tạo!`);
    // Xử lý đăng ký ở đây
  };

  const generateRandomName = () => {
    const randomNames = ['Im_fool_123', 'Im_gay_456', 'Im_not_human_789', 'Im_pedophilia_101112', 'gaylord_131415'];
    const random = randomNames[Math.floor(Math.random() * randomNames.length)];
    setNickname(random);
  };

  return (
    <div className="register-container">
      <Title level={2} className="register-title">Tạo tên đăng nhập</Title>

      <div className="register-box">
        <div className="register-label">
          <Text strong>
            Tên đăng nhập{' '}
            <Tooltip title="Không sử dụng tên thật của bạn">
              <InfoCircleOutlined />
            </Tooltip>
          </Text>
          <div style={{ fontSize: 14, color: '#555' }}>Không sử dụng tên thật của bạn</div>
        </div>

        <Input
          placeholder="Nhập tên đăng nhập..."
          value={nickname}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length <= MAX_LENGTH) setNickname(val);
          }}
          suffix={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary">{MAX_LENGTH - nickname.length}</Text>
              <Button
                type="text"
                icon={<StarOutlined />}
                onClick={generateRandomName}
              />
            </span>
          }
          size="large"
        />

        <Button
          type="primary"
          size="large"
          block
          style={{ marginTop: 24 }}
          onClick={handleRegister}
        >
          Tiếp tục
        </Button>
      </div>
    </div>
  );
};

export default RegisterPage;