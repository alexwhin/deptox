use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DependencyCategory {
    NodeModules,
    Composer,
    Bundler,
    Pods,
    PythonVenv,
    ElixirDeps,
    DartTool,
    GoMod,
}

impl DependencyCategory {
    pub fn all() -> Vec<DependencyCategory> {
        vec![
            DependencyCategory::NodeModules,
            DependencyCategory::Composer,
            DependencyCategory::Bundler,
            DependencyCategory::Pods,
            DependencyCategory::PythonVenv,
            DependencyCategory::ElixirDeps,
            DependencyCategory::DartTool,
            DependencyCategory::GoMod,
        ]
    }

    pub fn directory_names(&self) -> &'static [&'static str] {
        match self {
            DependencyCategory::NodeModules => &["node_modules"],
            DependencyCategory::Composer => &["vendor"],
            DependencyCategory::Bundler => &["vendor"],
            DependencyCategory::Pods => &["Pods"],
            DependencyCategory::PythonVenv => &[".venv", "venv"],
            DependencyCategory::ElixirDeps => &["deps"],
            DependencyCategory::DartTool => &[".dart_tool"],
            DependencyCategory::GoMod => &["pkg"],
        }
    }

    #[allow(dead_code)]
    pub fn label(&self) -> &'static str {
        match self {
            DependencyCategory::NodeModules => "Node.js (node_modules)",
            DependencyCategory::Composer => "PHP (vendor)",
            DependencyCategory::Bundler => "Ruby (vendor)",
            DependencyCategory::Pods => "iOS (Pods)",
            DependencyCategory::PythonVenv => "Python (venv)",
            DependencyCategory::ElixirDeps => "Elixir (deps)",
            DependencyCategory::DartTool => "Dart (dart_tool)",
            DependencyCategory::GoMod => "Go (pkg/mod)",
        }
    }

    /// Determines the category from a directory name.
    /// For "vendor", "deps", and "pkg" directories, use specialized detection methods.
    pub fn from_directory_name(dir_name: &str) -> Option<DependencyCategory> {
        match dir_name {
            "node_modules" => Some(DependencyCategory::NodeModules),
            "Pods" => Some(DependencyCategory::Pods),
            ".venv" | "venv" => Some(DependencyCategory::PythonVenv),
            ".dart_tool" => Some(DependencyCategory::DartTool),
            "vendor" => None,
            "deps" => None,
            "pkg" => None,
            _ => None,
        }
    }

    /// Determines whether a vendor directory belongs to PHP (Composer) or Ruby (Bundler)
    /// by checking for framework-specific files within the directory.
    pub fn from_vendor_directory(vendor_path: &std::path::Path) -> Option<DependencyCategory> {
        let autoload_path = vendor_path.join("autoload.php");
        let composer_dir = vendor_path.join("composer");
        if autoload_path.exists() || composer_dir.exists() {
            return Some(DependencyCategory::Composer);
        }

        let bundle_dir = vendor_path.join("bundle");
        if bundle_dir.exists() {
            return Some(DependencyCategory::Bundler);
        }

        if let Some(parent) = vendor_path.parent() {
            let gemfile = parent.join("Gemfile");
            if gemfile.exists() {
                return Some(DependencyCategory::Bundler);
            }
        }

        // Default to Composer as PHP projects are more common
        Some(DependencyCategory::Composer)
    }

    /// Determines whether a deps directory belongs to Elixir by checking for mix.exs in the parent.
    pub fn from_deps_directory(deps_path: &std::path::Path) -> Option<DependencyCategory> {
        if let Some(parent) = deps_path.parent() {
            let mix_exs = parent.join("mix.exs");
            if mix_exs.exists() {
                return Some(DependencyCategory::ElixirDeps);
            }
        }
        None
    }

    /// Determines whether a pkg directory belongs to Go by checking for the mod subdirectory.
    pub fn from_pkg_directory(pkg_path: &std::path::Path) -> Option<DependencyCategory> {
        let mod_dir = pkg_path.join("mod");
        if mod_dir.exists() {
            return Some(DependencyCategory::GoMod);
        }
        None
    }
}

pub fn get_target_directory_names(
    enabled_categories: &HashSet<DependencyCategory>,
) -> HashSet<&'static str> {
    let mut names = HashSet::new();
    for category in enabled_categories {
        for name in category.directory_names() {
            names.insert(*name);
        }
    }
    names
}

pub fn get_all_dependency_directory_names() -> HashSet<&'static str> {
    let mut names = HashSet::new();
    for category in DependencyCategory::all() {
        for name in category.directory_names() {
            names.insert(*name);
        }
    }
    names
}

/// A directory discovered during the scan phase, before size calculation.
#[derive(Debug, Clone)]
pub struct DiscoveredDirectory {
    pub path: String,
    pub category: DependencyCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    pub path: String,
    pub size_bytes: u64,
    pub file_count: usize,
    pub last_modified_ms: u64,
    pub category: DependencyCategory,
    /// True if directory contains only symlinks (no real files)
    /// This happens with pnpm hoisting where symlinks point outside the directory
    #[serde(default)]
    pub has_only_symlinks: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub entries: Vec<DirectoryEntry>,
    pub total_size: u64,
    pub scan_time_ms: u128,
    pub skipped_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanStats {
    pub total_size: u64,
    pub directory_count: usize,
    pub current_path: Option<String>,
}

#[cfg(test)]
#[path = "types.test.rs"]
mod tests;
