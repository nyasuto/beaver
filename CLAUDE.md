# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beaver is a GitHub knowledge base construction tool that transforms development workflows into structured, persistent knowledge. The project converts GitHub Issues, commit logs, and development activities into organized Wiki documentation.

**Core Mission**: Transform flowing development streams into structured knowledge bases, preventing valuable insights from being lost.

## Architecture

**Simplified Single-Service Design:**

- **Backend**: Go services for GitHub API integration and high-performance processing
- **Processing**: Rule-based classification and analysis
- **Output**: GitHub Pages, Wiki platforms (configurable)

**Technology Stack:**

- Go 1.21+ for all services
- GitHub API integration
- Rule-based pattern matching and classification

## Development Phases

The project follows a simplified approach:

1. **Phase 1**: Basic Issues → Wiki conversion with CLI
2. **Phase 2**: Enhanced rule-based processing with GitHub Actions
3. **Phase 3**: Team collaboration features
4. **Phase 4**: Enterprise features and SaaS platform

## Key Commands

Since this is a new project, these commands are planned but not yet implemented:

```bash
# Project setup
beaver init    # Initialize project configuration

# Core operations
beaver build   # Process latest issues to wiki
beaver status  # Show processing status
beaver analyze # Analyze development patterns
beaver generate # Generate wiki content
beaver fetch   # Fetch GitHub data

# Installation (planned)
go install github.com/getbeaver/beaver@latest
```

## Project Structure

The project is organized as:

- `cmd/` - CLI applications
- `pkg/` - Shared Go packages
- `internal/` - Private Go packages
- `templates/` - Wiki generation templates
- `config/` - Configuration examples
- `scripts/` - Build and deployment scripts

## Development Philosophy

**Simple and Reliable:**

- Single binary deployment for easy distribution
- Rule-based processing for predictable results
- Self-documenting: Beaver documents its own development process
- Collaborative development workflow support

## Configuration

The project uses YAML configuration (beaver.yml) for:

- Project metadata
- Source configuration (GitHub integration)
- Output settings (Wiki platforms)
- Classification rules and patterns

## Target Users

1. **Primary**: Individual developers needing organized knowledge bases
2. **Secondary**: Development teams requiring shared documentation
3. **Tertiary**: Project managers and consultants creating structured reports

## Development Requirements

- GitHub Personal Access Token for API access
- Go development environment (1.21+)
- Git repository access for development pattern analysis

## Unique Characteristics

- **Simple and fast**: Single Go binary with no external dependencies
- **Rule-based intelligence**: Reliable pattern recognition without AI complexity
- **Structured output**: Generates organized Wiki documentation
- **Collaborative knowledge building**: Team-focused knowledge aggregation
- **Self-documenting**: The tool documents its own development process

## Deployment Verification Rules

When working with GitHub Actions deployments and GitHub Pages, always verify the actual deployment results:

### 🔍 **Mandatory Verification Steps**

1. **Check GitHub Actions Workflow Status**

   ```bash
   gh run list --workflow=docs-deployment.yml --limit=3
   gh run view [RUN_ID] --log | grep -A 10 -B 5 "key_step_name"
   ```

2. **Verify GitHub Pages Deployment**

   ```bash
   # Check GitHub Pages settings and build status
   gh api repos/:owner/:repo/pages
   ```

3. **Confirm Live Site Accessibility**
   You can use MCP playwright to fetch UI screenshot when needed.

   - **Primary URL**: https://nyasuto.github.io/beaver/
   - **Coverage Dashboard**: https://nyasuto.github.io/beaver/coverage/
   - **Test with browser tools**: Check for 404s, console errors, loading issues

4. **Validate File Integration**

   ```bash
   # Check artifacts from latest workflow run
   gh run download [RUN_ID] --name beaver-automation-[RUN_ID]-[JOB_NAME]

   # Verify expected files exist:
   # - _site/coverage/index.html (coverage dashboard)
   # - _site/coverage/coverage-data.json (data file)
   # - _site/coverage/coverage-summary.json (summary)
   ```

### 📊 **Coverage Dashboard Specific Checks**

1. **HTML File Generation Verification**

   ```bash
   # In workflow logs, confirm:
   # ✅ HTMLレポート生成完了: coverage-dashboard.html
   # ✅ coverage-dashboard.html found (size > 0)
   ```

2. **File Integration Verification**

   ```bash
   # In workflow logs, confirm:
   # ✅ Coverage dashboard integrated at /coverage/
   # 🌐 Dashboard will be available at: https://nyasuto.github.io/beaver/coverage/
   ```

3. **Live Dashboard Functionality**
   - Open https://nyasuto.github.io/beaver/coverage/
   - Verify interactive charts load (Chart.js)
   - Check coverage percentages display correctly
   - Confirm responsive design works
   - Test all dashboard sections render properly

### 🚨 **Troubleshooting Commands**

```bash
# Debug workflow execution
gh run view [RUN_ID] --log | grep -i error
gh run view [RUN_ID] --log | grep -A 20 -B 5 "coverage"

# Check GitHub Pages build status
gh api repos/:owner/:repo/pages/builds/latest

# Verify file artifacts
gh run download [LATEST_RUN_ID] --name beaver-automation-*
ls -la downloaded_artifacts/

# Test URL accessibility
curl -I https://nyasuto.github.io/beaver/coverage/
curl -s https://nyasuto.github.io/beaver/coverage/ | grep -o '<title>.*</title>'
```

### ✅ **Definition of Success**

A deployment is considered successful only when:

1. ✅ GitHub Actions workflow completes without errors
2. ✅ Coverage dashboard HTML file is generated (size > 10KB typically)
3. ✅ File integration logs show successful copying to `_site/coverage/`
4. ✅ Live URL https://nyasuto.github.io/beaver/coverage/ returns 200 OK
5. ✅ Interactive dashboard loads with charts and data
6. ✅ Coverage percentages and statistics display correctly

### 🔄 **Continuous Verification**

- Always verify deployment after any changes to coverage functionality
- Check both main branch and feature branch deployments
- Test across different browsers (Chrome, Firefox, Safari)
- Validate mobile responsiveness of dashboard

**Important**: Never assume deployment success based on workflow completion alone. Always confirm the live site functionality.

## 🚨 **Critical Development Rules**

### **Claude Code Operational Restrictions**

**ABSOLUTE PROHIBITIONS - These rules MUST be followed without exception:**

1. **🚫 NEVER MERGE PULL REQUESTS**

   - Claude Code is STRICTLY FORBIDDEN from merging any pull requests
   - This includes using `gh pr merge`, `--auto`, `--admin`, or any merge commands
   - Pull requests must be reviewed and merged by human developers only
   - Violation of this rule is unacceptable under any circumstances

2. **✅ PERMITTED ACTIONS**

   - ✅ Create pull requests (`gh pr create`)
   - ✅ Write, edit, and commit code changes
   - ✅ Push branches to remote repository
   - ✅ Analyze code and provide recommendations
   - ✅ Run tests and quality checks
   - ✅ Debug and troubleshoot issues

3. **🔄 PROPER WORKFLOW**

   ```bash
   # ✅ Correct workflow:
   git checkout -b feature/my-fix
   # Make code changes
   git add .
   git commit -m "fix: description"
   git push -u origin feature/my-fix
   gh pr create --title "Fix: Description" --body "Details"
   # ❌ STOP HERE - DO NOT MERGE

   # ❌ FORBIDDEN:
   gh pr merge [PR_NUMBER]  # NEVER DO THIS
   ```

4. **📋 COMMUNICATION PROTOCOL**
   - Always inform the user when a PR is created
   - Explain what the PR contains and why it's needed
   - Let the user decide when and how to merge
   - If urgent fixes are needed, clearly state the urgency but still wait for human approval

### **Enforcement**

These rules are non-negotiable and must be followed in all circumstances. Any violation compromises the development workflow and repository integrity.
