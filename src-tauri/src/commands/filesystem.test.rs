use super::*;
#[cfg(target_os = "macos")]
use std::fs;
#[cfg(target_os = "macos")]
use tempfile::TempDir;

#[test]
#[cfg(target_os = "macos")]
fn test_validate_path_exists_with_existing_path() {
    let temp_dir = TempDir::new().unwrap();
    let result = validate_path_exists(temp_dir.path().to_str().unwrap());
    assert!(result.is_ok());
}

#[test]
#[cfg(target_os = "macos")]
fn test_validate_path_exists_with_existing_file() {
    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("test_file.txt");
    fs::write(&file_path, "test content").unwrap();

    let result = validate_path_exists(file_path.to_str().unwrap());
    assert!(result.is_ok());
}

#[test]
#[cfg(target_os = "macos")]
fn test_validate_path_exists_with_nonexistent_path() {
    let result = validate_path_exists("/nonexistent/path/that/does/not/exist");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Path does not exist");
}

#[test]
#[cfg(target_os = "macos")]
fn test_validate_path_exists_with_empty_path() {
    let result = validate_path_exists("");
    assert!(result.is_err());
}

#[test]
#[cfg(target_os = "macos")]
fn test_open_in_finder_with_nonexistent_path() {
    let result = open_in_finder("/nonexistent/path/that/does/not/exist".to_string());
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Path does not exist");
}

#[test]
#[cfg(target_os = "macos")]
fn test_open_in_finder_with_empty_path() {
    let result = open_in_finder("".to_string());
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Path does not exist");
}

#[test]
#[cfg(target_os = "macos")]
fn test_open_in_finder_with_existing_directory() {
    let home_dir = dirs::home_dir().unwrap();
    let temp_dir = tempfile::Builder::new()
        .prefix("deptox_test_")
        .tempdir_in(&home_dir)
        .unwrap();
    let result = open_in_finder(temp_dir.path().to_str().unwrap().to_string());
    assert!(result.is_ok());
}

#[test]
#[cfg(target_os = "macos")]
fn test_open_in_finder_with_existing_file() {
    let home_dir = dirs::home_dir().unwrap();
    let temp_dir = tempfile::Builder::new()
        .prefix("deptox_test_")
        .tempdir_in(&home_dir)
        .unwrap();
    let file_path = temp_dir.path().join("test_file.txt");
    fs::write(&file_path, "test content").unwrap();

    let result = open_in_finder(file_path.to_str().unwrap().to_string());
    assert!(result.is_ok());
}

#[test]
#[cfg(target_os = "macos")]
fn test_validate_path_exists_with_special_characters() {
    let temp_dir = TempDir::new().unwrap();
    let special_path = temp_dir.path().join("test file with spaces");
    fs::create_dir(&special_path).unwrap();

    let result = validate_path_exists(special_path.to_str().unwrap());
    assert!(result.is_ok());
}

#[test]
#[cfg(target_os = "macos")]
fn test_validate_path_exists_with_unicode() {
    let temp_dir = TempDir::new().unwrap();
    let unicode_path = temp_dir.path().join("test_日本語_文件夹");
    fs::create_dir(&unicode_path).unwrap();

    let result = validate_path_exists(unicode_path.to_str().unwrap());
    assert!(result.is_ok());
}

#[test]
#[cfg(not(target_os = "macos"))]
fn test_open_in_finder_unsupported_platform() {
    let result = open_in_finder("/some/path".to_string());
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "open_in_finder is only supported on macOS"
    );
}
