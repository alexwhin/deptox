use super::*;
use crate::config;
use crate::scanner::types::get_all_dependency_directory_names;

// ============================================
// Constants Tests
// ============================================

#[test]
fn test_max_scan_depth_is_reasonable() {
    // Depth should be enough to find deeply nested projects but not too deep
    assert!(
        config::scanner::MAX_SCAN_DEPTH >= 10,
        "Should scan at least 10 levels deep"
    );
    assert!(
        config::scanner::MAX_SCAN_DEPTH <= 30,
        "Should not scan too deep (performance)"
    );
}

#[test]
fn test_jwalk_busy_timeout_is_reasonable() {
    // Timeout should be short enough for responsiveness
    assert!(config::scanner::JWALK_BUSY_TIMEOUT.as_millis() <= 500);
    assert!(config::scanner::JWALK_BUSY_TIMEOUT.as_millis() >= 50);
}

// ============================================
// is_inside_dependency_directory Tests
// ============================================

#[test]
fn test_is_inside_dependency_directory_simple_node_modules() {
    let all_deps = get_all_dependency_directory_names();
    // Not nested - just a regular node_modules
    assert!(!is_inside_dependency_directory(
        "/Users/testuser/project/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_nested_node_modules() {
    let all_deps = get_all_dependency_directory_names();
    // Nested - node_modules inside another node_modules
    assert!(is_inside_dependency_directory(
        "/Users/testuser/project/node_modules/package/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_deeply_nested() {
    let all_deps = get_all_dependency_directory_names();
    // Very deeply nested
    assert!(is_inside_dependency_directory(
        "/project/node_modules/a/node_modules/b/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_target_inside_node_modules() {
    let all_deps = get_all_dependency_directory_names();
    // target directory inside node_modules should be detected
    assert!(is_inside_dependency_directory(
        "/project/node_modules/some-rust-binding/target",
        "target",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_vendor_inside_node_modules() {
    let all_deps = get_all_dependency_directory_names();
    // vendor directory inside node_modules should be detected
    assert!(is_inside_dependency_directory(
        "/project/node_modules/some-php-package/vendor",
        "vendor",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_pods_inside_node_modules() {
    let all_deps = get_all_dependency_directory_names();
    // Pods inside node_modules (e.g., react-native package)
    assert!(is_inside_dependency_directory(
        "/project/node_modules/react-native/ios/Pods",
        "Pods",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_simple_target() {
    let all_deps = get_all_dependency_directory_names();
    // Not nested - regular target directory
    assert!(!is_inside_dependency_directory(
        "/Users/testuser/rust-project/target",
        "target",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_simple_vendor() {
    let all_deps = get_all_dependency_directory_names();
    // Not nested - regular vendor directory
    assert!(!is_inside_dependency_directory(
        "/Users/testuser/php-project/vendor",
        "vendor",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_simple_pods() {
    let all_deps = get_all_dependency_directory_names();
    // Not nested - regular Pods directory
    assert!(!is_inside_dependency_directory(
        "/Users/testuser/ios-project/Pods",
        "Pods",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_empty_path() {
    let all_deps = get_all_dependency_directory_names();
    assert!(!is_inside_dependency_directory(
        "",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_root_only() {
    let all_deps = get_all_dependency_directory_names();
    assert!(!is_inside_dependency_directory(
        "/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_dir_name_not_in_path() {
    let all_deps = get_all_dependency_directory_names();
    // The directory name isn't in the path at all
    assert!(!is_inside_dependency_directory(
        "/Users/testuser/project/src/components",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_substring_match_false_positive() {
    let all_deps = get_all_dependency_directory_names();
    // Should NOT match "node_modules" as substring of "old_node_modules_backup"
    // The function splits by path separator, so this should be safe
    assert!(!is_inside_dependency_directory(
        "/Users/node_modules_backup/project/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_multiple_dependency_types() {
    let all_deps = get_all_dependency_directory_names();
    // target inside vendor should be detected
    assert!(is_inside_dependency_directory(
        "/project/vendor/some-package/target",
        "target",
        &all_deps
    ));

    // node_modules inside Pods should be detected
    assert!(is_inside_dependency_directory(
        "/project/Pods/react-native/node_modules",
        "node_modules",
        &all_deps
    ));

    // venv inside node_modules should be detected
    assert!(is_inside_dependency_directory(
        "/project/node_modules/python-bridge/.venv",
        ".venv",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_case_sensitivity() {
    let all_deps = get_all_dependency_directory_names();
    // Directory names are case-sensitive
    assert!(!is_inside_dependency_directory(
        "/project/NODE_MODULES/package/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
fn test_is_inside_dependency_directory_trailing_slash() {
    let all_deps = get_all_dependency_directory_names();
    // Should handle trailing slash gracefully (results in empty last component)
    assert!(!is_inside_dependency_directory(
        "/Users/testuser/project/node_modules/",
        "node_modules",
        &all_deps
    ));
}

// ============================================
// Path Separator Tests (cross-platform)
// ============================================

#[test]
#[cfg(unix)]
fn test_is_inside_dependency_directory_unix_separator() {
    let all_deps = get_all_dependency_directory_names();
    assert!(is_inside_dependency_directory(
        "/project/node_modules/pkg/node_modules",
        "node_modules",
        &all_deps
    ));
}

#[test]
#[cfg(windows)]
fn test_is_inside_dependency_directory_windows_separator() {
    let all_deps = get_all_dependency_directory_names();
    assert!(is_inside_dependency_directory(
        r"C:\project\node_modules\pkg\node_modules",
        "node_modules",
        &all_deps
    ));
}

// ============================================
// calculate_total_dependency_size Tests
// ============================================

#[test]
fn test_calculate_total_dependency_size_returns_u64() {
    // This test verifies the function signature and return type
    // The actual scan depends on the system's file system and settings
    let result = calculate_total_dependency_size();
    // Result should be a valid u64 (function completes without panicking)
    let _: u64 = result;
}
