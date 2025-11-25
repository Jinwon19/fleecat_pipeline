/**
 * Geocoding Service
 * 주소 → 좌표 변환 통합 서비스
 * 카카오맵 API를 사용한 다단계 Geocoding 전략
 */

const axios = require('axios');

class GeocodingService {
  constructor() {
    this.kakaoApiKey = process.env.KAKAO_REST_API_KEY;
    this.geocodeCache = new Map(); // 메모리 캐시
    this.KOREA_BOUNDS = {
      minLat: 33,
      maxLat: 38.5,
      minLng: 124,
      maxLng: 132,
    };
  }

  /**
   * 통합 Geocoding 엔드포인트
   * @param {string} location - 주소 또는 장소명
   * @param {string} marketName - 플리마켓 이름 (건물명 추출용, 선택사항)
   * @returns {Promise<{lat: number, lng: number, placeName?: string, addressName?: string, method: string} | null>}
   */
  async geocode(location, marketName = null) {
    if (!location || location === '미정') {
      return null;
    }

    // 캐시 확인
    if (this.geocodeCache.has(location)) {
      console.log(`💾 [캐시 적중] "${location}"`);
      return this.geocodeCache.get(location);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 [Geocoding 시작] "${location}"`);
    console.log(`${'='.repeat(60)}`);

    // 검색어 정제 (3가지 레벨)
    const cleanedLight = this._cleanSearchTerm(location, 'light');
    const cleanedMedium = this._cleanSearchTerm(location, 'medium');
    const cleanedAggressive = this._cleanSearchTerm(location, 'aggressive');

    const addressType = this._detectAddressType(location);
    console.log(`📋 감지된 타입: ${addressType}`);
    console.log(`🧹 경량 정제: "${cleanedLight}"`);
    console.log(`🧹 중간 정제: "${cleanedMedium}"`);
    console.log(`🧹 공격적 정제: "${cleanedAggressive}"`);

    let result = null;

    // Step 1: 키워드 검색 (원본) - 최우선! 백엔드가 이미 정제했을 가능성
    console.log('\n[Step 1/10] 키워드 검색 (원본)...');
    result = await this._tryKeywordSearch(location);
    if (result) {
      result.method = 'keyword_search_original';
      this._cacheResult(location, result);
      console.log(`✅ Step 1 성공`);
      return result;
    }

    // Step 2: 주소 검색 (완전한 주소인 경우)
    if (addressType === 'complete_address') {
      console.log('\n[Step 2/10] 주소 검색 (완전한 주소)...');
      result = await this._tryAddressSearch(location);
      if (result) {
        result.method = 'address_search';
        this._cacheResult(location, result);
        console.log(`✅ Step 2 성공`);
        return result;
      }
    }

    // Step 3: 키워드 검색 (경량 정제) - 괄호, "일대" 제거
    if (cleanedLight && cleanedLight !== location) {
      console.log('\n[Step 3/10] 키워드 검색 (경량 정제)...');
      result = await this._tryKeywordSearch(cleanedLight);
      if (result) {
        result.method = 'keyword_search_light';
        this._cacheResult(location, result);
        console.log(`✅ Step 3 성공`);
        return result;
      }
    }

    // Step 4: 장소명 키워드만 추출 (공원, 센터 등)
    console.log('\n[Step 4/10] 장소명 키워드 추출...');
    const placeName = this._extractPlaceName(cleanedLight || location);
    if (placeName && placeName !== location && placeName !== cleanedLight) {
      result = await this._tryKeywordSearch(placeName);
      if (result) {
        result.method = 'keyword_search_place_name';
        this._cacheResult(location, result);
        console.log(`✅ Step 4 성공 (장소명: "${placeName}")`);
        return result;
      }
    } else {
      console.log(`   ℹ️  장소명 키워드 추출 불가`);
    }

    // Step 5: 키워드 검색 (중간 정제) - 괄호, 층수, "일대" 제거
    if (cleanedMedium && cleanedMedium !== location && cleanedMedium !== cleanedLight) {
      console.log('\n[Step 5/10] 키워드 검색 (중간 정제)...');
      result = await this._tryKeywordSearch(cleanedMedium);
      if (result) {
        result.method = 'keyword_search_medium';
        this._cacheResult(location, result);
        console.log(`✅ Step 5 성공`);
        return result;
      }
    }

    // Step 6: 키워드 검색 (공격적 정제) - 특수문자까지 모두 제거
    if (
      cleanedAggressive &&
      cleanedAggressive !== cleanedMedium &&
      cleanedAggressive !== location
    ) {
      console.log('\n[Step 6/10] 키워드 검색 (공격적 정제)...');
      result = await this._tryKeywordSearch(cleanedAggressive);
      if (result) {
        result.method = 'keyword_search_aggressive';
        this._cacheResult(location, result);
        console.log(`✅ Step 6 성공`);
        return result;
      }
    }

    // Step 7: 상위 지역명 검색 (불완전한 주소인 경우)
    if (addressType === 'incomplete_address') {
      console.log('\n[Step 7/10] 키워드 검색 (상위 지역명)...');
      const upperRegion = this._extractUpperRegion(location);

      if (upperRegion && upperRegion !== location) {
        console.log(`   → 상위 지역: "${upperRegion}"`);
        result = await this._tryKeywordSearch(upperRegion);
        if (result) {
          result.method = 'keyword_search_upper_region';
          this._cacheResult(location, result);
          console.log(`✅ Step 7 성공 (불완전한 주소 → 상위 지역으로 표시)`);
          return result;
        }
      }
    }

    // Step 8: 플리마켓 이름에서 건물명 추출 시도
    if (marketName && marketName.trim() !== '') {
      console.log('\n[Step 8/10] 키워드 검색 (플리마켓 이름에서 건물명 추출)...');
      const buildingName = this._extractBuildingName(marketName);

      if (buildingName && buildingName !== location) {
        console.log(`   → 건물명: "${buildingName}"`);
        result = await this._tryKeywordSearch(buildingName);
        if (result) {
          result.method = 'keyword_search_building_name';
          this._cacheResult(location, result);
          console.log(`✅ Step 8 성공 (플리마켓 이름 → 건물명 추출)`);
          return result;
        }
      } else {
        console.log(`   ℹ️  건물명 추출 불가`);
      }
    }

    // Step 9: 번지수 제거하고 상위 주소(동/로)로 재검색
    if (addressType === 'complete_address') {
      console.log('\n[Step 9/10] 키워드 검색 (번지수 제거 → 동/로 단위)...');
      const addressWithoutNumber = this._removeDetailedAddress(location);

      if (addressWithoutNumber && addressWithoutNumber !== location) {
        console.log(`   → 상위 주소: "${addressWithoutNumber}"`);
        result = await this._tryKeywordSearch(addressWithoutNumber);
        if (result) {
          result.method = 'keyword_search_without_number';
          this._cacheResult(location, result);
          console.log(`✅ Step 9 성공 (번지수 제거 → 상위 주소)`);
          return result;
        }
      }
    }

    // Step 10: 장소명 타입인 경우 마지막 시도 - 공격적 정제 후 장소명 추출
    if (addressType === 'place') {
      console.log('\n[Step 10/10] 장소명 키워드 추출 (공격적 정제 적용)...');
      const placeNameAggressive = this._extractPlaceName(cleanedAggressive || cleanedMedium || location);
      if (placeNameAggressive && placeNameAggressive !== placeName) {
        result = await this._tryKeywordSearch(placeNameAggressive);
        if (result) {
          result.method = 'keyword_search_place_name_aggressive';
          this._cacheResult(location, result);
          console.log(`✅ Step 10 성공 (장소명: "${placeNameAggressive}")`);
          return result;
        }
      }
    }

    // 모든 시도 실패
    console.log(`\n${'='.repeat(60)}`);
    console.error(`❌ [Geocoding 최종 실패] "${location}"`);
    console.log(`${'='.repeat(60)}`);
    this._logFailureReason(location, cleanedLight, cleanedMedium, cleanedAggressive, marketName);

    this.geocodeCache.set(location, null); // 실패도 캐싱
    return null;
  }

  /**
   * 카카오맵 주소 검색 API
   */
  async _tryAddressSearch(address) {
    try {
      const url = 'https://dapi.kakao.com/v2/local/search/address.json';
      const response = await axios.get(url, {
        headers: { Authorization: `KakaoAK ${this.kakaoApiKey}` },
        params: { query: address },
        timeout: 5000,
      });

      if (response.data.documents && response.data.documents.length > 0) {
        const doc = response.data.documents[0];
        const coords = {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          addressName: doc.address_name || address,
        };

        if (this._isValidKoreaArea(coords.lat, coords.lng)) {
          console.log(`   ✅ 주소 검색 성공: (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
          return coords;
        } else {
          console.warn(`   ❌ 범위 밖: (${coords.lat}, ${coords.lng})`);
        }
      } else {
        console.log(`   ℹ️  결과 없음 (카카오맵에 미등록)`);
      }
    } catch (error) {
      console.warn(`   ⚠️  주소 검색 오류: ${error.message}`);
    }
    return null;
  }

  /**
   * 카카오맵 키워드 검색 API
   */
  async _tryKeywordSearch(keyword) {
    try {
      const url = 'https://dapi.kakao.com/v2/local/search/keyword.json';
      const response = await axios.get(url, {
        headers: { Authorization: `KakaoAK ${this.kakaoApiKey}` },
        params: { query: keyword },
        timeout: 5000,
      });

      if (response.data.documents && response.data.documents.length > 0) {
        const bestMatch = response.data.documents[0];
        const coords = {
          lat: parseFloat(bestMatch.y),
          lng: parseFloat(bestMatch.x),
          placeName: bestMatch.place_name,
          addressName: bestMatch.address_name,
        };

        if (this._isValidKoreaArea(coords.lat, coords.lng)) {
          console.log(`   ✅ 키워드 검색 성공: "${bestMatch.place_name}"`);
          console.log(`      좌표: (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
          console.log(`      주소: ${bestMatch.address_name || 'N/A'}`);
          return coords;
        } else {
          console.warn(`   ❌ 범위 밖: (${coords.lat}, ${coords.lng})`);
        }
      } else {
        console.log(`   ℹ️  결과 없음`);
      }
    } catch (error) {
      console.warn(`   ⚠️  키워드 검색 오류: ${error.message}`);
    }
    return null;
  }

  /**
   * 대한민국 범위 검증
   */
  _isValidKoreaArea(lat, lng) {
    return (
      lat >= this.KOREA_BOUNDS.minLat &&
      lat <= this.KOREA_BOUNDS.maxLat &&
      lng >= this.KOREA_BOUNDS.minLng &&
      lng <= this.KOREA_BOUNDS.maxLng
    );
  }

  /**
   * 검색어 정제
   */
  _cleanSearchTerm(text, mode = 'light') {
    if (!text) return '';

    let cleaned = text;

    if (mode === 'light') {
      // 경량 정제: 최소한의 정제만 수행
      cleaned = text
        .replace(/\([^)]*\)/g, '') // 괄호와 내용 제거
        .replace(/\s*(일대|인근|부근|일원|근처|주변)\s*$/g, '') // "일대", "인근" 등 끝의 애매한 위치 표현 제거
        .replace(/\s+/g, ' ')
        .trim();
    } else if (mode === 'medium') {
      // 중간 정제: 괄호, 층수, 애매한 위치 표현 제거
      cleaned = text
        .replace(/\([^)]*\)/g, '') // 괄호와 내용 제거
        .replace(/\d+층/g, '') // 층수 제거
        .replace(/\s*(일대|인근|부근|일원|근처|주변)\s*$/g, '') // 끝의 애매한 위치 표현 제거
        .replace(/\s+/g, ' ')
        .trim();
    } else if (mode === 'aggressive') {
      // 공격적 정제: 특수문자까지 모두 제거
      cleaned = text
        .replace(/\([^)]*\)/g, '') // 괄호와 내용 제거
        .replace(/\d+층/g, '') // 층수 제거
        .replace(/\s*(일대|인근|부근|일원|근처|주변)\s*$/g, '') // 끝의 애매한 위치 표현 제거
        .replace(/[^\w\s가-힣0-9\-]/g, ' ') // 특수문자 제거
        .replace(/\s+/g, ' ')
        .trim();
    }

    return cleaned;
  }

  /**
   * 주소 타입 자동 판별
   */
  _detectAddressType(text) {
    if (!text) return 'unknown';

    // 완전한 주소 패턴
    const completeAddressPatterns = [
      /로\s*\d+/,
      /길\s*\d+/,
      /번지/,
      /번길/,
      /\d+동\s*\d+호/,
      /[동리]\s*\d+(-\d+)?(\s|$)/,
    ];

    const hasCompleteAddress = completeAddressPatterns.some((pattern) => pattern.test(text));

    if (hasCompleteAddress) {
      return 'complete_address';
    }

    // 불완전한 주소 패턴
    const incompleteAddressPatterns = [
      /시\s*$/,
      /구\s*$/,
      /동\s*$/,
      /리\s*$/,
      /읍\s*$/,
      /면\s*$/,
    ];

    const hasIncompleteAddress = incompleteAddressPatterns.some((pattern) =>
      pattern.test(text.trim())
    );

    if (hasIncompleteAddress) {
      return 'incomplete_address';
    }

    // 장소명 힌트
    const placeHints = ['센터', '빌딩', '타워', '플라자', '몰', '마트', '공원', '광장', '역'];
    const hasPlaceHint = placeHints.some((hint) => text.includes(hint));

    if (hasPlaceHint) {
      return 'place';
    }

    // 기본 주소 키워드
    const basicAddressKeywords = ['시', '구', '동', '로', '길', '읍', '면', '리'];
    const hasBasicKeyword = basicAddressKeywords.some((keyword) => text.includes(keyword));

    if (hasBasicKeyword) {
      return 'incomplete_address';
    }

    return 'place';
  }

  /**
   * 상위 지역명 추출
   */
  _extractUpperRegion(location) {
    let upperRegion = location
      .replace('특별시', '')
      .replace('광역시', '')
      .replace(/시\s+/, '시 ')
      .replace(/구\s+/, '구 ')
      .trim();

    // 마지막 단어가 유효한 주소 키워드가 아니면 제거
    const words = upperRegion.split(/\s+/);
    if (words.length > 1) {
      const lastWord = words[words.length - 1];
      const validAddressEndings = ['시', '군', '구', '읍', '면', '동', '리'];

      const endsWithValidKeyword = validAddressEndings.some((ending) => lastWord.endsWith(ending));

      if (!endsWithValidKeyword) {
        upperRegion = words.slice(0, -1).join(' ');
        console.log(`   → 불완전 단어 제거: "${lastWord}"`);
      }
    }

    // 끝의 동/리 제거하여 상위 지역으로 검색
    upperRegion = upperRegion.replace(/동$/, '').replace(/리$/, '').trim();

    return upperRegion;
  }

  /**
   * 플리마켓 이름에서 건물명 추출
   * 예: "영통 아이파크 캐슬 야시장" → "아이파크 캐슬"
   * 예: "북부프리마켓" → "북부프리마켓"
   */
  _extractBuildingName(marketName) {
    if (!marketName) return '';

    // 건물명 키워드 패턴 (빌딩, 센터, 플라자, 타워, 몰, 마트 등)
    const buildingKeywords = [
      '아이파크',
      '래미안',
      '푸르지오',
      '자이',
      '힐스테이트',
      '센터',
      '빌딩',
      '타워',
      '플라자',
      '몰',
      '마트',
      '공원',
      '광장',
      '역',
      '캐슬',
      '파크',
      '스퀘어',
    ];

    // 건물명 키워드가 포함된 경우 해당 부분만 추출
    for (const keyword of buildingKeywords) {
      if (marketName.includes(keyword)) {
        // 키워드를 포함한 앞뒤 단어를 추출
        const regex = new RegExp(`([가-힣a-zA-Z0-9\\s]*${keyword}[가-힣a-zA-Z0-9\\s]*)`);
        const match = marketName.match(regex);
        if (match) {
          // "야시장", "플리마켓" 같은 단어 제거
          let extracted = match[1]
            .replace(/플리마켓/g, '')
            .replace(/야시장/g, '')
            .replace(/행사/g, '')
            .replace(/축제/g, '')
            .replace(/페스티벌/g, '')
            .replace(/페어/g, '')
            .replace(/마켓/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (extracted.length > 2) {
            return extracted;
          }
        }
      }
    }

    // 특수한 패턴: "북부프리마켓", "용강동상점가" 같은 경우
    // 주소 관련 단어 제거 후 남은 것이 건물명일 가능성
    let cleaned = marketName
      .replace(/\d{4}\s*년?/g, '') // 연도 제거
      .replace(/\d+월\s*\d+일?/g, '') // 날짜 제거
      .replace(/시즌\s*\d+/g, '') // 시즌 제거
      .replace(/제\s*\d+회/g, '') // 회차 제거
      .replace(/셀러\s*모집/g, '')
      .replace(/참여자\s*모집/g, '')
      .replace(/플리마켓/g, '')
      .replace(/야시장/g, '')
      .replace(/행사/g, '')
      .replace(/축제/g, '')
      .replace(/페스티벌/g, '')
      .replace(/페어/g, '')
      .replace(/마켓/g, '')
      .replace(/[:\-\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 너무 짧거나 긴 경우 제외
    if (cleaned.length >= 3 && cleaned.length <= 30) {
      return cleaned;
    }

    return '';
  }

  /**
   * 장소명 키워드 추출
   * 예: "관악구 조원동 새숲어린이공원 일대" → "새숲어린이공원"
   * 예: "서울 강남구 코엑스몰" → "코엑스몰"
   */
  _extractPlaceName(location) {
    if (!location) return '';

    // 장소명을 나타내는 키워드 패턴
    const placeKeywords = [
      '공원',
      '센터',
      '빌딩',
      '타워',
      '플라자',
      '몰',
      '마트',
      '광장',
      '역',
      '학교',
      '대학교',
      '병원',
      '시장',
      '백화점',
      '아울렛',
      '캐슬',
      '파크',
      '스퀘어',
      '갤러리',
      '뮤지엄',
      '미술관',
      '박물관',
      '체육관',
      '경기장',
      '공공공',
      '어린이집',
    ];

    // 패턴: 한글/숫자 + 장소 키워드
    for (const keyword of placeKeywords) {
      const pattern = new RegExp(`([가-힣0-9]+${keyword})`, 'g');
      const matches = location.match(pattern);

      if (matches && matches.length > 0) {
        // 가장 긴 매칭을 반환 (더 구체적일 가능성)
        const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
        console.log(`   → 장소명 추출: "${longestMatch}" (from "${location}")`);
        return longestMatch;
      }
    }

    return '';
  }

  /**
   * 번지수 제거하고 상위 주소(동/로) 반환
   * 예: "서울특별시 마포구 도화동 553-1" → "서울특별시 마포구 도화동"
   * 예: "경기도 평택시 포승읍 평택항로 184" → "경기도 평택시 포승읍 평택항로"
   */
  _removeDetailedAddress(location) {
    if (!location) return '';

    let cleaned = location;

    // 패턴 1: "동 123", "로 456", "길 789" 같은 번지수 제거
    cleaned = cleaned
      .replace(/([동리])\s*\d+(-\d+)?(\s|$)/g, '$1 ') // "동 123-4" → "동 "
      .replace(/([로길])\s*\d+(-\d+)?(\s|$)/g, '$1 ') // "로 456" → "로 "
      .replace(/번지\s*\d+/g, '') // "번지 123" 제거
      .replace(/번길\s*\d+/g, '') // "번길 45" 제거
      .replace(/\d+동\s*\d+호/g, '') // "101동 102호" 제거
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * 캐시에 결과 저장
   */
  _cacheResult(location, result) {
    this.geocodeCache.set(location, result);
  }

  /**
   * 실패 원인 로깅
   */
  _logFailureReason(location, cleanedLight, cleanedMedium, cleanedAggressive, marketName) {
    console.group('💡 실패 원인 및 해결 방안');
    console.log('🔍 시도한 검색어:');
    console.log(`   - 원본: "${location}"`);
    console.log(`   - 경량 정제: "${cleanedLight}"`);
    console.log(`   - 중간 정제: "${cleanedMedium}"`);
    console.log(`   - 공격적 정제: "${cleanedAggressive}"`);
    if (marketName) {
      const buildingName = this._extractBuildingName(marketName);
      console.log(`   - 플리마켓 이름: "${marketName}"`);
      if (buildingName) {
        console.log(`   - 추출된 건물명: "${buildingName}"`);
      }
    }
    console.log('');
    console.log('❓ 가능한 원인:');
    console.log('   1. 백엔드 OpenAI가 장소명을 잘못 추출했을 가능성');
    console.log('   2. 카카오맵에 등록되지 않은 신규/소규모 장소');
    console.log('   3. 장소명이 너무 모호하거나 불완전함');
    console.log('   4. 번지수가 부정확하거나 존재하지 않는 주소');
    console.log('');
    console.log('✅ 해결 방안:');
    console.log('   - fleamarket_structured.json의 해당 항목 확인');
    console.log('   - OpenAI 프롬프트 개선 필요');
    console.log('   - 또는 수동으로 Supabase DB에 좌표 추가');
    console.groupEnd();
  }

  /**
   * 캐시 초기화 (필요 시)
   */
  clearCache() {
    this.geocodeCache.clear();
    console.log('✅ Geocoding 캐시 초기화 완료');
  }
}

module.exports = new GeocodingService();
