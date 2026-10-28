# STEMbotix LMS · KCG Program Mockup

Clickable mockup of the KCG (RUSA) program features, with dummy data and one-click demo logins.
Front-end only: no backend and no database. Demo changes are saved in the viewer's browser (localStorage).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build (static site)

```bash
npm run build      # outputs ./out
npm start          # serves ./out
```

## Deploy

**Vercel**: import the folder or repo. No settings needed (framework: Next.js). The output is a static export.

**GitHub Pages**: push to a GitHub repo and enable *Settings → Pages → Source: GitHub Actions*.
The workflow in `.github/workflows/pages.yml` builds with `NEXT_PUBLIC_BASE_PATH=/<repo-name>` and publishes `./out`.

## Demo logins

Password for every account: `demo@123`. The login page has one-click cards for each role, and **Demo guide** walks through each requirement.

| Role | Email |
|---|---|
| Super Admin (KCG Project Admin) | admin@stembotix.demo |
| Department Coordinator (Chennai) | dept.chennai@stembotix.demo |
| Instructor | see login page |
| Institute Coordinator (KCG-0001 / 0002 / 0003) | coord.kcg-0001@institute.demo … |
| Student | see login page |

## Where things are

- `src/lib/data.ts`: dummy data generator (25 departments, 50 instructors, 500 institutes, ~19k students)
- `src/lib/logic.ts`: booking/slot rules, status rules for the dashboard, role permissions
- `src/lib/store.tsx`: demo state persisted in localStorage
- `src/app/*`: one folder per page
