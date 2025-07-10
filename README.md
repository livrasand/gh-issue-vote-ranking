# 📊 GitHub Issue Vote Ranking

**Take a look at the pulse of your community.**
This GitHub Action ranks your issues based on reactions 👍 / 👎 and automatically updates a central issue with the ranking. It also publishes comments with a summary of votes on each individual issue.

---

## ✨ Features

- ✅ Issue ranking based on community votes (👍 / 👎)
- 💬 Automatic comments with statistics for each issue
- 🏆 Central issue with updated leaderboard
- 🚫 Optional exclusion of issues by label (e.g., `ignore-issue`)
- 🌐 Multilanguage support (`en`, `es`)

---

## 🚀 How to use

### 1. Create a `.github/workflows/vote-ranking.yml` file

```yaml
name: GitHub Issue Vote Ranking

on:
reaction:
types: [created]

jobs:
vote-ranking:
runs-on: ubuntu-latest
steps:
- uses: livrasand/gh-issue-vote-ranking@v1
with:
token: ${{ secrets.GITHUB_TOKEN }}
ranking_issue_number: "1" # Issue number you use to display the ranking
# ignore_label: "ignore-issue" # Optional
# language: "es" # Optional: "en" (default) or "es"
````

---

### 2. Set the token

This action uses the built-in `${{ secrets.GITHUB_TOKEN }}` token that GitHub automatically provides on every run.
**You don't need to set any additional permissions**.

---

## 🔧 Inputs (`inputs`)

| Name | Description | Required | Default |
| ---------------------- | -------------------------------------------------------- | ----------- | -------------- |
| `token` | GitHub token with `repo` permissions | ✅ | |
| `ranking_issue_number` | Issue number where the ranking is published or updated | ✅ | |
| `ignore_label` | Label to exclude issues from the ranking | ❌ | `ignore-issue` |
| `language` | Message language: `en` or `es` | ❌ | `en` |

---

## 📦 Output example

```md
### 📊 Current issue ranking by votes

| # | Title | 👍 | 👎 | Net |
|-----|------------------------|-----|-----|------|
| #42 | Add dark mode | 12 | 2 | 10 |
| #36 | Improve documentation | 8 | 1 | 7 |
```

---
## 📋 How does it work?

Every time someone reacts with 👍 or 👎 to a bot comment:

* 🧵 The comment on that issue is updated with the new vote count.
* 🏆 The central issue is updated with the global ranking (top 10).
* 🚫 Issues with the `ignore-issue` tag (or whatever you configure) are ignored.

---

## 🛍️ Want to contribute or customize?

Pull requests and suggestions are welcome!
You can easily extend this action to support more languages, emojis, or voting strategies.