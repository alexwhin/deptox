use super::*;
use crate::scanner::calculate_dir_size_full;
use std::fs;
use tempfile::TempDir;

#[test]
fn test_validate_delete_path_nonexistent() {
    let path = Path::new("/nonexistent/path/node_modules");
    let result = validate_delete_path(path);
    // Canonicalize fails for non-existent paths, returning InvalidPath
    assert!(matches!(result, Err(DeleteValidationError::InvalidPath(_))));
}

#[test]
fn test_validate_delete_path_file_not_directory() {
    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("node_modules");
    fs::write(&file_path, "content").unwrap();

    let result = validate_delete_path(&file_path);
    assert_eq!(result, Err(DeleteValidationError::NotADirectory));
}

#[test]
fn test_validate_delete_path_not_dependency_directory() {
    let temp_dir = TempDir::new().unwrap();
    let dir_path = temp_dir.path().join("src");
    fs::create_dir(&dir_path).unwrap();

    let result = validate_delete_path(&dir_path);
    assert_eq!(result, Err(DeleteValidationError::NotDependencyDirectory));
}

#[test]
fn test_validate_delete_path_valid_node_modules() {
    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("project").join("node_modules");
    fs::create_dir_all(&node_modules).unwrap();

    let result = validate_delete_path(&node_modules);
    assert!(result.is_ok());
    // Verify it returns the canonical path
    let canonical = result.unwrap();
    assert!(canonical.ends_with("node_modules"));
}

#[test]
fn test_validate_delete_path_valid_vendor() {
    let temp_dir = TempDir::new().unwrap();
    let vendor = temp_dir.path().join("project").join("vendor");
    fs::create_dir_all(&vendor).unwrap();

    let result = validate_delete_path(&vendor);
    assert!(result.is_ok());
}

#[test]
fn test_validate_delete_path_valid_venv() {
    let temp_dir = TempDir::new().unwrap();
    let venv = temp_dir.path().join("project").join(".venv");
    fs::create_dir_all(&venv).unwrap();

    let result = validate_delete_path(&venv);
    assert!(result.is_ok());
}

#[test]
fn test_validation_error_display() {
    assert_eq!(
        DeleteValidationError::DoesNotExist.to_string(),
        "Directory does not exist"
    );
    assert_eq!(
        DeleteValidationError::NotADirectory.to_string(),
        "Path is not a directory"
    );
    assert_eq!(
        DeleteValidationError::NotDependencyDirectory.to_string(),
        "Can only delete dependency directories"
    );
    assert!(DeleteValidationError::InvalidPath("test error".to_string())
        .to_string()
        .contains("Invalid path"));
}

#[test]
fn test_calculate_dir_size() {
    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("node_modules");
    fs::create_dir(&node_modules).unwrap();

    fs::write(node_modules.join("file1.txt"), "12345").unwrap();
    fs::write(node_modules.join("file2.txt"), "123").unwrap();

    let result = calculate_dir_size_full(&node_modules);
    assert_eq!(result.total_size, 8);
}

#[test]
fn test_calculate_dir_size_nested() {
    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("node_modules");
    let nested = node_modules.join("package").join("lib");
    fs::create_dir_all(&nested).unwrap();

    fs::write(node_modules.join("index.js"), "1234").unwrap();
    fs::write(nested.join("util.js"), "12").unwrap();

    let result = calculate_dir_size_full(&node_modules);
    assert_eq!(result.total_size, 6);
}

#[test]
fn test_delete_result_serialization() {
    let result = DeleteResult {
        success: true,
        path: "/test/node_modules".to_string(),
        size_freed: 1024,
    };

    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("\"success\":true"));
    assert!(json.contains("\"sizeFreed\":1024"));
}

#[test]
fn test_delete_result_deserialization() {
    let json = r#"{"success":false,"path":"/test/path","sizeFreed":0}"#;
    let result: DeleteResult = serde_json::from_str(json).unwrap();
    assert!(!result.success);
    assert_eq!(result.path, "/test/path");
    assert_eq!(result.size_freed, 0);
}

#[test]
fn test_delete_result_clone() {
    let original = DeleteResult {
        success: true,
        path: "/test/node_modules".to_string(),
        size_freed: 1024,
    };
    let cloned = original.clone();
    assert_eq!(original.success, cloned.success);
    assert_eq!(original.path, cloned.path);
    assert_eq!(original.size_freed, cloned.size_freed);
}

#[test]
fn test_delete_validation_error_clone() {
    let original = DeleteValidationError::DoesNotExist;
    let cloned = original.clone();
    assert_eq!(original, cloned);
}

#[test]
fn test_validate_delete_path_valid_pods() {
    let temp_dir = TempDir::new().unwrap();
    let pods = temp_dir.path().join("project").join("Pods");
    fs::create_dir_all(&pods).unwrap();

    let result = validate_delete_path(&pods);
    assert!(result.is_ok());
}

#[test]
fn test_validate_delete_path_traversal_attack_prevention() {
    let temp_dir = TempDir::new().unwrap();

    // Create a legitimate node_modules directory
    let project_dir = temp_dir.path().join("project");
    let node_modules = project_dir.join("node_modules");
    fs::create_dir_all(&node_modules).unwrap();

    // Create a "sensitive" directory that should NOT be deletable
    let sensitive_dir = temp_dir.path().join("sensitive");
    fs::create_dir(&sensitive_dir).unwrap();

    // Attempt path traversal: try to escape via ../
    // This path resolves to the sensitive directory, not node_modules
    let traversal_path = node_modules.join("..").join("..").join("sensitive");

    let result = validate_delete_path(&traversal_path);

    // Should fail because "sensitive" is not a dependency directory name
    assert!(matches!(
        result,
        Err(DeleteValidationError::NotDependencyDirectory)
    ));
}

#[test]
fn test_validate_delete_path_symlink_traversal_prevention() {
    let temp_dir = TempDir::new().unwrap();

    // Create a legitimate node_modules directory
    let project_dir = temp_dir.path().join("project");
    let node_modules = project_dir.join("node_modules");
    fs::create_dir_all(&node_modules).unwrap();

    // Create a "sensitive" directory
    let sensitive_dir = temp_dir.path().join("important_data");
    fs::create_dir(&sensitive_dir).unwrap();

    // Create a symlink inside node_modules pointing to sensitive directory
    let symlink_path = node_modules.join("malicious_link");
    #[cfg(unix)]
    std::os::unix::fs::symlink(&sensitive_dir, &symlink_path).unwrap();
    #[cfg(windows)]
    std::os::windows::fs::symlink_dir(&sensitive_dir, &symlink_path).unwrap();

    let result = validate_delete_path(&symlink_path);

    // canonicalize() resolves symlinks, so it will see "important_data" as the final name
    // which is not a dependency directory
    assert!(matches!(
        result,
        Err(DeleteValidationError::NotDependencyDirectory)
    ));
}

#[test]
fn test_canonicalize_path_resolves_dot_segments() {
    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("project").join("node_modules");
    fs::create_dir_all(&node_modules).unwrap();

    // Path with . and .. segments that still resolves to node_modules
    let path_with_dots = temp_dir
        .path()
        .join("project")
        .join("subdir")
        .join("..")
        .join(".")
        .join("node_modules");

    // First create the subdir so the path is traversable
    fs::create_dir_all(temp_dir.path().join("project").join("subdir")).unwrap();

    let result = validate_delete_path(&path_with_dots);
    assert!(result.is_ok());

    // Verify the canonical path is clean (no . or .. segments)
    let canonical = result.unwrap();
    let path_str = canonical.to_string_lossy();
    assert!(!path_str.contains("/../"));
    assert!(!path_str.contains("/./"));
}
