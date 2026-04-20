export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  definition: string;
}

export const glossaryEntries: GlossaryEntry[] = [
  /* ── 임베딩 ── */
  {
    term: '임베딩',
    aliases: ['Embedding'],
    definition: '단어·문장의 의미를 보존하면서 수치 벡터로 변환하는 표현 방법. 비슷한 의미의 단어는 벡터 공간에서 서로 가까운 위치에 배치됩니다.',
  },
  {
    term: '임베딩 모델',
    definition: '텍스트를 수치 벡터(임베딩)로 변환하도록 학습된 신경망 모델. Word2Vec, GloVe, BERT, sentence-transformers 등이 있습니다.',
  },

  /* ── 인코딩 / 벡터화 ── */
  {
    term: '인코딩',
    aliases: ['Encoding'],
    definition: '글자나 단어에 숫자를 대응시키는 가장 기본적인 표현 방법. ASCII, 유니코드 등이 이에 해당하며 의미 정보는 담지 않습니다.',
  },
  {
    term: '벡터화',
    aliases: ['Vectorization'],
    definition: '텍스트 등 비정형 데이터를 수치 벡터로 변환하는 과정. 원-핫 인코딩, TF-IDF, 임베딩 등 다양한 방법이 존재합니다.',
  },
  {
    term: '원-핫 인코딩',
    aliases: ['One-Hot Encoding', 'One-Hot'],
    definition: '단어 사전 크기의 벡터에서 해당 단어 위치만 1, 나머지는 0으로 표현하는 방식. 단어 수가 많을수록 거대한 희소 행렬이 됩니다.',
  },
  {
    term: 'TF-IDF',
    definition: 'Term Frequency-Inverse Document Frequency. 단어 빈도(TF)와 역문서 빈도(IDF)의 곱으로, 문서 내에서 자주 등장하지만 전체 문서에서는 희귀한 단어에 높은 점수를 부여합니다.',
  },

  /* ── 벡터 & 유사도 ── */
  {
    term: '벡터',
    aliases: ['Vector'],
    definition: '여러 숫자들의 순서 있는 목록. N차원 공간의 한 점(좌표)으로 표현되며, 임베딩은 각 단어/문장을 하나의 벡터로 나타냅니다.',
  },
  {
    term: '코사인 유사도',
    aliases: ['Cosine Similarity'],
    definition: '두 벡터가 이루는 각도의 코사인 값으로 유사도를 측정하는 지표 (-1 ~ +1). 크기가 아닌 방향을 비교하므로 벡터 길이에 영향을 받지 않습니다.',
  },
  {
    term: '내적',
    aliases: ['Dot Product'],
    definition: '두 벡터의 같은 위치 값을 곱해 합산한 값. 코사인 유사도 계산의 기초가 되며, 두 벡터의 방향 유사성을 나타냅니다.',
  },

  /* ── 주요 모델 ── */
  {
    term: 'Word2Vec',
    definition: '2013년 Google이 개발한 단어 임베딩 모델의 선구자. 주변 단어를 예측하는 방식(CBOW·Skip-gram)으로 의미 관계를 학습합니다.',
  },
  {
    term: 'GloVe',
    definition: '2014년 Stanford에서 개발한 임베딩 모델. 전체 말뭉치의 동시 출현(co-occurrence) 통계를 활용해 단어 벡터를 학습합니다.',
  },
  {
    term: 'BERT',
    definition: '2018년 Google이 공개한 양방향 트랜스포머 기반 언어 모델. 앞뒤 문맥을 모두 고려하는 문맥 의존적 임베딩을 생성하며, 많은 NLP 태스크의 기초가 됩니다.',
  },
  {
    term: 'sentence-transformers',
    aliases: ['Sentence Transformers'],
    definition: 'Hugging Face의 오픈소스 임베딩 라이브러리. 무료로 사용 가능하며 한국어를 포함한 다국어를 지원합니다.',
  },

  /* ── 차원 축소 & 시각화 ── */
  {
    term: 't-SNE',
    definition: 't-Distributed Stochastic Neighbor Embedding. 고차원 데이터를 2D/3D로 시각화하는 차원 축소 기법으로, 가까운 점들의 지역 구조 보존에 강합니다. 클러스터 간 거리는 의미 없음에 주의합니다.',
  },
  {
    term: 'UMAP',
    definition: 'Uniform Manifold Approximation and Projection. 전역·지역 구조를 모두 보존하는 차원 축소 기법. t-SNE보다 빠르지만 하이퍼파라미터에 민감합니다.',
  },
  {
    term: '차원 축소',
    aliases: ['Dimensionality Reduction'],
    definition: '수백~수천 차원의 고차원 데이터를 2D·3D 등 저차원으로 변환하는 기법. 시각화, 연산 효율화, 과적합 방지 등에 활용됩니다.',
  },

  /* ── 클러스터링 & 평가 ── */
  {
    term: '클러스터링',
    aliases: ['Clustering'],
    definition: '라벨 없이 비슷한 데이터를 자동으로 그룹화하는 비지도 학습 기법. K-Means, DBSCAN 등이 대표적입니다.',
  },
  {
    term: 'ARI',
    aliases: ['Adjusted Rand Index'],
    definition: 'Adjusted Rand Index. 클러스터링 결과와 실제 정답 레이블의 일치도를 측정하는 지표. 1.0이면 완벽 일치, 0에 가까우면 무작위 수준입니다.',
  },
  {
    term: '실루엣 점수',
    aliases: ['Silhouette Score'],
    definition: '클러스터 내 밀집도(a)와 클러스터 간 분리도(b)를 수치화한 지표. (b-a)/max(a,b)로 계산되며 -1 ~ 1 범위에서 1에 가까울수록 좋습니다.',
  },

  /* ── 검색 ── */
  {
    term: '의미 기반 검색',
    aliases: ['Semantic Search'],
    definition: '키워드 정확 일치 대신 임베딩 벡터의 코사인 유사도로 검색하는 방식. 동의어·유의어("핸드폰" → "스마트폰")도 검색이 가능합니다.',
  },

  /* ── 일반 기술 용어 ── */
  {
    term: '희소 행렬',
    aliases: ['Sparse Matrix'],
    definition: '대부분의 값이 0인 행렬. 원-핫 인코딩은 단어 수가 늘수록 거대한 희소 행렬을 만들어 메모리와 연산이 비효율적입니다.',
  },
  {
    term: '유니코드',
    aliases: ['Unicode'],
    definition: '전 세계 모든 문자(한글, 한자, 이모지 등)를 하나의 체계로 표준화한 국제 문자 인코딩. ASCII의 한계를 극복하기 위해 만들어졌습니다.',
  },
  {
    term: 'ASCII',
    definition: 'American Standard Code for Information Interchange. 영문자·숫자·기본 기호를 7비트(0~127) 숫자로 표현한 초기 문자 인코딩 표준. 한글 등 비서양 문자는 표현할 수 없습니다.',
  },
  {
    term: 'LLM',
    definition: 'Large Language Model(대규모 언어 모델). 수천억 개의 파라미터를 가진 거대 AI 언어 모델. GPT-4, Claude, Gemini, LLaMA 등이 해당됩니다.',
  },
  {
    term: '하이퍼파라미터',
    aliases: ['Hyperparameter'],
    definition: '모델 학습 이전에 사람이 직접 설정하는 파라미터. 학습률, 배치 크기, 클러스터 수 등이 해당되며, 학습 과정에서 자동으로 조정되지 않습니다.',
  },
  {
    term: '말뭉치',
    aliases: ['코퍼스', 'Corpus'],
    definition: '자연어 처리 모델 학습에 사용하는 대규모 텍스트 데이터 집합. 위키피디아, 뉴스 기사, 책 등 다양한 출처의 텍스트로 구성됩니다.',
  },
  {
    term: '파인튜닝',
    aliases: ['Fine-tuning'],
    definition: '사전 학습된 모델을 특정 태스크나 도메인 데이터로 추가 학습하는 기법. 대량의 데이터 없이도 원하는 분야에 모델을 특화시킬 수 있습니다.',
  },
  {
    term: 'RAG',
    definition: 'Retrieval-Augmented Generation. LLM이 답변을 생성할 때 외부 지식베이스에서 관련 문서를 검색해 참조하는 기법. 환각(hallucination)을 줄이고 최신 정보를 활용할 수 있습니다.',
  },
];

/* ── 내부 조회 구조 (모듈 로드 시 1회만 빌드) ── */

// 길이 내림차순 정렬 — 긴 용어가 먼저 매칭되어 부분 매칭 방지
const _sorted = glossaryEntries
  .flatMap(e => [e.term, ...(e.aliases ?? [])].map(t => ({ text: t, entry: e })))
  .sort((a, b) => b.text.length - a.text.length);

export const glossaryMap: Map<string, GlossaryEntry> = new Map(
  _sorted.map(({ text, entry }) => [text, entry])
);

// ASCII 전용 여부 판별 → word boundary 적용 여부 결정
function _escape(term: string): string {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isAscii = /^[\x20-\x7E]+$/.test(term);
  return isAscii ? `(?<![\\w-])${esc}(?![\\w-])` : esc;
}

export const glossaryRegex = new RegExp(
  `(${_sorted.map(({ text }) => _escape(text)).join('|')})`,
  'g'
);

/* ── 노트북별 용어집 생성 헬퍼 ── */

/**
 * 마크다운 텍스트를 스캔해 마스터 용어집에서 실제 등장하는 항목만 반환.
 * 여러 섹션의 텍스트를 합쳐서 넘기면 됩니다.
 */
export function filterGlossaryForContent(content: string): GlossaryEntry[] {
  const found = new Map<string, GlossaryEntry>();
  const re = new RegExp(glossaryRegex.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const entry = glossaryMap.get(m[0]);
    if (entry && !found.has(entry.term)) {
      found.set(entry.term, entry);
    }
  }
  return Array.from(found.values());
}

/** entries 배열로부터 map 과 regex 를 빌드해 반환. */
export function buildNotebookGlossary(entries: GlossaryEntry[]): {
  map: Map<string, GlossaryEntry>;
  regex: RegExp;
} {
  if (!entries.length) return { map: new Map(), regex: /(?!)/ };

  const sorted = entries
    .flatMap(e => [e.term, ...(e.aliases ?? [])].map(t => ({ text: t, entry: e })))
    .sort((a, b) => b.text.length - a.text.length);

  const map = new Map<string, GlossaryEntry>(sorted.map(({ text, entry }) => [text, entry]));
  const regex = new RegExp(`(${sorted.map(({ text }) => _escape(text)).join('|')})`, 'g');
  return { map, regex };
}
