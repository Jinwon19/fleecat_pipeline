import Modal from '../common/Modal'
import Button from '../common/Button'
import './InfoModal.css'

export default function InfoModal({ title, message, onConfirm, isOpen = true }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onConfirm}
      title={title}
      size="small"
      closeOnOverlay={true}
    >
      <div className="info-modal-content">
        <p className="modal-message">{message}</p>
      </div>
      <div className="modal-buttons">
        <Button variant="primary" onClick={onConfirm} fullWidth>
          확인
        </Button>
      </div>
    </Modal>
  )
}
