# ERPControl

ERP Control Panel — GLC Paints  
Built with React JSX · Hosted on GitHub Pages

## Live
https://malkholy.github.io/ERPControl/

## API
`https://quick.glcpaints.com:7003/General/GeneralAPI/`  
SP: `APIERPControlOperation`

## Pages
| Page | Operation | Status |
|------|-----------|--------|
| Control Page | `Get Control Data` | 🔄 In progress |
| Expenses | TBD | ⏳ Pending |
| Projects | TBD | ⏳ Pending |
| HR | TBD | ⏳ Pending |
| Cash | TBD | ⏳ Pending |

## Structure
```
src/
├── App.jsx          ← Login + Layout + Sidebar + Tabs
├── nav.js           ← Nav config
├── shared/
│   └── api.js       ← apiCall helper
└── pages/
    ├── ControlPage.jsx
    ├── Expenses.jsx
    ├── Projects.jsx
    ├── HR.jsx
    └── Cash.jsx
```
