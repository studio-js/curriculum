export interface CodeOutput {
  type:    'stream' | 'result' | 'error';
  text:    string;
  images?: string[]; // base64 PNG (matplotlib 등)
}

export interface CodeBlock {
  source:  string;
  outputs: CodeOutput[];
}

export interface NotebookSection {
  id:             string;
  markdown:       string;
  codes:          CodeBlock[];
  language:       string;
  markdownImages?: string[];
}

interface RawOutput {
  output_type: string;
  text?:       string | string[];
  data?:       {
    'text/plain'?: string | string[];
    'image/png'?:  string;           // base64
    'image/jpeg'?: string;           // base64
  };
  ename?:     string;
  evalue?:    string;
  traceback?: string[];
}

interface RawCell {
  cell_type: 'markdown' | 'code' | 'raw';
  source:    string | string[];
  outputs?:  RawOutput[];
}

interface RawNotebook {
  cells:    RawCell[];
  metadata?: { language_info?: { name?: string } };
}

function joinSource(src: string | string[]): string {
  return Array.isArray(src) ? src.join('') : src;
}

function parseOutputs(raw: RawOutput[] = []): CodeOutput[] {
  const result: CodeOutput[] = [];
  for (const out of raw) {
    let text   = '';
    let type: CodeOutput['type'] = 'result';
    let images: string[] | undefined;

    if (out.output_type === 'error') {
      type = 'error';
      const header = [out.ename, out.evalue].filter(Boolean).join(': ');
      const trace  = (out.traceback ?? [])
        .map(l => l.replace(/\x1b\[[0-9;]*m/g, ''))
        .filter(l => !l.startsWith('---'))
        .slice(-4)
        .join('\n');
      text = [header, trace].filter(Boolean).join('\n');

    } else if (out.output_type === 'stream') {
      text = joinSource(out.text ?? '');

    } else if (out.output_type === 'execute_result' || out.output_type === 'display_data') {
      /* 텍스트 출력 */
      const plain = out.data?.['text/plain'];
      text = plain ? joinSource(plain) : '';

      /* 이미지 출력 (matplotlib 등) */
      const png  = out.data?.['image/png'];
      const jpeg = out.data?.['image/jpeg'];
      if (png || jpeg) {
        images = [];
        if (png)  images.push(`data:image/png;base64,${png.replace(/\n/g, '')}`);
        if (jpeg) images.push(`data:image/jpeg;base64,${jpeg.replace(/\n/g, '')}`);
      }
    }

    if (text.trim() || images?.length) {
      result.push({ type, text: text.trimEnd(), ...(images ? { images } : {}) });
    }
  }
  return result;
}

function extractMarkdownImages(markdown: string): { text: string; images: string[] } {
  const images: string[] = [];
  const imageRegex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
  let text = markdown;
  let match;

  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push(match[2]);
  }
  text = text.replace(imageRegex, '');
  imageRegex.lastIndex = 0;

  return { text, images };
}

export function parseNotebook(notebook: RawNotebook): NotebookSection[] {
  const language = notebook.metadata?.language_info?.name ?? 'python';
  const sections: NotebookSection[] = [];
  let current: NotebookSection | null = null;

  for (const cell of notebook.cells) {
    const source = joinSource(cell.source).trim();
    if (!source) continue;

    if (cell.cell_type === 'markdown') {
      if (current) sections.push(current);
      const { text, images } = extractMarkdownImages(source);
      current = { id: `section-${sections.length}`, markdown: text, codes: [], language, markdownImages: images };
    } else if (cell.cell_type === 'code') {
      if (!current) current = { id: 'section-0', markdown: '', codes: [], language };
      current.codes.push({ source, outputs: parseOutputs(cell.outputs) });
    }
  }

  if (current) sections.push(current);
  return sections;
}

/** 구버전 localStorage (codes: string[]) 호환 변환 */
function normalizeCode(c: unknown): CodeBlock {
  if (typeof c === 'string') return { source: c, outputs: [] };
  const block = c as Partial<CodeBlock>;
  return { source: block.source ?? '', outputs: block.outputs ?? [] };
}

/** localStorage에서 불러온 데이터 정규화 (구버전 호환) */
export function normalizeSections(data: unknown[]): NotebookSection[] {
  return data.map((sec: unknown) => {
    const s = sec as NotebookSection & { codes: unknown[] };
    return { ...s, codes: (s.codes ?? []).map(normalizeCode) };
  });
}
