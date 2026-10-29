# 데모 배포

이 문서는 데모 사이트 운영자를 위한 안내입니다. npm 라이브러리 배포는 [RELEASING.md](./RELEASING.md), 로컬 개발은 [DEVELOPMENT.md](./DEVELOPMENT.md)를 참고하세요.

## Vercel 데모 배포

Vercel의 GitHub 연동을 사용합니다. [Vercel New Project](https://vercel.com/new)에서 위 저장소를 Import하면 `vercel.json` 설정이 적용됩니다.

| 설정              | 값                     |
| ----------------- | ---------------------- |
| Framework         | Vite                   |
| Root Directory    | 저장소 루트 (`./`)     |
| Node.js           | 24.x                   |
| Install Command   | `npm ci`               |
| Build Command     | `npm run build:vercel` |
| Output Directory  | `demo-dist`            |
| Production Branch | `main`                 |

`build:vercel`은 라이브러리 타입 검사·빌드와 테스트를 거친 뒤 public component를 사용하는 데모를 빌드합니다. `dist`는 npm용 출력이며 Vercel에 올리는 디렉터리는 `demo-dist`입니다. main push는 Production, PR은 Preview 배포에 사용됩니다. 별도 Vercel 토큰이나 배포용 GitHub Actions workflow는 필요하지 않습니다.

CLI를 사용하는 경우에도 같은 프로젝트 루트에서 진행합니다.

```sh
npx vercel login
npx vercel link
npx vercel --prod
```

`.vercel/`의 로컬 연결 정보, 인증·환경 파일은 Git에 포함하지 않습니다. CLI 로그인이나 GitHub App의 저장소 접근 권한이 없는 경우에는 먼저 해당 계정을 연결해야 합니다. [Vercel GitHub 연동 문서](https://vercel.com/docs/git/vercel-for-github)를 참고하세요.
