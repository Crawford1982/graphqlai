# Security policy

## Intended use

**graphqlai** is a GraphQL-focused testing tool. Use it **only** against systems you own or have **explicit written permission** to test (contract, bug bounty scope, pentest authorization, etc.). Operational guidance lives in **`docs/REAL-TARGET-TESTING.md`**.

Misuse against third-party systems without authorization may violate law and policy. Maintainers do not assist with unauthorized testing.

## Reporting vulnerabilities _in graphqlai_

This section is for security issues **in this repository**: the CLI, bundled scripts, dependency handling, or behaviors that could harm users who run graphqlai as intended.

**Please do not** use this channel to report vulnerabilities you found in **target APIs** by running graphqlai — handle those through the target’s disclosure program or your engagement process.

### How to report

- Prefer **[GitHub Security Advisories](https://github.com/Crawford1982/graphqlai/security/advisories/new)** (private disclosure) if available on this repo.
- Alternatively, open a **private** report if your organization’s policy requires it, or contact the repository owner through GitHub with minimal reproduction details.

Include:

- graphqlai version or commit SHA
- Node.js version and OS
- Steps to reproduce, impact, and suggested severity (if known)

### Scope (in scope for this policy)

- Remote code execution, credential theft, or unsafe defaults **when running graphqlai**
- Unsafe handling of secrets in logs or reports
- Dependency vulnerabilities affecting shipped behavior

### Out of scope

- Findings produced **about remote GraphQL APIs** during authorized testing (report those to the API owner).
- Issues that require the victim to run malicious schema files from untrusted sources **without** normal precautions — still report if you believe defaults should be safer.

### Supported versions

Security fixes are applied to **`master`** / the latest tagged release when practical. Older releases may not receive backports unless agreed case by case.
