# Third Party Notices

AegisX can optionally integrate with KeygraphHQ Shannon as an external white-box pentest helper.

## KeygraphHQ Shannon

- License: AGPL-3.0
- Integration mode: external CLI or Docker worker only
- Notes: Shannon source code is not copied into this repository. AegisX executes a separately installed Shannon command when `SHANNON_ENABLED=true`, then imports the generated markdown report as flow/task data.

Keep Shannon's own license and notices with the installed Shannon distribution.
