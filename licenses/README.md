# Third-Party Licenses

This directory contains generated license information for AegisX dependencies inherited from the upstream PentAGI codebase and AegisX project changes.

## Quick Start

Run the generator script to create/update license reports (run from project root):

```bash
./scripts/generate-licenses.sh
```

## Generated Files

### Backend (Go)
- `backend-dependencies.txt` - Complete list of Go modules
- `backend-licenses.csv` - Detailed license information (CSV format)

### Frontend (pnpm)
- `frontend-dependencies.json` - Complete dependency tree (JSON)
- `frontend-licenses.json` - Detailed license data (JSON)
- `frontend-licenses.csv` - License data (CSV)

**Note:** 
- Backend reports require `go-licenses` tool: `go install github.com/google/go-licenses@latest`
- Frontend reports require `pnpm install` in the frontend directory first.

## License

AegisX inherits the upstream PentAGI **MIT License**. See `../LICENSE` and `../NOTICE` for upstream and AegisX attribution.

GitHub may show a sidebar label such as `License` with the detected name `MIT License`. That is expected GitHub UI wording, not a second license. The canonical source license text remains `../LICENSE`.

Generated reports list the licenses detected for packaged dependencies. Review any GPL, LGPL, AGPL, proprietary, or commercial dependency before adding it to AegisX.

Commonly acceptable licenses include:

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- MPL-2.0
- 0BSD

## Docker Builds

License reports are automatically generated during Docker builds and included in the final image at `/opt/pentagi/licenses/`.

The `/opt/pentagi` path is retained while the implementation and Docker packaging still use upstream PentAGI paths.

## More Information

- Project License: [../LICENSE](../LICENSE)
- Legal Notices: [../NOTICE](../NOTICE)
- Full Documentation: [../README.md](../README.md)
