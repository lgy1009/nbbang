# N빵 계산기 설계 (DESIGN)

## 1. 화면 구성
한 페이지(`/`) 안에서 화면을 바꾼다. 주소 끝 `#trip=<id>`로 지금 연 여행을 기억해 휴대폰 "뒤로" 버튼이 목록으로 돌아가게 한다.
- 화면 1: 여행 목록 — 저장된 여행 카드(이름·인원·총액), "새 여행" 버튼, "이 기기에만 저장돼요" 안내
- 화면 2: 여행 상세 — 위쪽에 여행 이름(고치기), 탭 3개
  - 사람: 이름 추가·고치기·빼기(지출에 쓰인 사람은 뺄 수 없음)
  - 지출: 지출 목록, "지출 추가" 폼(내용·금액·통화·낸 사람·나눌 사람 칩), 고치기·지우기
  - 정산: 정산 통화·환율 입력, 송금 목록, 사람별 요약, "카톡으로 복사" 버튼, 여행 지우기

## 2. 데이터 흐름
1. 사용자가 사람·지출·환율을 입력한다.
2. 브라우저 안에서 지출을 정산 통화의 정수 금액으로 바꾸고, 사람별 차액 → 최소 송금 목록을 계산한다.
3. 화면이 결과를 보여 주고, 바뀔 때마다 localStorage에 저장한다.

## 3. API
없음. 서버로 보내는 요청이 없다.

## 4. 데이터 형태
```ts
type Currency = "EUR" | "KRW";
interface Member { id: string; name: string }
interface Expense {
  id: string;
  title: string;
  amount: number;      // 정수: EUR은 센트, KRW는 원
  currency: Currency;
  payerId: string;
  splitIds: string[];  // 나눌 사람 (최소 1명)
  createdAt: number;
}
interface Trip {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  settleCurrency: Currency;
  krwPerEur: number | null; // 1 EUR = ? KRW
  createdAt: number;
  updatedAt: number;
}
// localStorage["nbbang:v1"] = { version: 1, trips: Trip[] }
```

### 정산 계산
1. 지출마다 금액을 정산 통화 정수로 바꾼다 (EUR→KRW: 센트×환율÷100 반올림, KRW→EUR: 원÷환율×100 반올림).
2. 나눌 사람 수로 나누고, 나머지는 나눌 사람 목록 앞에서부터 1씩 더 낸다. → 합이 정확히 맞는다.
3. 사람별 차액 = 낸 돈 − 쓴 돈.
4. 차액이 0이 아닌 사람들을 "합이 0인 묶음"으로 최대한 많이 나눈다(비트마스크 DP, 16명까지). 송금 수 = 사람 수 − 묶음 수 → 최소.
5. 각 묶음 안에서는 가장 많이 받을 사람에게 가장 많이 보낼 사람이 보낸다(묶음 크기 − 1번).
6. 16명을 넘으면 5번만 전체에 적용한다(근사).

## 5. 보안 점검표
- [x] 비밀 값이 코드·로그에 없다 (앱은 비밀 값을 쓰지 않음)
- [x] 입력값을 다시 검증한다 (서버가 없으므로 브라우저에서: 금액 범위·길이 제한, 저장값 형식 검사)
- [x] 외부 주소 접속 없음 (fetch·외부 스크립트 없음)
- [x] 다른 사이트의 요청을 막는다: 받는 API가 없음. 보안 헤더(X-Frame-Options 등)를 붙인다.
- [x] 결과를 서버에 저장하지 않는다 (localStorage만)
- [x] 사람 이름 등 입력값은 React가 글자로만 그려 HTML로 해석되지 않는다 (`dangerouslySetInnerHTML` 사용 안 함)

## 6. 디자인
- 느낌: 다이어리·레트로 스티커. 크림색 모눈 종이 배경, 진한 잉크색 테두리와 살짝 비낀 그림자, 마스킹테이프 모양 제목.
- 색: 종이 #FBF6EC, 잉크 #3B3A36, 코랄 #F4A6A0, 민트 #B5DCC5, 버터 #FFE38F, 하늘 #B9D4EE
- 글꼴: 제목·버튼 Jua(동글 귀여움), 본문 Gowun Dodum — `next/font`로 빌드 때 사이트 안에 포함
- 모서리·버튼: 둥근 모서리 + 2px 잉크 테두리 + 3px 그림자, 누르면 그림자가 줄며 눌리는 느낌
- 휴대폰 우선: 최대 폭 480px 가운데 정렬, 손가락으로 누르기 쉬운 44px 이상 버튼

## 7. 배포
- Vercel, 지역 icn1, 환경 변수: 없음
- 접근 보호: 공개 (PRD 7번)
