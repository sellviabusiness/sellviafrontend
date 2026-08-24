# Sellvia Frontend Repository Instructions

## Central Documentation

The Sellvia project's central documentation is hosted at:

<https://sellviadocs.vercel.app/>
<https://sellviadocs.vercel.app/frontend-context.md>

This site is protected by Vercel deployment/bot protection. To access it:

1. Read the bypass code from the `VERCEL_AUTOMATION_BYPASS_SECRET` variable in `.env.local` (repository root). This file is git-ignored and must be populated locally — it is not committed.
2. Send it on every request as the header `x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>` (a query param `?x-vercel-protection-bypass=<VERCEL_AUTOMATION_BYPASS_SECRET>&x-vercel-set-bypass-cookie=true` also works if headers cannot be set).
3. If requests still return `403` with an `X-Vercel-Mitigated: challenge` response header, the bypass code is not the issue — that indicates Vercel's bot/attack-challenge firewall, which a static token cannot solve. Report this rather than assuming the code is wrong.

Before starting any task, access and review the latest relevant documentation from the central Sellvia documentation system.

The central documentation contains:

- Product overview
- Glossary and terminology
- Business logic
- Payment and transaction logic
- Security requirements
- Frontend architecture
- Backend architecture where relevant
- System rules
- Infrastructure decisions where relevant

## Required Workflow

Before implementing any task:

1. Read and understand the requested task.
2. Access the latest central Sellvia documentation.
3. Identify the documentation relevant to the task.
4. Read the relevant documentation before making implementation decisions.
5. Check that the requested implementation is consistent with the documented business logic and system rules.
6. Only then begin implementation.

## Missing Documentation

If the requested task introduces or depends on:

- New business logic
- New product behavior
- New terminology
- New payment behavior
- New transaction behavior
- New security behavior
- New authentication or authorization behavior
- A significant architectural change

and the required behavior is not defined in the central documentation:

DO NOT invent the behavior.

Flag the missing information and explain what needs to be clarified.

## Documentation Conflicts

If the requested task conflicts with the central documentation:

STOP and report the conflict.

Do not silently override documented product or business logic.

If the existing frontend implementation conflicts with the central documentation:

Report the conflict before deciding whether the documentation or implementation should change.

## Documentation Updates

The central documentation is external to this repository.

Do not maintain duplicate copies of project-level documentation inside this repository.

Always use the latest available central documentation.

## Role of This Repository

This repository is responsible for frontend implementation.

The central documentation defines project knowledge and rules.

This repository implements those rules through frontend code.