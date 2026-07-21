# insight1 — 코옵 vs 싱글플레이어 승자독식 구조 검증

스팀 인디게임 리뷰 수 분포로 "온라인 코옵의 입소문 조정 구조가 더 극단적인
승자독식 분포를 만든다"는 가설을 검증하는 프로젝트.

## 구조

- `collect/pipeline.py` — 수집 파이프라인 (SQLite 체크포인트, 중단/재개 가능)
  - `master`: SteamSpy `request=all` 페이징 (60초당 1회)
  - `enrich`: 3개 워커 스레드
    - SteamSpy `appdetails` (태그 → 코호트 후보 분류, 초당 ~1회)
    - Steam 공식 `appdetails` (출시일/타입/카테고리, 1.6초 간격 + 429 백오프)
    - Steam `appreviews` (최종 통과 게임의 공식 리뷰 총수)
  - `build`: 최종 필터 적용 후 `data/games.csv` 생성
  - `status`: 진행 상황 출력
- `analysis/` — tail.py (멱함수), middle.py (빈 허리), concentration.py (집중도),
  robustness.py (강건성), run_all.py (전체 실행 + REPORT.md 생성)
- `data/collect.sqlite` — 수집 체크포인트 DB
- `data/games.csv` — 최종 데이터셋
- `REPORT.md` — 결과 보고서

## 설계 노트

- SteamSpy `request=tag` 벌크 엔드포인트는 2026-07 현재 `{}`만 반환 (사실상 폐기).
  따라서 게임별 `appdetails`로 태그를 확보한다.
- 게임 처리 순서는 `appid × 2654435761 mod 2^32` (Knuth 곱셈 해시)로 결정적
  셔플 — 중단 시점까지의 처리분이 항상 풀의 무작위 표본이 되도록 보장.
- 리뷰 수는 스팀 공식 `appreviews`를 우선 사용, 실패 시 SteamSpy
  positive+negative 폴백 (`review_source` 컬럼).
- 코호트 A: 태그 ("Online Co-Op" ∨ "Co-op") ∧ "Multiplayer"
- 코호트 B: "Singleplayer" ∧ ("Story Rich" ∨ "Adventure" ∨ "Puzzle") ∧
  ¬(코옵/멀티 계열 태그)
- 공통 필터: 유료, 초기가 <$40, type=game, 2022-01-01~2025-06-30 출시,
  대형 퍼블리셔 제외. 리뷰 <10 게임은 CSV에 포함하되 분석에서는 조기 소멸률
  계산에만 사용.

## 실행

```bash
.venv/bin/python collect/pipeline.py master            # 전체 마스터 목록
.venv/bin/python collect/pipeline.py enrich            # 전체 보강 (수 시간~하루)
.venv/bin/python collect/pipeline.py build
.venv/bin/python analysis/run_all.py
```

파일럿: `enrich --target-per-cohort 200`
