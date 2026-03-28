use std::collections::{BTreeMap, HashSet};

use anyhow::Context;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointManifest {
    pub source: String,
    pub total_endpoints: usize,
    pub implemented_endpoints: usize,
    pub progress_percent: usize,
    pub endpoints: Vec<EndpointEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointEntry {
    pub controller: String,
    pub method: String,
    pub path: String,
    pub implemented_in_rust: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ImplementedEndpoint {
    method: String,
    path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProgressSnapshot {
    pub total_endpoints: usize,
    pub implemented_endpoints: usize,
    pub pending_endpoints: usize,
    pub progress_percent: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ControllerProgress {
    pub controller: String,
    pub total: usize,
    pub implemented: usize,
    pub pending: usize,
    pub progress_percent: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModuleProgress {
    pub module: String,
    pub total: usize,
    pub implemented: usize,
    pub pending: usize,
    pub progress_percent: usize,
}

#[derive(Debug, Clone)]
pub struct RouteMatcher {
    entries: Vec<RouteEntry>,
}

#[derive(Debug, Clone)]
struct RouteEntry {
    method: String,
    path_template: String,
}

impl RouteMatcher {
    pub fn exists(&self, method: &str, concrete_path: &str) -> bool {
        self.entries
            .iter()
            .filter(|entry| entry.method == method)
            .any(|entry| path_matches(&entry.path_template, concrete_path))
    }
}

pub fn load_manifest() -> anyhow::Result<EndpointManifest> {
    let raw = include_str!("../../data/endpoints_manifest.json");
    let mut parsed: EndpointManifest =
        serde_json::from_str(raw).context("no se pudo parsear data/endpoints_manifest.json")?;

    let implemented_raw = include_str!("../../data/implemented_endpoints.json");
    let implemented: Vec<ImplementedEndpoint> = serde_json::from_str(implemented_raw)
        .context("no se pudo parsear data/implemented_endpoints.json")?;

    let implemented_set: HashSet<(String, String)> = implemented
        .into_iter()
        .map(|e| (e.method.to_uppercase(), e.path))
        .collect();

    for endpoint in &mut parsed.endpoints {
        endpoint.implemented_in_rust =
            implemented_set.contains(&(endpoint.method.to_uppercase(), endpoint.path.clone()));
    }

    let total = parsed.endpoints.len();
    let implemented_count = parsed
        .endpoints
        .iter()
        .filter(|endpoint| endpoint.implemented_in_rust)
        .count();

    parsed.total_endpoints = total;
    parsed.implemented_endpoints = implemented_count;
    parsed.progress_percent = percentage(implemented_count, total);

    Ok(parsed)
}

pub fn progress(manifest: &EndpointManifest) -> ProgressSnapshot {
    let total = manifest.total_endpoints;
    let implemented = manifest.implemented_endpoints;
    ProgressSnapshot {
        total_endpoints: total,
        implemented_endpoints: implemented,
        pending_endpoints: total.saturating_sub(implemented),
        progress_percent: percentage(implemented, total),
    }
}

pub fn by_controller(manifest: &EndpointManifest) -> Vec<ControllerProgress> {
    let mut grouped: BTreeMap<String, (usize, usize)> = BTreeMap::new();

    for entry in &manifest.endpoints {
        let val = grouped.entry(entry.controller.clone()).or_insert((0, 0));
        val.0 += 1;
        if entry.implemented_in_rust {
            val.1 += 1;
        }
    }

    grouped
        .into_iter()
        .map(|(controller, (total, implemented))| ControllerProgress {
            controller,
            total,
            implemented,
            pending: total.saturating_sub(implemented),
            progress_percent: percentage(implemented, total),
        })
        .collect()
}

pub fn by_module(manifest: &EndpointManifest) -> Vec<ModuleProgress> {
    let mut grouped: BTreeMap<String, (usize, usize)> = BTreeMap::new();

    for entry in &manifest.endpoints {
        let module = entry
            .controller
            .split('/')
            .next()
            .unwrap_or("root")
            .to_string();

        let val = grouped.entry(module).or_insert((0, 0));
        val.0 += 1;
        if entry.implemented_in_rust {
            val.1 += 1;
        }
    }

    grouped
        .into_iter()
        .map(|(module, (total, implemented))| ModuleProgress {
            module,
            total,
            implemented,
            pending: total.saturating_sub(implemented),
            progress_percent: percentage(implemented, total),
        })
        .collect()
}

pub fn route_matcher(manifest: &EndpointManifest) -> RouteMatcher {
    let entries = manifest
        .endpoints
        .iter()
        .map(|entry| RouteEntry {
            method: entry.method.to_uppercase(),
            path_template: entry.path.clone(),
        })
        .collect();

    RouteMatcher { entries }
}

fn percentage(implemented: usize, total: usize) -> usize {
    if total == 0 {
        return 0;
    }

    ((implemented as f64 / total as f64) * 100.0).round() as usize
}

fn path_matches(path_template: &str, concrete_path: &str) -> bool {
    let left: Vec<&str> = path_template.trim_matches('/').split('/').collect();
    let right: Vec<&str> = concrete_path.trim_matches('/').split('/').collect();

    if path_template == "/" && concrete_path == "/" {
        return true;
    }

    if left.len() != right.len() {
        return false;
    }

    left.iter().zip(right.iter()).all(|(a, b)| {
        if a.starts_with(':') {
            !b.is_empty()
        } else {
            a == b
        }
    })
}

#[cfg(test)]
mod tests {
    use super::path_matches;

    #[test]
    fn test_path_matches_with_param() {
        assert!(path_matches(
            "/acceso/permiso-area/:id",
            "/acceso/permiso-area/55"
        ));
    }

    #[test]
    fn test_path_mismatch() {
        assert!(!path_matches("/auth/login", "/auth/config"));
    }
}
