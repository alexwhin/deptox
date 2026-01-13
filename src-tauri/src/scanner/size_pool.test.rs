use super::*;
use std::fs;
use std::time::Duration;
use tempfile::TempDir;

#[test]
fn test_pool_creation_with_single_thread() {
    let pool = SizeCalculatorPool::new(1).unwrap();
    assert!(pool.sender.is_some());
}

#[test]
fn test_pool_creation_with_multiple_threads() {
    let pool = SizeCalculatorPool::new(4).unwrap();
    assert!(pool.sender.is_some());
}

#[test]
fn test_pool_calculates_correct_size_for_single_file() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("test_dir");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("file.txt"), "hello world").unwrap();

    let pool = SizeCalculatorPool::new(2).unwrap();

    let submitted = pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );
    assert!(submitted);

    let result = pool.results().recv_timeout(Duration::from_secs(5));
    assert!(result.is_ok());

    let result = result.unwrap();
    assert_eq!(result.total_size, 11); // "hello world" = 11 bytes
    assert_eq!(result.file_count, 1);
    assert_eq!(result.category, DependencyCategory::NodeModules);
    assert!(!result.has_only_symlinks);
}

#[test]
fn test_pool_calculates_correct_size_for_multiple_files() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("multi_file_dir");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("file1.txt"), "hello").unwrap(); // 5 bytes
    fs::write(test_path.join("file2.txt"), "world").unwrap(); // 5 bytes
    fs::write(test_path.join("file3.txt"), "test").unwrap(); // 4 bytes

    let pool = SizeCalculatorPool::new(2).unwrap();

    pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::Composer,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 14);
    assert_eq!(result.file_count, 3);
    assert_eq!(result.category, DependencyCategory::Composer);
}

#[test]
fn test_pool_calculates_nested_directories() {
    let temp_dir = TempDir::new().unwrap();
    let root_path = temp_dir.path().join("nested_root");
    let nested_path = root_path.join("level1").join("level2");

    fs::create_dir_all(&nested_path).unwrap();
    fs::write(root_path.join("root.txt"), "root").unwrap(); // 4 bytes
    fs::write(nested_path.join("deep.txt"), "deep content").unwrap(); // 12 bytes

    let pool = SizeCalculatorPool::new(2).unwrap();

    pool.submit(
        root_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 16);
    assert_eq!(result.file_count, 2);
}

#[test]
fn test_pool_handles_empty_directory() {
    let temp_dir = TempDir::new().unwrap();
    let empty_path = temp_dir.path().join("empty_dir");
    fs::create_dir(&empty_path).unwrap();

    let pool = SizeCalculatorPool::new(2).unwrap();

    pool.submit(
        empty_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert!(!result.has_only_symlinks);
}

#[test]
fn test_pool_handles_multiple_concurrent_requests() {
    let temp_dir = TempDir::new().unwrap();

    let mut paths = Vec::new();
    for index in 0..10 {
        let path = temp_dir.path().join(format!("dir_{}", index));
        fs::create_dir(&path).unwrap();
        fs::write(path.join("file.txt"), format!("content_{}", index)).unwrap();
        paths.push(path);
    }

    let pool = SizeCalculatorPool::new(4).unwrap();

    for path in &paths {
        pool.submit(
            path.to_string_lossy().to_string(),
            DependencyCategory::NodeModules,
        );
    }

    let mut results = Vec::new();
    for _ in 0..10 {
        let result = pool.results().recv_timeout(Duration::from_secs(10));
        assert!(result.is_ok(), "Should receive result within timeout");
        results.push(result.unwrap());
    }

    assert_eq!(results.len(), 10);
    for result in &results {
        assert_eq!(result.file_count, 1);
        assert!(result.total_size > 0);
    }
}

#[test]
fn test_pool_preserves_path_in_result() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("preserve_path_test");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("file.txt"), "content").unwrap();

    let path_string = test_path.to_string_lossy().to_string();

    let pool = SizeCalculatorPool::new(1).unwrap();
    pool.submit(path_string.clone(), DependencyCategory::NodeModules);

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.path, path_string);
}

#[test]
fn test_pool_preserves_category_in_result() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("category_test");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("file.txt"), "content").unwrap();

    let pool = SizeCalculatorPool::new(1).unwrap();

    // Test each category
    let categories = [
        DependencyCategory::NodeModules,
        DependencyCategory::Composer,
        DependencyCategory::Bundler,
        DependencyCategory::Pods,
        DependencyCategory::PythonVenv,
    ];

    for category in categories {
        let path = temp_dir.path().join(format!("cat_{:?}", category));
        fs::create_dir(&path).unwrap();
        fs::write(path.join("file.txt"), "test").unwrap();

        pool.submit(path.to_string_lossy().to_string(), category);
    }

    let mut received_categories = Vec::new();
    for _ in 0..categories.len() {
        let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();
        received_categories.push(result.category);
    }

    for category in categories {
        assert!(
            received_categories.contains(&category),
            "Should have received result for category {:?}",
            category
        );
    }
}

#[test]
fn test_pool_returns_last_modified_timestamp() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("timestamp_test");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("file.txt"), "content").unwrap();

    let pool = SizeCalculatorPool::new(1).unwrap();
    pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    // The last_modified_ms should be a reasonable timestamp (after year 2000)
    let year_2000_ms: u64 = 946684800000;
    assert!(
        result.last_modified_ms > year_2000_ms,
        "last_modified_ms should be a valid timestamp"
    );
}

#[test]
fn test_pool_shutdown_stops_accepting_requests() {
    let pool = SizeCalculatorPool::new(2).unwrap();
    let mut pool = pool;

    pool.shutdown();

    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("after_shutdown");
    fs::create_dir(&test_path).unwrap();

    let submitted = pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    assert!(!submitted, "Should not accept requests after shutdown");
}

#[test]
fn test_pool_submit_returns_true_when_successful() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("submit_test");
    fs::create_dir(&test_path).unwrap();

    let pool = SizeCalculatorPool::new(1).unwrap();

    let submitted = pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    assert!(submitted);
}

#[test]
fn test_pool_handles_nonexistent_path() {
    let pool = SizeCalculatorPool::new(1).unwrap();

    pool.submit(
        "/nonexistent/path/that/does/not/exist".to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert_eq!(result.path, "/nonexistent/path/that/does/not/exist");
}

#[test]
fn test_pool_results_receiver_is_accessible() {
    let pool = SizeCalculatorPool::new(1).unwrap();
    let receiver = pool.results();

    // Just verify we can access the receiver
    assert!(receiver.is_empty());
}

#[test]
fn test_pool_handles_files_with_empty_content() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("empty_files");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("empty1.txt"), "").unwrap();
    fs::write(test_path.join("empty2.txt"), "").unwrap();

    let pool = SizeCalculatorPool::new(1).unwrap();
    pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 2);
}

#[test]
fn test_pool_drop_triggers_shutdown() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("drop_test");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("file.txt"), "content").unwrap();

    {
        let pool = SizeCalculatorPool::new(2).unwrap();
        pool.submit(
            test_path.to_string_lossy().to_string(),
            DependencyCategory::NodeModules,
        );
        // Pool is dropped here
    }

    // If we got here without hanging, drop worked correctly
    assert!(true);
}

#[test]
fn test_size_calculation_result_fields() {
    let result = SizeCalculationResult {
        path: "/test/path".to_string(),
        category: DependencyCategory::NodeModules,
        total_size: 1024,
        file_count: 10,
        last_modified_ms: 1234567890000,
        has_only_symlinks: false,
    };

    assert_eq!(result.path, "/test/path");
    assert_eq!(result.category, DependencyCategory::NodeModules);
    assert_eq!(result.total_size, 1024);
    assert_eq!(result.file_count, 10);
    assert_eq!(result.last_modified_ms, 1234567890000);
    assert!(!result.has_only_symlinks);
}

#[test]
fn test_pool_handles_deeply_nested_structure() {
    let temp_dir = TempDir::new().unwrap();
    let root_path = temp_dir.path().join("deep_root");

    // Create a deeply nested structure
    let deep_path = root_path
        .join("level1")
        .join("level2")
        .join("level3")
        .join("level4")
        .join("level5");

    fs::create_dir_all(&deep_path).unwrap();
    fs::write(deep_path.join("deep_file.txt"), "deeply nested").unwrap();

    let pool = SizeCalculatorPool::new(2).unwrap();
    pool.submit(
        root_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 13); // "deeply nested" = 13 bytes
    assert_eq!(result.file_count, 1);
}

#[test]
#[cfg(unix)]
fn test_pool_handles_symlinks() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let real_dir = temp_dir.path().join("real");
    let link_dir = temp_dir.path().join("links");

    fs::create_dir(&real_dir).unwrap();
    fs::create_dir(&link_dir).unwrap();
    fs::write(real_dir.join("real_file.txt"), "content").unwrap();

    // Create valid symlink
    symlink(
        real_dir.join("real_file.txt"),
        link_dir.join("link_file.txt"),
    )
    .unwrap();

    let pool = SizeCalculatorPool::new(1).unwrap();
    pool.submit(
        link_dir.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    // Symlink should follow to real file
    assert_eq!(result.total_size, 7); // "content" = 7 bytes
    assert!(!result.has_only_symlinks);
}

#[test]
#[cfg(unix)]
fn test_pool_detects_broken_symlinks_only_directory() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("broken_symlinks");
    fs::create_dir(&test_path).unwrap();

    // Create broken symlinks
    symlink("/nonexistent/target1", test_path.join("broken1")).unwrap();
    symlink("/nonexistent/target2", test_path.join("broken2")).unwrap();

    let pool = SizeCalculatorPool::new(1).unwrap();
    pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert!(result.has_only_symlinks);
}

#[test]
fn test_pool_handles_hidden_files() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("hidden_files");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join(".hidden"), "secret").unwrap(); // 6 bytes
    fs::write(test_path.join(".gitignore"), "*.log").unwrap(); // 5 bytes

    let pool = SizeCalculatorPool::new(1).unwrap();
    pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 11);
    assert_eq!(result.file_count, 2);
}

#[test]
fn test_pool_handles_special_characters_in_path() {
    let temp_dir = TempDir::new().unwrap();
    let test_path = temp_dir.path().join("special chars & spaces");
    fs::create_dir(&test_path).unwrap();
    fs::write(test_path.join("file with spaces.txt"), "data").unwrap();

    let pool = SizeCalculatorPool::new(1).unwrap();
    pool.submit(
        test_path.to_string_lossy().to_string(),
        DependencyCategory::NodeModules,
    );

    let result = pool.results().recv_timeout(Duration::from_secs(5)).unwrap();

    assert_eq!(result.total_size, 4);
    assert_eq!(result.file_count, 1);
}
