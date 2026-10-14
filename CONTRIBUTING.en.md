# Contributing

[繁體中文](CONTRIBUTING.md) | **English**

Issues and pull requests are welcome at [steventeng2022/claimlens](https://github.com/steventeng2022/claimlens). Use English or Traditional Chinese and treat other contributors respectfully.

## Workflow

1. Fork the repository and create a focused branch.
2. Read the [README](README.en.md) for the runtime layout and preview instructions.
3. Change the current frontend in dist/client/ or the server modules in server/. If a deployment uses the tracked dist/server/ copy, update corresponding modules together and explain which files are deployed. Preserve the older root dist frontend unless intentionally updating it.
4. Manually verify relevant flows and describe your checks in the PR. No automated test suite or npm build scripts are currently included.

For frontend work, check the built-in demo, report rendering, local history, and light/dark themes. For backend work, use your own isolated database and deployment; verify the affected API responses, authorization, quota, caching, and data-retention behavior as applicable. Do not exercise the production service or incur API costs without authorization.

## Issues and pull requests

Include reproduction steps, expected and actual behavior, environment details, and redacted errors. Explain what changed and why. Update both language versions of affected documentation, or clearly identify any translation still needed.

Do not commit real API keys, environment files, database exports, private reports, personal identifiers, or request logs. Use synthetic fixtures and placeholders. Do not paste secrets into GitHub issues.

New dependencies must include their license information. Do not claim evidence accuracy or test coverage that has not been measured.

## License

Submit only content you have the right to contribute. Unless explicitly stated otherwise and agreed by the maintainer, original contributions use the project's [MIT License](LICENSE). Third-party materials keep their own terms.
