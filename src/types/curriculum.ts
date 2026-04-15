export type Category = '정규교과' | '프로젝트' | '기타';

export interface Lesson {
  title: string;
  hours: number;
  summary?: string;
  objectives?: string[];
  notebookPath?: string; // 예: '/notebooks/python-basics-01.ipynb'
}

export interface Node {
  id: string;
  title: string;
  hours: number;
  description: string;
  lessons: Lesson[];
  topics: string[];
}

export interface Subject {
  id: string;
  title: string;
  category: Category;
  totalHours: number;
  color: string;
  nodes: Node[];
}

export interface CourseInfo {
  name: string;
  goal: string;
  jobGroup: string;
  jobRole: string;
  totalHours: number;
  projectHours: number;
  projectRatio: number;
  startDate: string;
  endDate: string;
}

export interface CurriculumData {
  course: CourseInfo;
  subjects: Subject[];
}
