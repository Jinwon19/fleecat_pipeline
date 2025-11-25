import { useState, useEffect } from 'react';
import Modal from '../../../../../components/common/Modal';
import Input from '../../../../../components/common/Input';
import Select from '../../../../../components/common/Select';
import Button from '../../../../../components/common/Button';
import ImageUpload from './ImageUpload';
import { categories } from './mockData';
import './ProductForm.css';

export default function ProductForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null 
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    discountPrice: '',
    stock: '',
    description: '',
    shippingFee: 'free',
    shippingAmount: '',
    origin: '',
    manufacturer: '',
    status: 'active',
    images: []
  });

  const [errors, setErrors] = useState({});

  // 수정 모드일 때 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        price: initialData.price?.toString() || '',
        discountPrice: initialData.discountPrice?.toString() || '',
        stock: initialData.stock?.toString() || '',
        description: initialData.description || '',
        shippingFee: initialData.shippingFee || 'free',
        shippingAmount: initialData.shippingAmount?.toString() || '',
        origin: initialData.origin || '',
        manufacturer: initialData.manufacturer || '',
        status: initialData.status || 'active',
        images: initialData.images || [initialData.thumbnail] || []
      });
    } else {
      // 등록 모드일 때 초기화
      setFormData({
        name: '',
        category: '',
        price: '',
        discountPrice: '',
        stock: '',
        description: '',
        shippingFee: 'free',
        shippingAmount: '',
        origin: '',
        manufacturer: '',
        status: 'active',
        images: []
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 클리어
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '상품명을 입력하세요';
    }

    if (!formData.category) {
      newErrors.category = '카테고리를 선택하세요';
    }

    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = '올바른 가격을 입력하세요';
    }

    if (formData.discountPrice && Number(formData.discountPrice) >= Number(formData.price)) {
      newErrors.discountPrice = '할인가는 원가보다 낮아야 합니다';
    }

    if (!formData.stock || Number(formData.stock) < 0) {
      newErrors.stock = '올바른 재고 수량을 입력하세요';
    }

    if (!formData.description || formData.description.trim().length < 10) {
      newErrors.description = '상품 설명을 10자 이상 입력하세요';
    }

    if (formData.shippingFee === 'paid' && (!formData.shippingAmount || Number(formData.shippingAmount) < 0)) {
      newErrors.shippingAmount = '올바른 배송비를 입력하세요';
    }

    if (formData.images.length === 0) {
      newErrors.images = '최소 1개의 이미지를 업로드하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      ...formData,
      price: Number(formData.price),
      discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
      stock: Number(formData.stock),
      shippingAmount: formData.shippingFee === 'paid' ? Number(formData.shippingAmount) : 0,
      thumbnail: formData.images[0] || ''
    };

    if (initialData) {
      submitData.id = initialData.id;
    }

    onSubmit(submitData);
    onClose();
  };

  const statusOptions = [
    { value: 'active', label: '판매중' },
    { value: 'inactive', label: '비공개' }
  ];

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        취소
      </Button>
      <Button onClick={handleSubmit}>
        {initialData ? '수정' : '등록'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? '상품 수정' : '상품 등록'}
      size="large"
      footer={footer}
    >
      <form className="product-form" onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <div className="form-section">
          <h4 className="section-title">기본 정보</h4>

          <Input
            label="상품명"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="상품명을 입력하세요"
            required
          />

          <Select
            label="카테고리"
            options={categories.filter(c => c.value !== '')}
            value={formData.category}
            onChange={(value) => handleChange('category', value)}
            error={errors.category}
            placeholder="카테고리를 선택하세요"
          />

          <div className="form-row">
            <Input
              label="판매가"
              type="number"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              error={errors.price}
              placeholder="0"
              required
            />

            <Input
              label="할인가"
              type="number"
              value={formData.discountPrice}
              onChange={(e) => handleChange('discountPrice', e.target.value)}
              error={errors.discountPrice}
              placeholder="0 (선택)"
            />
          </div>

          <Input
            label="재고 수량"
            type="number"
            value={formData.stock}
            onChange={(e) => handleChange('stock', e.target.value)}
            error={errors.stock}
            placeholder="0"
            required
          />

          <Select
            label="상태"
            options={statusOptions}
            value={formData.status}
            onChange={(value) => handleChange('status', value)}
          />
        </div>

        {/* 이미지 업로드 */}
        <div className="form-section">
          <ImageUpload
            value={formData.images}
            onChange={(images) => handleChange('images', images)}
            required
          />
          {errors.images && <p className="error-message">{errors.images}</p>}
        </div>

        {/* 상세 정보 */}
        <div className="form-section">
          <h4 className="section-title">상세 정보</h4>

          <div className="form-group">
            <label className="form-label">
              상품 설명 <span className="required">*</span>
            </label>
            <textarea
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="상품 설명을 10자 이상 입력하세요"
              rows={5}
            />
            {errors.description && <p className="error-message">{errors.description}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">배송비</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="free"
                  checked={formData.shippingFee === 'free'}
                  onChange={(e) => handleChange('shippingFee', e.target.value)}
                />
                <span>무료배송</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="paid"
                  checked={formData.shippingFee === 'paid'}
                  onChange={(e) => handleChange('shippingFee', e.target.value)}
                />
                <span>유료배송</span>
              </label>
            </div>
          </div>

          {formData.shippingFee === 'paid' && (
            <Input
              label="배송비 금액"
              type="number"
              value={formData.shippingAmount}
              onChange={(e) => handleChange('shippingAmount', e.target.value)}
              error={errors.shippingAmount}
              placeholder="0"
            />
          )}

          <div className="form-row">
            <Input
              label="원산지"
              value={formData.origin}
              onChange={(e) => handleChange('origin', e.target.value)}
              placeholder="예: 대한민국"
            />

            <Input
              label="제조사"
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="예: ABC전자"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
