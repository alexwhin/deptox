use super::*;
use std::fs;
use tempfile::TempDir;

#[tokio::test]
async fn test_get_largest_files_finds_files() {
    let temp_dir = TempDir::new().unwrap();

    fs::write(temp_dir.path().join("small.txt"), "hello").unwrap();
    fs::write(temp_dir.path().join("medium.txt"), "a".repeat(1000)).unwrap();
    fs::write(temp_dir.path().join("large.txt"), "b".repeat(5000)).unwrap();

    let result = get_largest_files(temp_dir.path().to_string_lossy().to_string())
        .await
        .unwrap();

    assert_eq!(result.files.len(), 3);
    assert_eq!(result.files[0].size_bytes, 5000);
    assert_eq!(result.files[1].size_bytes, 1000);
    assert_eq!(result.files[2].size_bytes, 5);
}

#[tokio::test]
async fn test_get_largest_files_limits_to_eight() {
    let temp_dir = TempDir::new().unwrap();

    for index in 0..12 {
        let content = "x".repeat((index + 1) * 100);
        fs::write(temp_dir.path().join(format!("file_{}.txt", index)), content).unwrap();
    }

    let result = get_largest_files(temp_dir.path().to_string_lossy().to_string())
        .await
        .unwrap();

    assert_eq!(result.files.len(), 8);
    assert_eq!(result.files[0].size_bytes, 1200);
    assert_eq!(result.files[7].size_bytes, 500);
}

#[tokio::test]
async fn test_get_largest_files_nested_directories() {
    let temp_dir = TempDir::new().unwrap();

    fs::create_dir(temp_dir.path().join("subdir")).unwrap();
    fs::write(temp_dir.path().join("root.txt"), "root").unwrap();
    fs::write(temp_dir.path().join("subdir/nested.txt"), "a".repeat(1000)).unwrap();

    let result = get_largest_files(temp_dir.path().to_string_lossy().to_string())
        .await
        .unwrap();

    assert_eq!(result.files.len(), 2);
    assert!(result.files[0].path.contains("nested.txt"));
    assert_eq!(result.files[0].size_bytes, 1000);
}

#[tokio::test]
async fn test_get_largest_files_empty_directory() {
    let temp_dir = TempDir::new().unwrap();

    let result = get_largest_files(temp_dir.path().to_string_lossy().to_string())
        .await
        .unwrap();

    assert_eq!(result.files.len(), 0);
}

#[tokio::test]
async fn test_get_largest_files_nonexistent_directory() {
    let result = get_largest_files("/nonexistent/path/that/does/not/exist".to_string()).await;

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("does not exist"));
}

#[tokio::test]
async fn test_get_largest_files_on_file_not_directory() {
    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("file.txt");
    fs::write(&file_path, "content").unwrap();

    let result = get_largest_files(file_path.to_string_lossy().to_string()).await;

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not a directory"));
}

#[tokio::test]
async fn test_get_largest_files_returns_sorted() {
    let temp_dir = TempDir::new().unwrap();

    fs::write(temp_dir.path().join("a.txt"), "a".repeat(100)).unwrap();
    fs::write(temp_dir.path().join("b.txt"), "b".repeat(500)).unwrap();
    fs::write(temp_dir.path().join("c.txt"), "c".repeat(300)).unwrap();

    let result = get_largest_files(temp_dir.path().to_string_lossy().to_string())
        .await
        .unwrap();

    assert_eq!(result.files[0].size_bytes, 500);
    assert_eq!(result.files[1].size_bytes, 300);
    assert_eq!(result.files[2].size_bytes, 100);
}

#[tokio::test]
async fn test_get_largest_files_includes_directory_path() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join("file.txt"), "content").unwrap();

    let path = temp_dir.path().to_string_lossy().to_string();
    let result = get_largest_files(path.clone()).await.unwrap();

    assert_eq!(result.directory_path, path);
}
