/**
 * api.js
 * 2026 부산대학교 직무연수 구글 시트 GViz 실시간 연동 모듈
 */

const SHEET_ID = '1sWeq6LCPTp0I6ith07XQizLm-KcDvAcbeNZBHkOBOvk';
const SHEET_NAME = 'data';
const GVIZ_BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&headers=1`;

// 캐시 저장소 (세션 단위 빠른 탐색 지원 및 강제 새로고침 지원)
let cachedCourses = null;
let lastFetchTime = null;

/**
 * 구글 시트에서 최신 CSV 데이터를 가져와 파싱하여 반환합니다.
 * @param {boolean} forceRefresh 캐시를 무시하고 실시간 재조회할지 여부
 * @returns {Promise<Array>} 파싱된 연수 과정 목록
 */
async function fetchCourses(forceRefresh = false) {
  if (!forceRefresh && cachedCourses) {
    return cachedCourses;
  }

  // 캐시 방지를 위해 현재 타임스탬프 파라미터 추가
  const requestUrl = `${GVIZ_BASE_URL}&_t=${Date.now()}`;

  try {
    const response = await fetch(requestUrl, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache' }
    });

    if (!response.ok) {
      throw new Error(`구글 시트 데이터를 불러오지 못했습니다 (HTTP 상태: ${response.status})`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      // PapaParse 전역 객체 확인
      if (typeof Papa === 'undefined') {
        reject(new Error('PapaParse 라이브러리가 로드되지 않았습니다.'));
        return;
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.warn('CSV 파싱 경고:', results.errors);
          }

          // 데이터 정제 및 유효성 검사 (과정코드가 존재하는 행만 추출)
          const courses = results.data
            .filter(row => row['과정코드'] && row['과정코드'].trim() !== '')
            .map(row => {
              // 불릿(·) 또는 줄바꿈으로 구분된 항목 배열화
              const parseList = (str) => {
                if (!str) return [];
                return str.split(/[·\n]/)
                  .map(s => s.trim())
                  .filter(s => s.length > 0);
              };

              return {
                code: (row['과정코드'] || '').trim(),
                title: (row['과정명'] || '').trim(),
                category: (row['분야'] || '기타').trim(),
                target: (row['대상'] || '전 직원').trim(),
                requirement: (row['이수구분'] || '선택').trim(),
                method: (row['교육방식'] || '온라인').trim(),
                hours: (row['교육시간'] || '').trim(),
                capacity: (row['정원'] || '무제한').trim(),
                period: (row['교육기간'] || '').trim(),
                applyPeriod: (row['신청기간'] || '').trim(),
                department: (row['담당부서'] || '').trim(),
                summary: (row['한줄소개'] || '').trim(),
                description: (row['상세소개'] || '').trim(),
                objectives: parseList(row['학습목표']),
                contents: parseList(row['주요내용']),
                rawObjectives: (row['학습목표'] || '').trim(),
                rawContents: (row['주요내용'] || '').trim(),
                applyLink: (row['신청링크'] || '#').trim(),
                contact: (row['문의'] || '').trim()
              };
            });

          cachedCourses = courses;
          lastFetchTime = new Date();
          resolve(courses);
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  } catch (err) {
    console.error('fetchCourses 에러:', err);
    throw err;
  }
}

/**
 * 특정 과정코드로 단일 과정 조회
 * @param {string} code 과정코드 (예: 'PNU-2026-001')
 * @returns {Promise<Object|null>}
 */
async function getCourseByCode(code) {
  const courses = await fetchCourses();
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  return courses.find(c => c.code.toUpperCase() === cleanCode) || null;
}

/**
 * 통계 지표 계산
 */
function computeStats(courses) {
  const total = courses.length;
  const mandatory = courses.filter(c => c.requirement === '필수' || c.requirement.includes('필수')).length;
  const online = courses.filter(c => c.method.includes('온라인')).length;
  const categories = [...new Set(courses.map(c => c.category))];
  
  return {
    total,
    mandatory,
    online,
    categoryCount: categories.length
  };
}

// 전역 노출
window.PNU_API = {
  fetchCourses,
  getCourseByCode,
  computeStats,
  getLastFetchTime: () => lastFetchTime
};
