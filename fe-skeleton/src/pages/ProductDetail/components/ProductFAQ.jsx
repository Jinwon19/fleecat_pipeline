import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function ProductFAQ({ faqs }) {
  const [openIndex, setOpenIndex] = useState(null)

  // 기본 FAQ 데이터 (faqs prop이 없을 경우)
  const defaultFAQs = [
    {
      question: '제품의 사이즈가 어떻게 되나요?',
      answer: '에코백의 사이즈는 가로 35cm x 세로 40cm x 깊이 10cm입니다. A4 서류나 15인치 노트북을 넉넉하게 수납할 수 있습니다.'
    },
    {
      question: '세탁은 어떻게 하나요?',
      answer: '손세탁과 기계세탁 모두 가능합니다. 중성세제를 사용하시고, 세탁 후에는 그늘에서 자연 건조해주세요. 표백제 사용은 피해주세요.'
    },
    {
      question: '어떤 소재로 만들어졌나요?',
      answer: '100% 친환경 캔버스 원단을 사용했습니다. 재활용 가능한 소재로 제작되어 환경에 부담을 주지 않습니다.'
    },
    {
      question: '색상이 실제와 다를 수 있나요?',
      answer: '모니터 설정에 따라 실제 색상과 약간의 차이가 있을 수 있습니다. 정확한 색상 확인을 원하시면 고객센터로 문의해주세요.'
    },
    {
      question: '교환 및 환불이 가능한가요?',
      answer: '상품 수령 후 7일 이내에 교환 및 환불이 가능합니다. 단, 제품에 하자가 있는 경우에는 배송비를 포함하여 전액 환불해드립니다.'
    },
    {
      question: '배송은 얼마나 걸리나요?',
      answer: '주문 후 영업일 기준 2-3일 내에 배송됩니다. 제주 및 도서산간 지역은 1-2일 추가 소요될 수 있습니다.'
    }
  ]

  const displayFAQs = faqs || defaultFAQs

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="product-faq">
      <h2 className="product-faq__title">자주 묻는 질문 (FAQ)</h2>
      <div className="product-faq__list">
        {displayFAQs.map((faq, index) => (
          <div
            key={index}
            className={`product-faq__item ${openIndex === index ? 'product-faq__item--open' : ''}`}
          >
            <button
              className="product-faq__question"
              onClick={() => toggleFAQ(index)}
              aria-expanded={openIndex === index}
            >
              <span className="product-faq__question-text">
                Q. {faq.question}
              </span>
              <span className="product-faq__toggle-icon">
                {openIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </button>
            <div
              className={`product-faq__answer ${openIndex === index ? 'product-faq__answer--open' : ''}`}
            >
              <p className="product-faq__answer-text">
                A. {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
