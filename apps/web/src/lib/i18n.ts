export const messages = {
  brand: 'Clause',
  navigation: { documents: '문서', templates: '템플릿', members: '멤버', settings: '설정' },
  organization: { name: 'Acme 조직', plan: '현재 요금제', seats: '좌석', memberCount: '3명 사용 중', managePlan: '요금제 관리', switchLabel: '조직 전환', switchNotice: 'Acme 조직에서 보고 있습니다.', planNotice: '요금제 관리는 다음 단계에서 연결할 수 있어요.' },
  dashboard: {
    eyebrow: 'Acme 조직', title: '문서, 한눈에 확인하세요.', description: '계약의 현재 상태와 다음 할 일을 한 곳에서 관리합니다.',
    newDocument: '새 문서 만들기', recent: '최근 문서', viewAll: '전체 보기', empty: '아직 문서가 없습니다.', newDocumentHint: '새 계약 문서의 이름을 입력하세요.', newDocumentPlaceholder: '예: 2026 파트너십 계약', createdNotice: '문서를 만들 준비가 되었어요.',
  },
  document: { owner: '소유자', updated: '최근 수정', status: '상태', open: '문서 열기' },
  actions: { cancel: '취소', create: '문서 만들기' },
  profile: '민서 김', profileInitials: 'MK', notifications: '새 알림이 없습니다.', themeNotice: '컬러 모드 전환은 다음 단계에서 연결할 수 있어요.',
  viewer: { eyebrow: 'Acme 조직 · 문서 뷰어', allDocuments: '모든 문서', share: '공유', moreNotice: '추가 작업 메뉴는 다음 단계에서 연결할 수 있어요.', shareNotice: '공유 링크를 준비하고 있어요.', reviewNotice: '검토 완료로 표시할 준비가 되었어요.', backNotice: '문서 목록은 다음 단계에서 연결할 수 있어요.', markReviewed: '검토 완료', version: '버전', contents: '문서 안에서 이동', summary: '요약', parties: '계약 당사자', confidentiality: '비밀유지', term: '계약 기간', signatures: '서명', compare: '변경 비교', compareNotice: '버전 비교 화면은 다음 단계에서 연결할 수 있어요.', intro: '본 계약서는 Acme 조직과 파트너 간 협업을 위한 기본 조건을 정리합니다. 아래 내용을 확인하고 의견을 남겨 주세요.', partiesCopy: 'Acme 조직(이하 “회사”)과 파트너(이하 “상대방”)는 상호 신뢰를 바탕으로 본 계약을 체결합니다.', confidentialityCopy: '양 당사자는 업무 중 알게 된 상대방의 비공개 정보를 안전하게 보호하며, 계약 목적 외에는 사용하지 않습니다.', highlight: '검토 메모 · 비공개 정보의 범위는 별첨 A에 정의된 내용을 따릅니다.', termCopy: '계약은 서명일로부터 12개월 동안 유효합니다. 어느 한쪽이 30일 전에 서면으로 알리면 갱신하지 않을 수 있습니다.', signaturesCopy: '양 당사자의 권한 있는 담당자가 전자 서명하면 계약이 성립합니다.', end: '문서 끝', details: '문서 정보', reviewers: '검토자', permission: '접근 권한', permissionValue: '조직 멤버 전체', comments: '댓글', commentOne: '비밀정보의 범위를 한 번 더 확인해 주세요.', commentTwo: '기간 조항은 이대로 진행해도 좋습니다.', commentTime: '오늘, 오전 9:12', commentTimeTwo: '어제, 오후 5:40', addComment: '댓글 남기기', commentNotice: '댓글 입력은 다음 단계에서 연결할 수 있어요.' },
  status: { review: '검토 중', draft: '초안', signed: '서명 완료', complete: '완료' },
  accessibility: { theme: '컬러 모드 전환', notifications: '알림', mainMenu: '주요 메뉴' },
} as const;

export type Messages = typeof messages;
export const t = messages;
