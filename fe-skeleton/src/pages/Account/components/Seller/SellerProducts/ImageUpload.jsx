import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import './ImageUpload.css';

export default function ImageUpload({ 
  value = [], 
  onChange, 
  maxImages = 5,
  required = false 
}) {
  const [previews, setPreviews] = useState(value);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (previews.length + files.length > maxImages) {
      alert(`최대 ${maxImages}개까지만 업로드할 수 있습니다`);
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previews, reader.result];
        setPreviews(newPreviews);
        onChange?.(newPreviews);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemove = (index) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange?.(newPreviews);
  };

  return (
    <div className="image-upload">
      <label className="image-upload-label">
        상품 이미지 {required && <span className="required">*</span>}
        <span className="image-count">({previews.length}/{maxImages})</span>
      </label>

      <div className="image-upload-grid">
        {/* 미리보기 이미지들 */}
        {previews.map((preview, index) => (
          <div key={index} className="image-preview">
            <img src={preview} alt={`Preview ${index + 1}`} />
            <button
              type="button"
              className="image-remove-btn"
              onClick={() => handleRemove(index)}
            >
              <X size={16} />
            </button>
            {index === 0 && <span className="main-badge">대표</span>}
          </div>
        ))}

        {/* 업로드 버튼 */}
        {previews.length < maxImages && (
          <label className="image-upload-box">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Upload size={32} />
            <span>이미지 추가</span>
          </label>
        )}
      </div>

      <p className="image-upload-hint">
        * 첫 번째 이미지가 대표 이미지로 사용됩니다
        <br />* 실제 업로드는 되지 않으며, 미리보기만 가능합니다
      </p>
    </div>
  );
}
