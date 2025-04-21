import React, { useState } from 'react';
import { Input, Button, Typography, Checkbox, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import './Login.css';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    if (!username || !password) {
      message.error('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }
    message.success('Đăng nhập thành công!');
    // Xử lý đăng nhập ở đây
  };

  const handleGoogleLogin = () => {
    message.info('Chức năng đăng nhập bằng Google đang được phát triển.');
    // Xử lý đăng nhập Google tại đây
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <Title className="login-title">Login</Title>
      </div>

      <div className="login-form">
        <Input
          size="large"
          placeholder="Tên đăng nhập"
          prefix={<UserOutlined />}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-input"
        />

        <Input.Password
          size="large"
          placeholder="Mật khẩu"
          prefix={<LockOutlined />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />

        <div className="login-options">
          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          >
            Ghi nhớ đăng nhập
          </Checkbox>
          <Button type="link" className="forgot-password">
            Quên mật khẩu?
          </Button>
        </div>

        <Button 
          type="primary" 
          size="large" 
          block 
          onClick={handleLogin}
          className="login-button"
        >
          Đăng nhập
        </Button>

        <Divider plain>hoặc</Divider>

        <Button
          icon={<GoogleOutlined />}
          size="large"
          block
          onClick={handleGoogleLogin}
        >
          Tiếp tục với Google
        </Button>

        <div className="login-footer">
          <Text>Bạn chưa có tài khoản? </Text>
          <Button type="link" className="register-link">
            Đăng ký ngay
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;