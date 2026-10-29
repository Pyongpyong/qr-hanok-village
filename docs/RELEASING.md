# npm / GitHub 릴리스 운영

이 문서는 패키지 유지보수자를 위한 배포 안내입니다. npm 사용자의 설치 및 API 문서는 [README](../README.md)에 있습니다.

패키지 소스와 자동 배포 설정은 준비되어 있으며 최초 npm 게시는 별도로 수행합니다. 게시 전에는 `npm pack`으로 만든 tarball로 소비자 프로젝트에서 설치를 검증할 수 있습니다.

## GitHub / npm 배포 자동화

소스 저장소: [Pyongpyong/qr-hanok-village](https://github.com/Pyongpyong/qr-hanok-village).
Node.js 24를 사용합니다(`.nvmrc`). CI와 배포는 `package-lock.json`을 기준으로 `npm ci`를 실행하며, 기존 pnpm 개발 환경도 유지합니다.

- `.github/workflows/ci.yml`: main push와 PR에서 타입 검사, 라이브러리·데모 빌드, 테스트, npm 패키지 구성 검증.
- `.github/workflows/release.yml`: main의 Conventional Commits를 분석해 버전 커밋·태그, npm 공개 배포, GitHub Release를 생성.
- `scripts/release-bump.mjs`: 마지막 배포 태그 이후 커밋으로 버전을 결정. 최초 배포는 현재 `0.1.0`을 사용.
- `scripts/release-plan.mjs`: 이미 npm에 있는 버전은 재배포하지 않음. 네트워크 오류·서버 오류를 미배포 상태로 오인하지 않음.

| 커밋                                    | 버전      |
| --------------------------------------- | --------- |
| `feat:`                                 | minor     |
| `fix:`, `perf:`, `refactor:`, `revert:` | patch     |
| `feat!:`, `fix!:`, `BREAKING CHANGE:`   | major     |
| `docs:`, `chore:`, `ci:`, `test:`       | 변경 없음 |

릴리스 workflow는 npm 초기 설정 전 실패하거나 의도치 않게 게시하지 않도록 `NPM_PUBLISH_ENABLED` repository variable이 `true`일 때만 실행합니다.

최초 설정:

1. 패키지 검증: `npm ci && npm run check && npm pack --dry-run`.
2. npm에 최초 게시할 준비가 되면 `npm login` 후 `npm publish --access public`. 2FA 인증이 필요할 수 있습니다.
3. npm 패키지 Settings → Trusted Publisher → GitHub Actions에서 다음 값을 등록합니다.

   | 설정              | 값                 |
   | ----------------- | ------------------ |
   | Owner             | `Pyongpyong`       |
   | Repository        | `qr-hanok-village` |
   | Workflow filename | `release.yml`      |
   | Environment       | 비워 둠            |
   | Allowed action    | `npm publish` 허용 |

4. GitHub Settings → Secrets and variables → Actions → Variables에서 `NPM_PUBLISH_ENABLED=true`로 설정합니다.
5. GitHub Actions → Release → Run workflow로 초기 태그/Release를 생성합니다. 이후 main의 변경은 위 커밋 규칙으로 자동 배포됩니다.

npm Trusted Publishing은 GitHub OIDC를 사용하므로 `NPM_TOKEN` secret을 등록하지 않습니다. 새 Trusted Publisher는 등록 후 2일 내 성공적인 배포로 검증해야 합니다. 자세한 요구사항은 [npm 공식 문서](https://docs.npmjs.com/trusted-publishers/)를 확인하세요.
