---
name: rust-docs-research
description: Use when researching Rust language docs, crate choices, async web stacks, SQL Server support in Rust, or creating technical notes for Rust work. Prioritize official Rust docs, docs.rs, crate homepages, and local Cargo.toml/Cargo.lock versions.
---

# Rust docs research

## Source priority
1. Local Cargo.toml and Cargo.lock for the version actually in use.
2. Official Rust docs: Book, Cargo Book, rustup, Clippy, API Guidelines.
3. docs.rs for crate API behavior.
4. Official crate homepage or GitHub README for support matrix, goals, and non-goals.

## Workflow
1. Inspect the local crate version first.
2. Prefer official sources over blogs or random tutorials.
3. If latest docs differ from the local major/minor line, state that clearly.
4. For SQL Server work, compare Tiberius and bb8-tiberius first; only bring in SQLx as support-matrix context.
5. Write research notes in concise project-oriented language, not generic Rust theory.

## Load references when needed
- Load [references/official-links.md](references/official-links.md) for the source set.
- Load [references/sqlserver-sources.md](references/sqlserver-sources.md) when the question touches SQL Server in Rust.
