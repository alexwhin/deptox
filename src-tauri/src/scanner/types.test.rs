use super::*;
use std::fs;
use tempfile::TempDir;

#[test]
fn test_dependency_category_all() {
    let all = DependencyCategory::all();
    assert_eq!(all.len(), 8);
    assert!(all.contains(&DependencyCategory::NodeModules));
    assert!(all.contains(&DependencyCategory::Composer));
    assert!(all.contains(&DependencyCategory::Bundler));
    assert!(all.contains(&DependencyCategory::Pods));
    assert!(all.contains(&DependencyCategory::PythonVenv));
    assert!(all.contains(&DependencyCategory::ElixirDeps));
    assert!(all.contains(&DependencyCategory::DartTool));
    assert!(all.contains(&DependencyCategory::GoMod));
}

#[test]
fn test_dependency_category_directory_names() {
    assert_eq!(
        DependencyCategory::NodeModules.directory_names(),
        &["node_modules"]
    );
    assert_eq!(DependencyCategory::Composer.directory_names(), &["vendor"]);
    assert_eq!(DependencyCategory::Bundler.directory_names(), &["vendor"]);
    assert_eq!(DependencyCategory::Pods.directory_names(), &["Pods"]);
    assert_eq!(
        DependencyCategory::PythonVenv.directory_names(),
        &[".venv", "venv"]
    );
    assert_eq!(DependencyCategory::ElixirDeps.directory_names(), &["deps"]);
    assert_eq!(
        DependencyCategory::DartTool.directory_names(),
        &[".dart_tool"]
    );
    assert_eq!(DependencyCategory::GoMod.directory_names(), &["pkg"]);
}

#[test]
fn test_dependency_category_from_directory_name() {
    assert_eq!(
        DependencyCategory::from_directory_name("node_modules"),
        Some(DependencyCategory::NodeModules)
    );
    // vendor returns None because it needs path inspection
    assert_eq!(DependencyCategory::from_directory_name("vendor"), None);
    assert_eq!(
        DependencyCategory::from_directory_name("Pods"),
        Some(DependencyCategory::Pods)
    );
    assert_eq!(
        DependencyCategory::from_directory_name(".venv"),
        Some(DependencyCategory::PythonVenv)
    );
    assert_eq!(
        DependencyCategory::from_directory_name("venv"),
        Some(DependencyCategory::PythonVenv)
    );
    // .dart_tool is unique to Dart
    assert_eq!(
        DependencyCategory::from_directory_name(".dart_tool"),
        Some(DependencyCategory::DartTool)
    );
    // deps and pkg return None because they need path inspection
    assert_eq!(DependencyCategory::from_directory_name("deps"), None);
    assert_eq!(DependencyCategory::from_directory_name("pkg"), None);
    assert_eq!(DependencyCategory::from_directory_name("src"), None);
    assert_eq!(DependencyCategory::from_directory_name("build"), None);
    assert_eq!(DependencyCategory::from_directory_name("target"), None);
}

#[test]
fn test_from_vendor_directory_php_autoload() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("vendor");
    fs::create_dir(&vendor).unwrap();
    fs::write(vendor.join("autoload.php"), "<?php").unwrap();

    let category = DependencyCategory::from_vendor_directory(&vendor);
    assert_eq!(category, Some(DependencyCategory::Composer));
}

#[test]
fn test_from_vendor_directory_php_composer_dir() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("vendor");
    fs::create_dir(&vendor).unwrap();
    fs::create_dir(vendor.join("composer")).unwrap();

    let category = DependencyCategory::from_vendor_directory(&vendor);
    assert_eq!(category, Some(DependencyCategory::Composer));
}

#[test]
fn test_from_vendor_directory_ruby_bundle() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("vendor");
    fs::create_dir(&vendor).unwrap();
    fs::create_dir(vendor.join("bundle")).unwrap();

    let category = DependencyCategory::from_vendor_directory(&vendor);
    assert_eq!(category, Some(DependencyCategory::Bundler));
}

#[test]
fn test_from_vendor_directory_ruby_gemfile() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("vendor");
    fs::create_dir(&vendor).unwrap();
    fs::write(
        temp_dir.path().join("Gemfile"),
        "source 'https://rubygems.org'",
    )
    .unwrap();

    let category = DependencyCategory::from_vendor_directory(&vendor);
    assert_eq!(category, Some(DependencyCategory::Bundler));
}

#[test]
fn test_from_vendor_directory_unknown_defaults_to_composer() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("vendor");
    fs::create_dir(&vendor).unwrap();

    let category = DependencyCategory::from_vendor_directory(&vendor);
    assert_eq!(category, Some(DependencyCategory::Composer));
}

#[test]
fn test_from_deps_directory_elixir() {
    let temp_dir = TempDir::new().unwrap();
    let deps = temp_dir.path().join("deps");
    fs::create_dir(&deps).unwrap();
    fs::write(
        temp_dir.path().join("mix.exs"),
        "defmodule MyApp.MixProject do",
    )
    .unwrap();

    let category = DependencyCategory::from_deps_directory(&deps);
    assert_eq!(category, Some(DependencyCategory::ElixirDeps));
}

#[test]
fn test_from_deps_directory_not_elixir() {
    let temp_dir = TempDir::new().unwrap();
    let deps = temp_dir.path().join("deps");
    fs::create_dir(&deps).unwrap();

    let category = DependencyCategory::from_deps_directory(&deps);
    assert_eq!(category, None);
}

#[test]
fn test_from_pkg_directory_go() {
    let temp_dir = TempDir::new().unwrap();
    let pkg = temp_dir.path().join("pkg");
    fs::create_dir(&pkg).unwrap();
    fs::create_dir(pkg.join("mod")).unwrap();

    let category = DependencyCategory::from_pkg_directory(&pkg);
    assert_eq!(category, Some(DependencyCategory::GoMod));
}

#[test]
fn test_from_pkg_directory_not_go() {
    let temp_dir = TempDir::new().unwrap();
    let pkg = temp_dir.path().join("pkg");
    fs::create_dir(&pkg).unwrap();

    let category = DependencyCategory::from_pkg_directory(&pkg);
    assert_eq!(category, None);
}

#[test]
fn test_dependency_category_serialization() {
    let category = DependencyCategory::NodeModules;
    let json = serde_json::to_string(&category).unwrap();
    assert_eq!(json, "\"NODE_MODULES\"");

    let category = DependencyCategory::PythonVenv;
    let json = serde_json::to_string(&category).unwrap();
    assert_eq!(json, "\"PYTHON_VENV\"");

    let category = DependencyCategory::Composer;
    let json = serde_json::to_string(&category).unwrap();
    assert_eq!(json, "\"COMPOSER\"");

    let category = DependencyCategory::Bundler;
    let json = serde_json::to_string(&category).unwrap();
    assert_eq!(json, "\"BUNDLER\"");

    let category = DependencyCategory::ElixirDeps;
    let json = serde_json::to_string(&category).unwrap();
    assert_eq!(json, "\"ELIXIR_DEPS\"");

    let category = DependencyCategory::DartTool;
    let json = serde_json::to_string(&category).unwrap();
    assert_eq!(json, "\"DART_TOOL\"");

    let category = DependencyCategory::GoMod;
    let json = serde_json::to_string(&category).unwrap();
    assert_eq!(json, "\"GO_MOD\"");
}

#[test]
fn test_dependency_category_deserialization() {
    let category: DependencyCategory = serde_json::from_str("\"NODE_MODULES\"").unwrap();
    assert_eq!(category, DependencyCategory::NodeModules);

    let category: DependencyCategory = serde_json::from_str("\"COMPOSER\"").unwrap();
    assert_eq!(category, DependencyCategory::Composer);

    let category: DependencyCategory = serde_json::from_str("\"BUNDLER\"").unwrap();
    assert_eq!(category, DependencyCategory::Bundler);

    let category: DependencyCategory = serde_json::from_str("\"PYTHON_VENV\"").unwrap();
    assert_eq!(category, DependencyCategory::PythonVenv);

    let category: DependencyCategory = serde_json::from_str("\"ELIXIR_DEPS\"").unwrap();
    assert_eq!(category, DependencyCategory::ElixirDeps);

    let category: DependencyCategory = serde_json::from_str("\"DART_TOOL\"").unwrap();
    assert_eq!(category, DependencyCategory::DartTool);

    let category: DependencyCategory = serde_json::from_str("\"GO_MOD\"").unwrap();
    assert_eq!(category, DependencyCategory::GoMod);
}

#[test]
fn test_get_target_directory_names() {
    let mut enabled = HashSet::new();
    enabled.insert(DependencyCategory::NodeModules);
    enabled.insert(DependencyCategory::PythonVenv);

    let names = get_target_directory_names(&enabled);
    assert!(names.contains("node_modules"));
    assert!(names.contains(".venv"));
    assert!(names.contains("venv"));
    assert!(!names.contains("vendor"));
    assert!(!names.contains("Pods"));
}

#[test]
fn test_get_target_directory_names_with_vendor_categories() {
    let mut enabled = HashSet::new();
    enabled.insert(DependencyCategory::Composer);

    let names = get_target_directory_names(&enabled);
    assert!(names.contains("vendor"));

    let mut enabled = HashSet::new();
    enabled.insert(DependencyCategory::Bundler);

    let names = get_target_directory_names(&enabled);
    assert!(names.contains("vendor"));
}

#[test]
fn test_get_target_directory_names_all() {
    let enabled: HashSet<DependencyCategory> = DependencyCategory::all().into_iter().collect();
    let names = get_target_directory_names(&enabled);

    assert!(names.contains("node_modules"));
    assert!(names.contains("vendor"));
    assert!(names.contains("Pods"));
    assert!(names.contains(".venv"));
    assert!(names.contains("venv"));
    assert!(names.contains("deps"));
    assert!(names.contains(".dart_tool"));
    assert!(names.contains("pkg"));
}

#[test]
fn test_get_all_dependency_directory_names() {
    let names = get_all_dependency_directory_names();

    assert!(names.contains("node_modules"));
    assert!(names.contains("vendor"));
    assert!(names.contains("Pods"));
    assert!(names.contains(".venv"));
    assert!(names.contains("venv"));
    assert!(names.contains("deps"));
    assert!(names.contains(".dart_tool"));
    assert!(names.contains("pkg"));
    // vendor is shared between Composer and Bundler so 8 unique names
    assert_eq!(names.len(), 8);
}

#[test]
fn test_directory_entry_serialization() {
    let entry = DirectoryEntry {
        path: "/Users/test/project/node_modules".to_string(),
        size_bytes: 104_857_600, // 100MB
        file_count: 5000,
        last_modified_ms: 1704067200000, // 2024-01-01 00:00:00 UTC
        category: DependencyCategory::NodeModules,
        has_only_symlinks: false,
    };

    let json = serde_json::to_string(&entry).unwrap();
    assert!(json.contains("\"sizeBytes\":104857600"));
    assert!(json.contains("\"fileCount\":5000"));
    assert!(json.contains("\"path\":\"/Users/test/project/node_modules\""));
    assert!(json.contains("\"lastModifiedMs\":1704067200000"));
    assert!(json.contains("\"category\":\"NODE_MODULES\""));
    assert!(json.contains("\"hasOnlySymlinks\":false"));
}

#[test]
fn test_directory_entry_deserialization() {
    // Test with hasOnlySymlinks present
    let json = r#"{"path":"/test/node_modules","sizeBytes":1024,"fileCount":10,"lastModifiedMs":1704067200000,"category":"NODE_MODULES","hasOnlySymlinks":true}"#;
    let entry: DirectoryEntry = serde_json::from_str(json).unwrap();

    assert_eq!(entry.path, "/test/node_modules");
    assert_eq!(entry.size_bytes, 1024);
    assert_eq!(entry.file_count, 10);
    assert_eq!(entry.last_modified_ms, 1704067200000);
    assert_eq!(entry.category, DependencyCategory::NodeModules);
    assert!(entry.has_only_symlinks);
}

#[test]
fn test_directory_entry_deserialization_without_has_only_symlinks() {
    // Test backward compatibility - hasOnlySymlinks defaults to false when missing
    let json = r#"{"path":"/test/node_modules","sizeBytes":1024,"fileCount":10,"lastModifiedMs":1704067200000,"category":"NODE_MODULES"}"#;
    let entry: DirectoryEntry = serde_json::from_str(json).unwrap();

    assert_eq!(entry.path, "/test/node_modules");
    assert!(!entry.has_only_symlinks);
}

#[test]
fn test_scan_result_serialization() {
    let result = ScanResult {
        entries: vec![
            DirectoryEntry {
                path: "/project-a/node_modules".to_string(),
                size_bytes: 1000,
                file_count: 100,
                last_modified_ms: 1704067200000,
                category: DependencyCategory::NodeModules,
                has_only_symlinks: false,
            },
            DirectoryEntry {
                path: "/project-b/vendor".to_string(),
                size_bytes: 2000,
                file_count: 200,
                last_modified_ms: 1704153600000,
                category: DependencyCategory::Composer,
                has_only_symlinks: true,
            },
        ],
        total_size: 3000,
        scan_time_ms: 1500,
        skipped_count: 5,
    };

    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("\"totalSize\":3000"));
    assert!(json.contains("\"scanTimeMs\":1500"));
    assert!(json.contains("\"skippedCount\":5"));
    assert!(json.contains("\"entries\":["));
    assert!(json.contains("\"category\":\"NODE_MODULES\""));
    assert!(json.contains("\"category\":\"COMPOSER\""));
}

#[test]
fn test_scan_stats_serialization() {
    let stats = ScanStats {
        total_size: 1_073_741_824,
        directory_count: 10,
        current_path: Some("/Users/test/current".to_string()),
    };

    let json = serde_json::to_string(&stats).unwrap();
    assert!(json.contains("\"totalSize\":1073741824"));
    assert!(json.contains("\"directoryCount\":10"));
    assert!(json.contains("\"currentPath\":\"/Users/test/current\""));
}

#[test]
fn test_scan_stats_with_null_path() {
    let stats = ScanStats {
        total_size: 0,
        directory_count: 0,
        current_path: None,
    };

    let json = serde_json::to_string(&stats).unwrap();
    assert!(json.contains("\"currentPath\":null"));
}

#[test]
fn test_directory_entry_clone() {
    let original = DirectoryEntry {
        path: "/test/node_modules".to_string(),
        size_bytes: 1024,
        file_count: 50,
        last_modified_ms: 1704067200000,
        category: DependencyCategory::NodeModules,
        has_only_symlinks: true,
    };

    let cloned = original.clone();
    assert_eq!(cloned.path, original.path);
    assert_eq!(cloned.size_bytes, original.size_bytes);
    assert_eq!(cloned.file_count, original.file_count);
    assert_eq!(cloned.last_modified_ms, original.last_modified_ms);
    assert_eq!(cloned.category, original.category);
    assert_eq!(cloned.has_only_symlinks, original.has_only_symlinks);
}

#[test]
fn test_scan_result_empty() {
    let result = ScanResult {
        entries: vec![],
        total_size: 0,
        scan_time_ms: 50,
        skipped_count: 0,
    };

    let json = serde_json::to_string(&result).unwrap();
    let parsed: ScanResult = serde_json::from_str(&json).unwrap();

    assert!(parsed.entries.is_empty());
    assert_eq!(parsed.total_size, 0);
}

#[test]
fn test_dependency_category_labels() {
    assert_eq!(
        DependencyCategory::NodeModules.label(),
        "Node.js (node_modules)"
    );
    assert_eq!(DependencyCategory::Composer.label(), "PHP (vendor)");
    assert_eq!(DependencyCategory::Bundler.label(), "Ruby (vendor)");
    assert_eq!(DependencyCategory::Pods.label(), "iOS (Pods)");
    assert_eq!(DependencyCategory::PythonVenv.label(), "Python (venv)");
    assert_eq!(DependencyCategory::ElixirDeps.label(), "Elixir (deps)");
    assert_eq!(DependencyCategory::DartTool.label(), "Dart (dart_tool)");
    assert_eq!(DependencyCategory::GoMod.label(), "Go (pkg/mod)");
}
