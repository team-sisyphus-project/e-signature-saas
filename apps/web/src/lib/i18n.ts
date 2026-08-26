export const messages = {
  brand: 'Clause',
  navigation: { documents: '문서', templates: '템플릿', members: '멤버', settings: '설정' },
  dashboard: {
    eyebrow: 'Acme 조직', title: '문서, 한눈에 확인하세요.', description: '계약의 현재 상태와 다음 할 일을 한 곳에서 관리합니다.',
    newDocument: '새 문서 만들기', recent: '최근 문서', viewAll: '전체 보기', empty: '아직 문서가 없습니다.',
  },
  document: { owner: '소유자', updated: '최근 수정', status: '상태', open: '문서 열기' },
  status: { review: '검토 중', draft: '초안', signed: '서명 완료', complete: '완료' },
  accessibility: { theme: '컬러 모드 전환', notifications: '알림' },
} as const;

export type Messages = typeof messages;
export const t = messages;
