# 데모 영상 / 애니메이션 내보내기

데모 하단 Export 패널에서 MP4, GIF, APNG를 저장할 수 있습니다. 이 기능은 데모 전용이며 npm public API에는 인코더를 추가하지 않습니다.

- 화면 비율: 1:1, 9:16, 16:9.
- MP4: 540p / 1080p, 12 / 15 / 24 / 30 FPS.
- GIF / APNG: 540p, 12 / 15 FPS. 모든 포맷은 4~30초.
- 연출: 즉시 타일 노출·카메라 이동 → 마을 느린 줌인 → QR 복귀.
- 낮, 밤, 낮→밤→낮 순환 선택. 회전 기본값은 꺼짐입니다. Rotate while zooming을 켜면 줌인 중 시작 방향을 기준으로 FINAL ROTATION에 설정한 각도까지 회전합니다. 각도는 −360°~360°이며 기본 90°, 음수는 반대 방향입니다. QR 복귀 중에는 회전도 원래 방향으로 돌아옵니다.
- 시작과 끝은 같은 QR 화면으로 맞춰 반복 재생 경계를 줄입니다. MP4 재생 반복은 플레이어나 업로드 서비스가 결정하며 GIF/APNG에는 무한 반복 정보를 기록합니다. 마을 유지 구간에 ZOOM IN (%)에 설정한 비율만큼 천천히 확대하고 복귀 시 원래 줌으로 돌아옵니다.
- 변환 진행률, 취소, 결과 미리보기, 다운로드를 제공합니다. 모든 캡처·인코딩은 브라우저에서 실행하며 프레임을 서버로 업로드하지 않습니다.

## 구현

`demo/export/ExportPanel.tsx`가 설정 UI와 결과 URL을 관리하고, 내보내기 버튼을 누를 때 `encode.ts`와 FFmpeg 모듈을 동적으로 불러옵니다.

`capture.tsx`는 별도 컨테이너에 public `QRHanokVillage`를 렌더링합니다. 내부 `CaptureContext`는 프레임별 카메라·타일·조명·주민 시간을 전달합니다. R3F의 수동 프레임 진행을 사용해 처리 속도와 관계없이 고정된 FPS의 장면을 생성합니다. 일반 인터랙티브 씬의 렌더링 방식과 public props/ref는 유지됩니다.

PNG 프레임은 한 장씩 WebAssembly 파일 시스템에 전달합니다. H.264 MP4는 `yuv420p` 및 faststart, GIF는 팔레트 최적화, APNG는 무한 반복으로 인코딩합니다. 완료·취소·오류 시 WebGL 씬과 FFmpeg worker를 해제합니다. 결과를 교체하거나 컴포넌트를 unmount하면 Blob URL도 해제합니다.

## Vite / Vercel

`vite.demo.config.ts`는 single-thread `@ffmpeg/core`의 ESM JS와 WASM을 `encoder/`에 복사하며 개발 서버에서도 같은 URL로 제공합니다. 외부 CDN에 의존하지 않고, SharedArrayBuffer 또는 별도의 COOP/COEP 설정을 요구하지 않는 single-thread 코어를 사용합니다. `@ffmpeg/ffmpeg`를 optimizeDeps에서 제외하고 worker를 ESM으로 빌드합니다.

WASM 파일은 약 32 MB이며 내보내기 시작 시에만 로드합니다. `npm run build:vercel`의 기존 출력 디렉터리 `demo-dist`에 포함되므로 Vercel 설정을 추가할 필요가 없습니다. 브라우저 메모리·CPU에 따라 처리 시간은 달라집니다. 긴 작업은 Cancel export로 중단할 수 있습니다.

`@ffmpeg/ffmpeg`와 `@ffmpeg/core`는 devDependencies이며 라이브러리 ESM 번들과 npm tarball에는 인코더/데모/wasm 파일이 포함되지 않습니다. 배포되는 데모에는 FFmpeg의 라이선스와 원본 소스 안내를 함께 제공합니다(`demo/export/NOTICE.txt`, `GPL-2.0.txt`).

현재 선택한 한옥/궁궐 프리셋과 단청 장식도 내보내기용 public component에 그대로 전달합니다.

카메라 전환은 데모의 Transition 설정(기본 1400ms)을 그대로 사용합니다. 앞부분 QR 대기는 없으며 웹에서 선택한 줌값에서 시작합니다. 짧은 영상에서 왕복 전환 시간이 전체 길이를 넘으면 각각 절반으로 제한합니다. 건축 옵션은 한옥과 궁 두 가지이며 단청은 벽 바깥 처마 아래의 녹색·청색 띠와 금색 문양으로 표시합니다.

ZOOM IN (%)은 시작 줌값에 추가되는 확대량입니다. 기본 35%, 범위 0~200%이며 0%는 줌인 없음, 100%는 시작 크기의 2배입니다. 회전 설정과 독립적으로 적용하며 QR 복귀 시 시작 줌으로 돌아옵니다.
