# marketing

마케팅 인사이트를 위한 실험 도구 모음. 게임 시장 데이터를 직접 수집·분석해서
"통념"이 아니라 데이터로 마케팅 판단을 내리기 위한 프로젝트들이다.

## 프로젝트

### insight1 — 코옵 vs 싱글플레이어: 승자독식 구조 검증

온라인 코옵 게임의 입소문은 친구 그룹의 동시 수렴이라는 조정(coordination) 구조로
작동하므로, 싱글 내러티브 게임보다 성공 분포가 더 극단적인 승자독식 형태를 보일
것이라는 가설을 스팀 리뷰 데이터(8만여 게임)로 검증한다. 멱함수 꼬리 지수, 빈
허리(missing middle), 지니 계수·상위 점유율의 세 갈래로 분석.

- **결과 리포트 (라이브)**: https://marketing-insight-1.mjshin82.workers.dev/
- 수집 파이프라인: `insight1/collect/` (SteamSpy + Steam 공식 API, 체크포인트 재개)
- 분석: `insight1/analysis/` (powerlaw, dip test, 부트스트랩)
- 웹 리포트: `insight1/web/` (Svelte 5 + ECharts 6, Cloudflare Workers 배포)

## 제작자

Concode 개발자. 스팀 게임 **Graytail**을 만들고 있다.

- Graytail on Steam: https://store.steampowered.com/app/2888960/Graytail/
