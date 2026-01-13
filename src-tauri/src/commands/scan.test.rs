use super::*;
use std::fs;
use tempfile::TempDir;

#[tokio::test]
async fn test_rescan_directory_nonexistent() {
    let result = rescan_directory("/nonexistent/path/that/does/not/exist/node_modules".to_string())
        .await
        .unwrap();

    assert!(!result.exists);
    assert!(result.entry.is_none());
}

#[tokio::test]
async fn test_rescan_directory_existing_node_modules() {
    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("node_modules");
    fs::create_dir(&node_modules).unwrap();

    fs::write(node_modules.join("package.json"), r#"{"name": "test"}"#).unwrap();
    fs::write(node_modules.join("index.js"), "console.log('hello');").unwrap();

    let result = rescan_directory(node_modules.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists);
    assert!(result.entry.is_some());

    let entry = result.entry.unwrap();
    assert_eq!(entry.path, node_modules.to_string_lossy().to_string());
    assert!(entry.size_bytes > 0);
    assert_eq!(entry.file_count, 2);
    assert_eq!(entry.category, DependencyCategory::NodeModules);
}

#[tokio::test]
async fn test_rescan_directory_existing_vendor_php() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("vendor");
    fs::create_dir(&vendor).unwrap();

    fs::write(vendor.join("autoload.php"), "<?php // autoload").unwrap();

    let result = rescan_directory(vendor.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists);
    assert!(result.entry.is_some());

    let entry = result.entry.unwrap();
    assert_eq!(entry.category, DependencyCategory::Composer);
}

#[tokio::test]
async fn test_rescan_directory_existing_vendor_ruby() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("vendor");
    fs::create_dir(&vendor).unwrap();
    fs::create_dir(vendor.join("bundle")).unwrap();

    let result = rescan_directory(vendor.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists);
    assert!(result.entry.is_some());

    let entry = result.entry.unwrap();
    assert_eq!(entry.category, DependencyCategory::Bundler);
}

#[tokio::test]
async fn test_rescan_directory_file_not_directory() {
    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("node_modules");
    fs::write(&file_path, "this is a file, not a directory").unwrap();

    let result = rescan_directory(file_path.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(!result.exists);
    assert!(result.entry.is_none());
}

#[tokio::test]
async fn test_rescan_directory_unknown_category() {
    let temp_dir = TempDir::new().unwrap();
    let unknown_dir = temp_dir.path().join("unknown_category");
    fs::create_dir(&unknown_dir).unwrap();

    let result = rescan_directory(unknown_dir.to_string_lossy().to_string()).await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_rescan_directory_empty_directory() {
    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("node_modules");
    fs::create_dir(&node_modules).unwrap();

    let result = rescan_directory(node_modules.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists);
    assert!(result.entry.is_some());

    let entry = result.entry.unwrap();
    assert_eq!(entry.size_bytes, 0);
    assert_eq!(entry.file_count, 0);
}

#[tokio::test]
async fn test_rescan_directory_nested_files() {
    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("node_modules");
    let nested = node_modules.join("package").join("dist");
    fs::create_dir_all(&nested).unwrap();

    fs::write(node_modules.join("file1.txt"), "12345").unwrap();
    fs::write(nested.join("file2.txt"), "123").unwrap();

    let result = rescan_directory(node_modules.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists);
    let entry = result.entry.unwrap();
    assert_eq!(entry.size_bytes, 8);
    assert_eq!(entry.file_count, 2);
}

#[tokio::test]
async fn test_rescan_directory_venv() {
    let temp_dir = TempDir::new().unwrap();
    let venv = temp_dir.path().join(".venv");
    fs::create_dir(&venv).unwrap();

    fs::write(venv.join("pyvenv.cfg"), "home = /usr/bin/python3").unwrap();

    let result = rescan_directory(venv.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists);
    assert!(result.entry.is_some());

    let entry = result.entry.unwrap();
    assert_eq!(entry.category, DependencyCategory::PythonVenv);
}

#[tokio::test]
async fn test_rescan_directory_pods() {
    let temp_dir = TempDir::new().unwrap();
    let pods = temp_dir.path().join("Pods");
    fs::create_dir(&pods).unwrap();

    fs::write(pods.join("Manifest.lock"), "COCOAPODS: 1.0.0").unwrap();

    let result = rescan_directory(pods.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists);
    assert!(result.entry.is_some());

    let entry = result.entry.unwrap();
    assert_eq!(entry.category, DependencyCategory::Pods);
}

#[test]
fn test_is_inside_dependency_directory() {
    let all_deps = get_all_dependency_directory_names();

    assert!(!is_inside_dependency_directory(
        "/Users/testuser/project/node_modules",
        "node_modules",
        &all_deps
    ));

    assert!(is_inside_dependency_directory(
        "/Users/testuser/project/node_modules/pkg/node_modules",
        "node_modules",
        &all_deps
    ));

    assert!(is_inside_dependency_directory(
        "/Users/testuser/project/vendor/package/node_modules",
        "node_modules",
        &all_deps
    ));

    assert!(is_inside_dependency_directory(
        "/Users/testuser/project/node_modules/rust-pkg/target",
        "target",
        &all_deps
    ));

    assert!(!is_inside_dependency_directory(
        "/Users/testuser/rust-project/target",
        "target",
        &all_deps
    ));
}

#[test]
fn test_pnpm_nested_node_modules_are_filtered() {
    let all_deps = get_all_dependency_directory_names();

    assert!(is_inside_dependency_directory(
        "/project/node_modules/.pnpm/lodash@4.17.21/node_modules",
        "node_modules",
        &all_deps
    ));

    assert!(!is_inside_dependency_directory(
        "/project/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_monorepo_packages_not_filtered() {
    let all_deps = get_all_dependency_directory_names();

    assert!(!is_inside_dependency_directory(
        "/monorepo/packages/tailwind/node_modules",
        "node_modules",
        &all_deps
    ));

    assert!(!is_inside_dependency_directory(
        "/monorepo/packages/schema/node_modules",
        "node_modules",
        &all_deps
    ));

    assert!(!is_inside_dependency_directory(
        "/monorepo/apps/web/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_get_last_modified_ms() {
    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("test.txt");
    fs::write(&file_path, "content").unwrap();

    let modified_ms = get_last_modified_ms(&file_path);

    assert!(modified_ms > 1577836800000);
}

#[test]
fn test_get_last_modified_ms_nonexistent() {
    let path = Path::new("/nonexistent/path");
    let modified_ms = get_last_modified_ms(path);

    assert_eq!(modified_ms, 0);
}

#[tokio::test]
async fn test_rescan_monorepo_packages_have_correct_sizes() {
    let temp_dir = TempDir::new().unwrap();

    let tailwind_nm = temp_dir
        .path()
        .join("packages")
        .join("tailwind")
        .join("node_modules");
    fs::create_dir_all(&tailwind_nm).unwrap();
    fs::write(
        tailwind_nm.join("package.json"),
        r#"{"name": "tailwind-pkg"}"#,
    )
    .unwrap();
    fs::write(tailwind_nm.join("index.js"), "module.exports = {};").unwrap();

    let schema_nm = temp_dir
        .path()
        .join("packages")
        .join("schema")
        .join("node_modules");
    fs::create_dir_all(&schema_nm).unwrap();
    fs::write(schema_nm.join("package.json"), r#"{"name": "schema-pkg"}"#).unwrap();
    fs::write(schema_nm.join("lib.js"), "export const schema = {};").unwrap();
    fs::write(schema_nm.join("types.d.ts"), "export interface Schema {}").unwrap();

    let result = rescan_directory(tailwind_nm.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists, "tailwind node_modules should exist");
    let tailwind_entry = result.entry.unwrap();
    assert_eq!(tailwind_entry.file_count, 2, "tailwind should have 2 files");
    assert!(
        tailwind_entry.size_bytes > 0,
        "tailwind size should be > 0, got {}",
        tailwind_entry.size_bytes
    );

    let result = rescan_directory(schema_nm.to_string_lossy().to_string())
        .await
        .unwrap();

    assert!(result.exists, "schema node_modules should exist");
    let schema_entry = result.entry.unwrap();
    assert_eq!(schema_entry.file_count, 3, "schema should have 3 files");
    assert!(
        schema_entry.size_bytes > 0,
        "schema size should be > 0, got {}",
        schema_entry.size_bytes
    );
}
