import React from 'react';
import './CustomModal.css'; // Optional: For styling the modal

const CustomModal = ({ isVisible, onClose, onConfirm, content }) => {
  if (!isVisible) return null;

  return (
    <div className="custom-modal-overlay">
      <div className="custom-modal">
        <div className="custom-modal-header">
          <h3>Thông báo</h3>
        </div>
        <div className="custom-modal-body">
          <p>{content}</p>
        </div>
        <div className="custom-modal-footer">
          <button onClick={onConfirm}>OK</button>
          <button onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
