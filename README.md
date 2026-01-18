# QA Cafe

AI-powered QA toolkit for web apps, APIs, and SaaS products.

## Overview

QA Cafe is a desktop application that uses Claude AI to assist with quality assurance workflows. It provides 12 specialized tools organized in 3 phases:

### Phase 1: Pre-Test
- **Test Mapper** - Code path analysis, entry points, flow tracing
- **Spec Interrogator** - Cross-reference docs with code to find gaps
- **Test Case Generator** - Build test plans from code analysis
- **Risk Radar** - Identify high-risk areas for focused testing

### Phase 2: During Test
- **Session Logger** - Capture observations via voice, text, screenshots
- **Quick Reference** - Query docs and code on demand
- **Coverage Tracker** - Track what's tested vs remaining
- **Bug Writer** - Structure issues and push to JIRA/GitHub

### Phase 3: Reporting/Regression
- **Comparison Tool** - Diff between builds/sessions
- **Reproduce Helper** - Reconstruct bug repro steps
- **Summary Generator** - Stakeholder-ready reports
- **Regression Runner** - Guided retesting of fixed bugs

## Tech Stack

- **Electron** - Desktop app framework
- **React + TypeScript** - UI
- **Claude API** - AI analysis
- **SQLite** - Local storage

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Package the app
npm run package
```

## Configuration

1. Get a Claude API key from [Anthropic](https://console.anthropic.com/)
2. Enter it in Settings within the app

## Target Projects

QA Cafe is designed for:
- Web applications (React, Vue, Angular, etc.)
- Backend APIs and services
- Mobile apps (React Native, Flutter)
- SaaS products
- CLI tools

Not designed for video games (potential future spinoff).

## License

MIT
