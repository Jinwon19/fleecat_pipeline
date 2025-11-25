require('dotenv').config();
const app = require('./app');

// BigInt를 JSON으로 직렬화할 수 있도록 설정
BigInt.prototype.toJSON = function() {
  return Number(this);
};

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
