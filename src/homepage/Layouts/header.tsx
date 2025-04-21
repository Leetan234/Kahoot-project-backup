import React from 'react';
import { Layout, Button, Space } from 'antd';
import { GlobalOutlined, UserOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  return (
    <AntHeader
      style={{
        backgroundColor: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        boxShadow: '0 2px 8px #f0f1f2',
      }}
    >
      {/* Logo */}
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'rgba(90, 15, 205, 0.4)' }}>
        Quizzzz!
      </div>

      {/* Right side: language + user */}
      <Space size="large">
        <Button type="text" icon={<GlobalOutlined />} />
        <Button type="text" icon={<UserOutlined />} />
      </Space>
    </AntHeader>
  );
};

export default Header;
