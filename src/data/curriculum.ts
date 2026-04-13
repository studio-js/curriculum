import { CurriculumData } from '@/types/curriculum';

export const curriculumData: CurriculumData = {
  course: {
    name: 'AI 데이터 인텔리전스 전문가 과정',
    goal: '심화 통계부터 시계열, 최신 LLM 기술을 통합해 비즈니스 난제를 정밀하게 예측/해결하는 고숙련 데이터 과학자 양성',
    jobGroup: 'AI 엔지니어',
    jobRole: '데이터 과학자',
    totalHours: 840,
    projectHours: 378,
    projectRatio: 45,
    startDate: '2026-02-03',
    endDate: '2026-08-28',
  },
  subjects: [
    {
      id: 'python-data-analysis',
      title: '데이터 분석 코딩 with Python',
      category: '정규교과',
      totalHours: 35,
      color: '#111',
      nodes: [
        {
          id: 'python-basics',
          title: '데이터 분석 코딩 with Python',
          hours: 35,
          description:
            '데이터 분석 실무에 필요한 Python 핵심 문법을 익히고, NumPy·Pandas를 활용해 배열 연산과 DataFrame 조작의 기반을 다진다.',
          lessons: [
            {
              title: 'Python 기초: 자료형, 조건문, 반복문',
              hours: 4,
              summary: 'int·float·str·bool 기본 자료형과 if·for·while 제어 흐름을 익힌다. 리스트 컴프리헨션으로 코드를 간결하게 작성하는 패턴을 실습한다.',
              objectives: ['Python 기본 자료형 6가지를 설명할 수 있다', '조건문과 반복문을 조합해 간단한 데이터 처리 로직을 작성한다', '리스트 컴프리헨션으로 기존 코드를 리팩터링한다'],
            },
            {
              title: '함수·클래스·모듈 설계 패턴',
              hours: 4,
              summary: 'def·lambda로 재사용 가능한 함수를 설계하고, 클래스를 활용해 데이터와 로직을 캡슐화하는 방법을 학습한다.',
              objectives: ['인수·키워드 인수·기본값을 활용한 함수를 작성한다', '클래스와 인스턴스의 차이를 이해하고 간단한 데이터 모델을 구현한다', '모듈과 패키지 구조로 코드를 분리·관리한다'],
            },
            {
              title: '리스트·딕셔너리·튜플 자료구조 심화',
              hours: 3,
              summary: '각 자료구조의 시간 복잡도 특성을 이해하고 상황에 맞게 선택하는 기준을 학습한다. 딕셔너리 컴프리헨션과 중첩 구조 처리를 실습한다.',
              objectives: ['list·dict·tuple·set의 연산 복잡도를 비교한다', '딕셔너리 컴프리헨션으로 집계 테이블을 만든다', '중첩된 JSON 형태의 데이터를 평탄화(flatten)한다'],
            },
            {
              title: 'NumPy 배열 생성과 브로드캐스팅 연산',
              hours: 6,
              summary: 'ndarray의 shape·dtype·axis 개념을 이해하고, 브로드캐스팅 규칙을 적용해 루프 없이 대용량 배열 연산을 수행한다.',
              objectives: ['np.array·np.zeros·np.arange로 배열을 생성한다', '브로드캐스팅이 적용되는 조건을 이해하고 shape를 맞춘다', '벡터화 연산으로 Python 루프보다 100배 빠른 코드를 작성한다'],
            },
            {
              title: 'NumPy 슬라이싱·마스킹·집계 함수',
              hours: 4,
              summary: '다차원 배열의 인덱싱·슬라이싱 문법을 익히고, 불리언 마스크로 조건부 필터링을 구현한다. sum·mean·std 등 집계 함수의 axis 파라미터 활용을 실습한다.',
              objectives: ['2D 배열에서 행·열 단위로 슬라이싱한다', '불리언 마스크로 조건에 맞는 요소를 선택·수정한다', 'axis=0/1로 행 방향·열 방향 집계를 수행한다'],
            },
            {
              title: 'Pandas Series와 DataFrame 기초',
              hours: 6,
              summary: 'Series와 DataFrame의 내부 구조(index·values)를 이해하고, CSV·JSON 파일을 읽어 분석 가능한 형태로 변환하는 방법을 학습한다.',
              objectives: ['Series와 DataFrame의 관계를 설명한다', 'pd.read_csv로 실데이터를 불러와 기본 정보를 파악한다', 'dtypes·shape·describe()로 데이터를 빠르게 탐색한다'],
            },
            {
              title: 'DataFrame 인덱싱·필터링·정렬',
              hours: 4,
              summary: 'loc·iloc·at·iat의 차이를 명확히 구분하고, 복합 조건 필터링과 정렬로 원하는 데이터를 추출하는 방법을 실습한다.',
              objectives: ['loc와 iloc의 사용 차이를 구분하고 적절히 선택한다', '& | ~ 연산자로 복합 조건 필터를 작성한다', 'sort_values로 다중 컬럼 정렬을 수행한다'],
            },
            {
              title: '파일 입출력과 실전 미니 분석 실습',
              hours: 4,
              summary: 'CSV·Excel·JSON 형식의 파일을 읽고 저장하는 방법을 학습하고, 실제 공공 데이터를 활용해 간단한 탐색적 분석을 수행하는 미니 프로젝트를 진행한다.',
              objectives: ['다양한 포맷의 파일을 읽고 저장한다', '공공 데이터 1개를 선택해 EDA 체크리스트를 완성한다', '분석 결과를 간단한 차트와 텍스트로 정리해 발표한다'],
            },
          ],
          topics: ['Python 문법', 'NumPy', 'Pandas', '자료구조', '함수형 프로그래밍'],
        },
      ],
    },
    {
      id: 'data-wrangling',
      title: '데이터 분석 워크플로우',
      category: '정규교과',
      totalHours: 105,
      color: '#111',
      nodes: [
        {
          id: 'data-wrangling-node',
          title: '데이터 렝글링',
          hours: 63,
          description:
            '원천 데이터의 결측·이상·중복을 식별하고 처리하는 전처리 파이프라인을 설계한다. 집계·피벗·그룹 연산으로 분석 지표를 도출하고 전처리 전후 분포를 비교하는 실습을 수행한다.',
          lessons: [
            { title: '결측값 유형(MCAR·MAR·MNAR)과 처리 전략', hours: 6 },
            { title: '이상값 탐지: IQR 방법과 Z-score', hours: 5 },
            { title: '중복 제거와 데이터 타입 변환', hours: 4 },
            { title: '문자열 전처리: 정규표현식·str accessor', hours: 5 },
            { title: 'groupby 심화: transform·apply·agg', hours: 7 },
            { title: 'pivot_table과 crosstab 분석', hours: 6 },
            { title: '멀티인덱스와 계층형 데이터 핸들링', hours: 5 },
            { title: '데이터 병합: merge·join·concat 전략', hours: 7 },
            { title: '날짜·시간 데이터 처리 (DatetimeIndex)', hours: 6 },
            { title: '전처리 전후 분포 비교 시각화', hours: 6 },
            { title: '전처리 파이프라인 자동화 실습', hours: 6 },
          ],
          topics: ['결측값·이상값 처리', 'groupby·pivot', '문자열 처리', '데이터 병합', 'Pandas 고급'],
        },
        {
          id: 'workflow-node',
          title: '데이터 분석 워크플로우',
          hours: 28,
          description:
            '문제 정의부터 인사이트 도출까지 데이터 분석의 전 단계를 체계적으로 수행하는 워크플로우를 정립한다. EDA 방법론과 분석 결과를 구조화하여 전달하는 스토리라인 설계를 실습한다.',
          lessons: [
            { title: '데이터 분석 프레임워크: 문제 정의 방법론', hours: 4 },
            { title: 'EDA 단계별 체크리스트와 실습', hours: 6 },
            { title: '단변량·이변량·다변량 분석 패턴', hours: 5 },
            { title: '분석 가설 설정과 검증 사이클', hours: 5 },
            { title: '인사이트 문서화와 리포트 구조화', hours: 4 },
            { title: '전체 워크플로우 통합 실습 프로젝트', hours: 4 },
          ],
          topics: ['EDA 방법론', '문제 정의', '분석 설계', '인사이트 도출', '리포트 구조화'],
        },
        {
          id: 'web-scraping',
          title: '웹 스크레핑 데이터 수집 파이프라인',
          hours: 14,
          description:
            'HTML 문서 구조를 이해하고 BeautifulSoup·Selenium으로 정적·동적 웹 데이터를 수집한다. 반복 수집 자동화 스케줄러를 구현하고 원시 데이터를 분석 가능한 구조로 변환하는 파이프라인을 설계한다.',
          lessons: [
            { title: 'HTML·CSS 구조와 DOM 이해', hours: 2 },
            { title: 'requests + BeautifulSoup 정적 수집', hours: 3 },
            { title: 'Selenium 동적 페이지 크롤링', hours: 3 },
            { title: '반복 수집 자동화·에러 핸들링', hours: 3 },
            { title: '수집 데이터 정제·저장 파이프라인 설계', hours: 3 },
          ],
          topics: ['HTML·DOM', 'BeautifulSoup', 'Selenium', '수집 자동화', '데이터 파이프라인'],
        },
      ],
    },
    {
      id: 'statistics',
      title: '통계적 검정과 인과추정',
      category: '정규교과',
      totalHours: 56,
      color: '#111',
      nodes: [
        {
          id: 'probability',
          title: '확률변수와 확률분포',
          hours: 14,
          description:
            '이산형·연속형 확률분포의 수리적 정의와 성질을 이해한다. 중심극한정리를 활용한 통계적 추론의 기반을 다지고, 표본으로부터 모수를 추정하는 방법론을 학습한다.',
          lessons: [
            { title: '확률의 기초: 사건·조건부 확률·베이즈 정리', hours: 2 },
            { title: '이산 확률분포: 베르누이·이항·포아송', hours: 3 },
            { title: '연속 확률분포: 정규·지수·균등·t분포', hours: 3 },
            { title: '중심극한정리와 표본분포', hours: 3 },
            { title: '점추정과 구간추정(신뢰구간)', hours: 3 },
          ],
          topics: ['이산·연속 확률분포', '정규분포', '중심극한정리', '신뢰구간', '모수 추정'],
        },
        {
          id: 'hypothesis-testing',
          title: '가설검정과 인과효과 추정',
          hours: 28,
          description:
            'A/B 테스트 설계부터 유의성 검정 기법을 실무 데이터에 적용한다. 상관관계와 인과관계의 차이를 명확히 구분하고, 이중차분법(DID)·회귀불연속설계(RDD) 등 준실험적 인과추론 기법을 실습한다.',
          lessons: [
            { title: '가설검정 프레임워크: 귀무·대립가설, p-value', hours: 4 },
            { title: 't-검정: 단일·이표본·대응 표본 비교', hours: 4 },
            { title: '카이제곱 검정과 분산분석(ANOVA)', hours: 4 },
            { title: 'A/B 테스트 설계: 표본 크기·검정력 계산', hours: 4 },
            { title: '상관관계 vs 인과관계: 혼동변수 문제', hours: 4 },
            { title: '이중차분법(Difference-in-Differences)', hours: 4 },
            { title: '회귀불연속설계(RDD)와 도구변수(IV)', hours: 4 },
          ],
          topics: ['A/B 테스트', 't-검정·ANOVA', '귀무가설·p-value', 'DID', 'RDD·IV'],
        },
      ],
    },
    {
      id: 'machine-learning',
      title: '필수 머신러닝',
      category: '정규교과',
      totalHours: 70,
      color: '#111',
      nodes: [
        {
          id: 'supervised-unsupervised',
          title: '지도/비지도 학습 필수 머신러닝',
          hours: 70,
          description:
            '선형 회귀부터 그래디언트 부스팅까지 핵심 지도학습 알고리즘으로 분류·회귀 모델을 구축한다. K-Means·DBSCAN 군집화와 PCA 차원축소를 실습하며, 교차검증과 하이퍼파라미터 튜닝으로 모델 성능을 최적화한다.',
          lessons: [
            { title: 'ML 워크플로우: 데이터 분할·피처 엔지니어링', hours: 5 },
            { title: '선형 회귀와 다중공선성 진단', hours: 5 },
            { title: '로지스틱 회귀와 분류 지표(F1·ROC-AUC)', hours: 5 },
            { title: '의사결정나무와 불순도 기반 분할', hours: 5 },
            { title: '랜덤포레스트와 배깅 앙상블', hours: 6 },
            { title: 'XGBoost·LightGBM 그래디언트 부스팅', hours: 7 },
            { title: '교차검증(K-Fold)과 과적합 방지 전략', hours: 6 },
            { title: '하이퍼파라미터 튜닝: GridSearch·Optuna', hours: 5 },
            { title: 'K-Means 군집화와 엘보우 방법', hours: 5 },
            { title: 'DBSCAN 밀도 기반 군집화', hours: 4 },
            { title: 'PCA 차원축소와 분산 설명량 해석', hours: 5 },
            { title: '피처 중요도와 모델 해석(SHAP)', hours: 6 },
          ],
          topics: ['선형·로지스틱 회귀', 'RandomForest', 'XGBoost·LightGBM', 'K-Means·DBSCAN', 'PCA', 'SHAP'],
        },
      ],
    },
    {
      id: 'sql-analysis',
      title: 'SQL 데이터 분석',
      category: '정규교과',
      totalHours: 42,
      color: '#111',
      nodes: [
        {
          id: 'sql-bigquery',
          title: 'SQL with 빅쿼리',
          hours: 21,
          description:
            'BigQuery 환경에서 윈도우 함수·복합 데이터 타입을 다루는 고급 쿼리를 작성하고, 파티셔닝·클러스터링으로 대용량 데이터 처리를 최적화한다.',
          lessons: [
            { title: 'BigQuery 환경 설정과 기본 쿼리 구조', hours: 2 },
            { title: 'JOIN 심화: INNER·LEFT·CROSS·SELF JOIN', hours: 3 },
            { title: '윈도우 함수: RANK·LAG·LEAD·SUM OVER', hours: 4 },
            { title: 'ARRAY·STRUCT 복합 데이터 타입 핸들링', hours: 4 },
            { title: 'WITH 절(CTE)과 서브쿼리 최적화', hours: 4 },
            { title: '파티셔닝·클러스터링으로 쿼리 비용 절감', hours: 4 },
          ],
          topics: ['표준 SQL', '윈도우 함수', 'ARRAY·STRUCT', 'CTE', 'BigQuery 최적화'],
        },
        {
          id: 'rfm',
          title: 'RFM 고객 세그멘테이션',
          hours: 7,
          description:
            '구매 이력 데이터로 고객별 Recency·Frequency·Monetary 지표를 SQL로 산출하고, 분위수 기반 등급화를 통해 고객 가치 세그먼트를 정의한다.',
          lessons: [
            { title: 'RFM 지표 정의와 SQL 산출 로직', hours: 2 },
            { title: 'NTILE·PERCENTILE로 분위수 등급화', hours: 2 },
            { title: '세그먼트별 행동 분석과 마케팅 전략 도출', hours: 3 },
          ],
          topics: ['RFM 지표', '분위수 등급화', 'NTILE', '고객 세그먼트'],
        },
        {
          id: 'retention',
          title: '리텐션 분석',
          hours: 7,
          description:
            '코호트 분석으로 동일 가입 기간 사용자의 잔존율을 추적한다. Day 1·7·30 리텐션 지표를 SQL로 계산하고 이탈 시점의 행동 패턴을 분석한다.',
          lessons: [
            { title: '코호트 정의와 셀프 조인 쿼리 설계', hours: 2 },
            { title: 'Day 1·7·30 리텐션 지표 계산', hours: 3 },
            { title: '이탈 시점 행동 분석과 제품 개선 포인트 도출', hours: 2 },
          ],
          topics: ['코호트 분석', 'Day N 리텐션', 'SQL 셀프 조인', '이탈 분석'],
        },
        {
          id: 'funnel',
          title: '퍼널분석',
          hours: 7,
          description:
            'AARRR 프레임워크 기반으로 서비스 유입~결제 전환까지 단계별 전환율을 측정하는 퍼널 쿼리를 설계하고, 병목 구간을 정량화한다.',
          lessons: [
            { title: 'AARRR 프레임워크와 단계별 이벤트 정의', hours: 2 },
            { title: '퍼널 쿼리 설계: 조건부 집계와 전환율 계산', hours: 3 },
            { title: '세그먼트별 전환율 비교와 Bottle-neck 진단', hours: 2 },
          ],
          topics: ['AARRR', '전환율 측정', '퍼널 쿼리', 'Bottle-neck 진단'],
        },
      ],
    },
    {
      id: 'data-visualization',
      title: '비즈니스 데이터 시각화',
      category: '정규교과',
      totalHours: 14,
      color: '#111',
      nodes: [
        {
          id: 'interactive-viz',
          title: '인터랙티브 데이터 시각화',
          hours: 14,
          description:
            'Matplotlib으로 분석 맥락에 맞는 차트를 커스터마이징하고, Plotly로 드릴다운·필터 기능이 있는 인터랙티브 대시보드를 구성한다. 데이터 스토리텔링 원칙을 적용해 설득력 있는 시각 리포트를 완성한다.',
          lessons: [
            { title: '차트 유형 선택 원칙: 목적별 최적 시각화', hours: 2 },
            { title: 'Matplotlib 커스터마이징: 주석·색상·레이아웃', hours: 3 },
            { title: 'Plotly 기초: 인터랙티브 차트 제작', hours: 3 },
            { title: 'Plotly Dash로 대시보드 구성', hours: 3 },
            { title: '데이터 스토리텔링과 시각화 리포트 완성', hours: 3 },
          ],
          topics: ['Matplotlib', 'Plotly', 'Plotly Dash', '차트 선택 원칙', '데이터 스토리텔링'],
        },
      ],
    },
    {
      id: 'advanced-stats',
      title: '모형추정을 위한 심화통계',
      category: '정규교과',
      totalHours: 35,
      color: '#111',
      nodes: [
        {
          id: 'bayesian',
          title: '우도 기반 추정과 베이즈 추론',
          hours: 14,
          description:
            '우도함수와 최대우도추정(MLE)의 수리적 도출을 이해하고, 사전·사후분포를 결합하는 베이즈 정리를 실제 데이터에 적용한다.',
          lessons: [
            { title: '우도함수(Likelihood)의 정의와 기하학적 해석', hours: 3 },
            { title: '최대우도추정(MLE): 수식 도출과 실습', hours: 3 },
            { title: '베이즈 정리와 사전·사후분포 업데이트', hours: 4 },
            { title: 'MAP 추정 vs MLE 비교 분석', hours: 4 },
          ],
          topics: ['우도함수·MLE', '베이즈 정리', '사전·사후분포', 'MAP 추정'],
        },
        {
          id: 'em-algorithm',
          title: '잠재변수 혼합모형과 EM 알고리즘',
          hours: 21,
          description:
            '잠재변수를 도입한 Gaussian Mixture Model(GMM)의 구조를 이해하고, E-step·M-step을 반복하는 EM 알고리즘으로 GMM을 학습시켜 확률적 군집화에 적용한다.',
          lessons: [
            { title: '잠재변수 개념과 혼합모형의 필요성', hours: 3 },
            { title: 'Gaussian Mixture Model(GMM) 구조 이해', hours: 4 },
            { title: 'EM 알고리즘: E-step과 M-step 수식 전개', hours: 5 },
            { title: 'GMM 학습·수렴 조건·초기값 민감도 분석', hours: 5 },
            { title: '확률적 세그멘테이션 비즈니스 적용 실습', hours: 4 },
          ],
          topics: ['잠재변수', 'GMM', 'EM 알고리즘', 'E-step·M-step', '확률적 군집화'],
        },
      ],
    },
    {
      id: 'time-series',
      title: '통계 to 딥러닝 시계열 분석',
      category: '정규교과',
      totalHours: 84,
      color: '#111',
      nodes: [
        {
          id: 'arima',
          title: '통계적 시계열 분석 및 ARIMA',
          hours: 7,
          description:
            '정상성 검정으로 시계열 특성을 진단하고 ACF·PACF로 AR·MA 차수를 결정한다. ARIMA 파라미터(p,d,q)를 설정하고 잔차 진단까지 수행한다.',
          lessons: [
            { title: '시계열 구성요소: 추세·계절성·잔차 분해', hours: 2 },
            { title: '정상성 검정: ADF·KPSS 테스트', hours: 1 },
            { title: 'ACF·PACF 분석으로 AR·MA 차수 결정', hours: 2 },
            { title: 'ARIMA(p,d,q) 학습·예측·잔차 진단', hours: 2 },
          ],
          topics: ['정상성 검정', 'ACF·PACF', 'ARIMA', 'ADF·KPSS', '잔차 진단'],
        },
        {
          id: 'smoothing',
          title: '시계열 데이터의 평활화와 예측 기법',
          hours: 7,
          description:
            '이동평균·지수평활법으로 노이즈를 제거하고 추세를 추출한다. Holt-Winters로 추세와 계절성을 동시에 모델링하고 예측 성능을 비교한다.',
          lessons: [
            { title: '단순·가중 이동평균(SMA·WMA) 구현', hours: 2 },
            { title: '지수평활법(SES·DES): 감쇠 계수 조정', hours: 2 },
            { title: 'Holt-Winters 가법·승법 모형과 계절성 처리', hours: 2 },
            { title: '예측 성능 평가: MAE·RMSE·MAPE 비교', hours: 1 },
          ],
          topics: ['이동평균', '지수평활법', 'Holt-Winters', 'MAE·RMSE·MAPE'],
        },
        {
          id: 'ml-timeseries',
          title: 'ML 기반 시계열 예측 프로토타이핑',
          hours: 21,
          description:
            'Prophet으로 시계열을 빠르게 프로토타이핑하고, Lag·Rolling 피처를 엔지니어링해 XGBoost·LightGBM에 적용한다. Walk-forward validation으로 시계열 특화 교차검증을 수행한다.',
          lessons: [
            { title: 'Prophet 설치·설정·계절성 파라미터 튜닝', hours: 4 },
            { title: 'Lag feature와 Rolling statistics 피처 설계', hours: 4 },
            { title: '날짜 파생 변수 생성과 인코딩 전략', hours: 3 },
            { title: 'XGBoost 시계열 회귀 모델 구축', hours: 4 },
            { title: 'Walk-forward validation 교차검증 구현', hours: 3 },
            { title: '앙상블 전략으로 예측 정확도 향상', hours: 3 },
          ],
          topics: ['Prophet', 'XGBoost·LightGBM', 'Lag·Rolling 피처', 'Walk-forward validation'],
        },
        {
          id: 'dl-timeseries',
          title: '딥러닝 시계열 시퀀스 모델링',
          hours: 49,
          description:
            'Darts 프레임워크에서 N-BEATS·TFT 등 최신 딥러닝 시계열 모델을 구현한다. 멀티스텝 예측, 확률적 예측, 어텐션 기반 해석까지 다루며 하이퍼파라미터 최적화를 수행한다.',
          lessons: [
            { title: 'Darts 프레임워크 구조와 TimeSeries 객체', hours: 5 },
            { title: 'N-BEATS: 기저함수 확장 기반 예측 구조', hours: 6 },
            { title: 'N-HiTS: 계층적 샘플링과 보간 전략', hours: 6 },
            { title: 'TFT(Temporal Fusion Transformer) 아키텍처', hours: 8 },
            { title: '멀티스텝·멀티변량 예측 구현', hours: 6 },
            { title: '확률적 예측(Probabilistic Forecasting)과 분위수 추정', hours: 7 },
            { title: '어텐션 가중치 시각화와 피처 중요도 해석', hours: 5 },
            { title: 'Optuna 기반 하이퍼파라미터 자동 최적화', hours: 6 },
          ],
          topics: ['TFT', 'N-BEATS·N-HiTS', 'Darts', '멀티스텝 예측', '확률적 예측', '어텐션'],
        },
      ],
    },
    {
      id: 'nlp',
      title: '비정형 데이터(자연어) 분석',
      category: '정규교과',
      totalHours: 70,
      color: '#111',
      nodes: [
        {
          id: 'nlp-embedding',
          title: '자연어 처리와 임베딩 기초',
          hours: 14,
          description:
            '형태소 분석으로 한국어 텍스트를 전처리하고, TF-IDF의 한계를 이해한 후 Word2Vec·FastText로 분산 표현을 학습한다.',
          lessons: [
            { title: 'KoNLPy 형태소 분석기: Okt·Mecab 비교', hours: 2 },
            { title: '불용어 제거·정규화·텍스트 정제 파이프라인', hours: 2 },
            { title: 'Bag of Words와 TF-IDF 벡터화', hours: 2 },
            { title: 'Word2Vec CBOW·Skip-gram 학습 원리', hours: 3 },
            { title: 'FastText 서브워드 모델과 OOV 처리', hours: 2 },
            { title: '임베딩 유사도 시각화(t-SNE·UMAP)', hours: 3 },
          ],
          topics: ['KoNLPy', 'TF-IDF', 'Word2Vec·FastText', '임베딩', 't-SNE'],
        },
        {
          id: 'topic-modeling',
          title: '토픽모델링과 워드클라우드 시각화',
          hours: 14,
          description:
            'LDA로 문서 집합에서 잠재 토픽을 추출하고 해석한다. pyLDAvis로 토픽 간 거리를 시각화하고 워드클라우드로 핵심 키워드를 표현하는 리포트를 작성한다.',
          lessons: [
            { title: 'LDA 수식 구조: 문서-토픽·토픽-단어 분포', hours: 3 },
            { title: 'LDA 학습·토픽 수 결정(Perplexity·Coherence)', hours: 4 },
            { title: 'pyLDAvis 인터랙티브 토픽 시각화', hours: 3 },
            { title: '워드클라우드 생성과 커스터마이징', hours: 2 },
            { title: '토픽 레이블링과 분석 리포트 작성', hours: 2 },
          ],
          topics: ['LDA', 'pyLDAvis', '워드클라우드', 'Perplexity·Coherence', '토픽 해석'],
        },
        {
          id: 'llm-api',
          title: '프롬프트 엔지니어링과 LLM API 활용',
          hours: 42,
          description:
            'OpenAI·Anthropic API로 텍스트 요약·분류·키워드 추출 파이프라인을 자동화한다. Function Calling·JSON Mode로 비정형 텍스트를 정형화하고, RAG 패턴으로 도메인 특화 QA 시스템을 구현한다.',
          lessons: [
            { title: 'OpenAI API 설정과 Chat Completions 호출', hours: 3 },
            { title: 'Zero-shot·Few-shot 프롬프팅 전략', hours: 4 },
            { title: 'System·User·Assistant 역할 설계 패턴', hours: 3 },
            { title: 'Function Calling으로 구조화 출력 구현', hours: 4 },
            { title: 'JSON Mode와 Pydantic 스키마 정의', hours: 4 },
            { title: '텍스트 요약 자동화 파이프라인 구축', hours: 4 },
            { title: '감성 분류·키워드 추출 파이프라인', hours: 4 },
            { title: '비용 최적화: 모델 선택·캐싱·배치 처리', hours: 3 },
            { title: 'RAG 아키텍처: 임베딩·벡터 DB·검색', hours: 6 },
            { title: 'LangChain 기반 QA 체인 구현', hours: 4 },
            { title: '도메인 특화 LLM 파이프라인 통합 실습', hours: 3 },
          ],
          topics: ['OpenAI·Anthropic API', 'Few-shot 프롬프팅', 'Function Calling', 'RAG', 'LangChain'],
        },
      ],
    },
    {
      id: 'project-insight',
      title: 'Insight digging with ML',
      category: '프로젝트',
      totalHours: 28,
      color: '#111',
      nodes: [
        {
          id: 'insight-project',
          title: 'Insight digging with ML',
          hours: 28,
          description:
            '공개 데이터 또는 자체 수집 데이터에서 비즈니스 가설을 직접 설정하고 ML로 검증하는 자유 탐색 프로젝트. EDA·모델링·인사이트 도출·발표까지 전 과정을 수행한다.',
          lessons: [
            { title: '프로젝트 주제 탐색과 데이터셋 선정', hours: 4 },
            { title: '비즈니스 가설 설정과 분석 설계', hours: 4 },
            { title: 'EDA와 피처 엔지니어링', hours: 6 },
            { title: '모델 학습·평가·개선 이터레이션', hours: 8 },
            { title: '인사이트 도출과 발표 자료 제작', hours: 6 },
          ],
          topics: ['자유 주제', '가설 검증', 'EDA', '피처 엔지니어링', '발표'],
        },
      ],
    },
    {
      id: 'project-viz',
      title: '시각화와 스토리텔링',
      category: '프로젝트',
      totalHours: 14,
      color: '#111',
      nodes: [
        {
          id: 'viz-project',
          title: '시각화와 스토리텔링',
          hours: 14,
          description:
            '의사결정권자를 대상으로 데이터 기반 제안을 설득력 있게 전달하는 시각화 리포트를 제작한다. 시각화 디자인 원칙을 적용해 정보 밀도와 명확성을 높인다.',
          lessons: [
            { title: '스토리라인 설계: Pyramid 구조와 SCQA 프레임워크', hours: 3 },
            { title: '차트 선택 원칙과 색상·주석 활용', hours: 3 },
            { title: 'Streamlit으로 인터랙티브 발표 자료 제작', hours: 4 },
            { title: '피드백 반영과 최종 발표', hours: 4 },
          ],
          topics: ['스토리라인 설계', 'SCQA', 'Streamlit', '데이터 시각화'],
        },
      ],
    },
    {
      id: 'project-demand',
      title: 'Demand Forecasting',
      category: '프로젝트',
      totalHours: 35,
      color: '#111',
      nodes: [
        {
          id: 'demand-project',
          title: 'Demand Forecasting',
          hours: 35,
          description:
            '커머스·물류 도메인 데이터로 SKU별 수요 예측 모델을 구축한다. 계절성·프로모션·외부 변수를 통합하고 앙상블로 정확도를 높인 후 재고 최적화와 연결하는 비즈니스 임팩트를 정의한다.',
          lessons: [
            { title: '수요 예측 도메인 이해와 데이터 탐색', hours: 5 },
            { title: '계절성·프로모션 이벤트 피처 설계', hours: 6 },
            { title: '베이스라인 모델 구축과 성능 평가', hours: 6 },
            { title: '앙상블 전략 수립과 모델 개선', hours: 6 },
            { title: '재고 최적화 로직과 비즈니스 임팩트 정의', hours: 6 },
            { title: '최종 발표 및 피드백', hours: 6 },
          ],
          topics: ['수요 예측', '시계열 피처 엔지니어링', '앙상블', '재고 최적화'],
        },
      ],
    },
    {
      id: 'project-cx',
      title: 'CX 자동화',
      category: '프로젝트',
      totalHours: 35,
      color: '#111',
      nodes: [
        {
          id: 'cx-project',
          title: 'CX 자동화',
          hours: 35,
          description:
            '고객 VOC 데이터를 수집·전처리하고 LLM API로 문의 분류·감성 분석·답변 초안 생성 파이프라인을 구축한다. 자동화 도입 전후 효과를 정량 비교한 최종 보고서를 작성한다.',
          lessons: [
            { title: 'VOC 데이터 수집과 전처리 파이프라인', hours: 5 },
            { title: 'LLM 기반 문의 유형 자동 분류기 구현', hours: 7 },
            { title: '감성 분석 파이프라인 구축', hours: 6 },
            { title: '답변 초안 생성 프롬프트 엔지니어링', hours: 6 },
            { title: '처리 속도·정확도·비용 지표 측정', hours: 5 },
            { title: '자동화 효과 분석과 최종 보고서 작성', hours: 6 },
          ],
          topics: ['VOC 분석', 'LLM 분류', '감성 분석', '자동화 파이프라인', '효과 측정'],
        },
      ],
    },
    {
      id: 'project-aiffel',
      title: '아이펠 365 챌린지',
      category: '프로젝트',
      totalHours: 266,
      color: '#111',
      nodes: [
        {
          id: 'aiffel-project',
          title: '아이펠 365 챌린지',
          hours: 266,
          description:
            '참여기업이 제시한 실제 비즈니스 과제를 팀 단위로 수행하는 장기 해커톤. 문제 정의부터 솔루션 제안까지 기업 멘토와 함께 진행하며, 우수 팀에는 프로젝트 수행비가 지원된다.',
          lessons: [
            { title: '기업 과제 브리핑과 팀 구성', hours: 14 },
            { title: '도메인 이해와 데이터 탐색', hours: 28 },
            { title: '문제 정의 및 분석 설계', hours: 28 },
            { title: '데이터 전처리·피처 엔지니어링', hours: 42 },
            { title: '모델링 및 실험 이터레이션', hours: 56 },
            { title: '솔루션 고도화와 비즈니스 임팩트 정의', hours: 42 },
            { title: '중간 발표 및 멘토 피드백 반영', hours: 28 },
            { title: '최종 발표 및 해커톤 심사', hours: 28 },
          ],
          topics: ['기업 연계', '팀 프로젝트', '비즈니스 문제 정의', '멘토링', '해커톤'],
        },
      ],
    },
    {
      id: 'onboarding',
      title: '온보딩',
      category: '기타',
      totalHours: 14,
      color: '#111',
      nodes: [
        {
          id: 'onboarding-node',
          title: '온보딩',
          hours: 14,
          description:
            '과정 운영 방식을 안내하고 자기주도 학습 루틴을 설계한다. 피어러닝 그룹 구성과 목표 설정 워크숍을 통해 840시간 과정을 효과적으로 이수하기 위한 성장 전략을 수립한다.',
          lessons: [
            { title: '과정 오리엔테이션 및 학습 환경 설정', hours: 4 },
            { title: '자기주도 학습 방법론과 루틴 설계', hours: 4 },
            { title: '피어러닝 그룹 구성과 목표 설정 워크숍', hours: 3 },
            { title: 'Growth Training: 성장 마인드셋 세션', hours: 3 },
          ],
          topics: ['자기주도 학습', '피어러닝', '목표 설정', 'Growth Training'],
        },
      ],
    },
    {
      id: 'career-seminar',
      title: '커리어세미나',
      category: '기타',
      totalHours: 7,
      color: '#111',
      nodes: [
        {
          id: 'seminar-node',
          title: '커리어세미나',
          hours: 7,
          description:
            '데이터 과학자·ML 엔지니어 현직자를 초청해 실무 경험과 커리어 전환 사례를 공유한다. 포트폴리오 전략·기술 면접 준비 방법을 구체적으로 다룬다.',
          lessons: [
            { title: '현직 데이터 과학자 커리어 경로 공유', hours: 2 },
            { title: '포트폴리오 구성 전략과 GitHub 관리', hours: 2 },
            { title: '기술 면접 유형별 준비 전략', hours: 2 },
            { title: 'Q&A 및 네트워킹', hours: 1 },
          ],
          topics: ['현직자 세미나', '커리어 전환', '포트폴리오', '기술 면접'],
        },
      ],
    },
    {
      id: 'offboarding',
      title: '오프보딩',
      category: '기타',
      totalHours: 7,
      color: '#111',
      nodes: [
        {
          id: 'offboarding-node',
          title: '오프보딩',
          hours: 7,
          description:
            '840시간 과정을 마무리하며 개인별 성장을 회고하고 다음 커리어 단계를 설계한다. 수료식과 동기 네트워크 구성, 취업 지원 채널 안내가 포함된다.',
          lessons: [
            { title: '개인 회고: 성장 지표 정리와 포트폴리오 완성', hours: 3 },
            { title: '수료식 및 동기 네트워크 구성', hours: 2 },
            { title: '취업 지원 채널 안내와 이후 학습 로드맵', hours: 2 },
          ],
          topics: ['과정 회고', '포트폴리오 완성', '수료식', '취업 연계'],
        },
      ],
    },
  ],
};
