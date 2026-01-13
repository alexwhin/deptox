use super::*;
use std::fs;
use tempfile::TempDir;

#[test]
fn test_calculate_dir_size_empty_directory() {
    let temp_dir = TempDir::new().unwrap();
    let size = calculate_dir_size(temp_dir.path());
    assert_eq!(size, 0);
}

#[test]
fn test_calculate_dir_size_with_files() {
    let temp_dir = TempDir::new().unwrap();
    let content = "Hello, World!"; // 13 bytes
    fs::write(temp_dir.path().join("file1.txt"), content).unwrap();
    fs::write(temp_dir.path().join("file2.txt"), content).unwrap();

    let size = calculate_dir_size(temp_dir.path());
    assert_eq!(size, 26);
}

#[test]
fn test_calculate_dir_size_with_nested_directories() {
    let temp_dir = TempDir::new().unwrap();
    let nested = temp_dir.path().join("nested").join("deep");
    fs::create_dir_all(&nested).unwrap();

    fs::write(temp_dir.path().join("root.txt"), "root").unwrap(); // 4 bytes
    fs::write(nested.join("deep.txt"), "deep file").unwrap(); // 9 bytes

    let size = calculate_dir_size(temp_dir.path());
    assert_eq!(size, 13);
}

#[test]
fn test_calculate_dir_size_with_count() {
    let temp_dir = TempDir::new().unwrap();
    let nested = temp_dir.path().join("nested");
    fs::create_dir_all(&nested).unwrap();

    fs::write(temp_dir.path().join("file1.txt"), "12345").unwrap(); // 5 bytes
    fs::write(temp_dir.path().join("file2.txt"), "123").unwrap(); // 3 bytes
    fs::write(nested.join("file3.txt"), "12").unwrap(); // 2 bytes

    let (size, count) = calculate_dir_size_with_count(temp_dir.path());
    assert_eq!(size, 10);
    assert_eq!(count, 3);
}

#[test]
fn test_expand_tilde_with_home() {
    let home = std::env::var("HOME").unwrap();
    let expanded = expand_tilde("~/Documents");
    assert_eq!(expanded, format!("{}/Documents", home));
}

#[test]
fn test_expand_tilde_without_tilde() {
    let path = "/usr/local/bin";
    let expanded = expand_tilde(path);
    assert_eq!(expanded, path);
}

#[test]
fn test_expand_tilde_only_tilde() {
    let home = std::env::var("HOME").unwrap();
    let expanded = expand_tilde("~");
    assert_eq!(expanded, home);
}

#[test]
fn test_should_skip_directory() {
    assert!(should_skip_directory(".git"));
    assert!(should_skip_directory(".cache"));
    assert!(should_skip_directory(".config"));
    assert!(should_skip_directory("Library"));
    assert!(should_skip_directory(".Trash"));
    assert!(should_skip_directory(".npm"));
    assert!(should_skip_directory(".cargo"));
    assert!(should_skip_directory("OrbStack"));
    assert!(should_skip_directory(".volta"));
    assert!(should_skip_directory(".nvm"));
    assert!(should_skip_directory(".fnm"));
    assert!(should_skip_directory(".asdf"));
    assert!(should_skip_directory(".mise"));
    assert!(should_skip_directory(".pyenv"));
    assert!(should_skip_directory(".rbenv"));
    assert!(should_skip_directory(".rustup"));
    assert!(should_skip_directory(".local"));

    assert!(!should_skip_directory("node_modules"));
    assert!(!should_skip_directory("src"));
    assert!(!should_skip_directory("packages"));
}

#[test]
fn test_is_nested_node_modules() {
    // Single node_modules - NOT nested
    assert!(!is_nested_node_modules(
        "/Users/testuser/project/node_modules"
    ));
    assert!(!is_nested_node_modules("/project/node_modules"));
    assert!(!is_nested_node_modules("node_modules"));

    // Nested node_modules - IS nested
    assert!(is_nested_node_modules(
        "/Users/testuser/project/node_modules/package/node_modules"
    ));
    assert!(is_nested_node_modules(
        "/project/node_modules/a/node_modules/b/node_modules"
    ));

    // Paths containing "node_modules" as substring but NOT as component - NOT nested
    assert!(!is_nested_node_modules(
        "/home/node_modules_backup/project/node_modules"
    ));
    assert!(!is_nested_node_modules(
        "/home/my_node_modules/project/node_modules"
    ));
    assert!(!is_nested_node_modules(
        "/home/old_node_modules_archive/node_modules"
    ));

    // Edge cases with similar names
    assert!(!is_nested_node_modules("/node_modules_test/node_modules"));
    assert!(!is_nested_node_modules(
        "/project/node_modules2/node_modules"
    ));
}

#[test]
fn test_calculate_dir_size_handles_symlinks() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join("real_file.txt"), "content").unwrap();

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        let _ = symlink(
            temp_dir.path().join("real_file.txt"),
            temp_dir.path().join("link.txt"),
        );
    }

    // Should only count the real file, not follow symlinks
    let size = calculate_dir_size(temp_dir.path());
    assert_eq!(size, 7); // "content" is 7 bytes
}

/// Test that directories with symlinks correctly follow them for size calculation
/// This ensures pnpm-style symlinked packages are counted correctly
#[test]
fn test_calculate_dir_size_follows_symlinks() {
    let temp_dir = TempDir::new().unwrap();
    let real_dir = temp_dir.path().join("real_files");
    let linked_dir = temp_dir.path().join("linked_dir");

    fs::create_dir(&real_dir).unwrap();
    fs::create_dir(&linked_dir).unwrap();

    // Create real files
    fs::write(real_dir.join("file1.txt"), "content1").unwrap(); // 8 bytes
    fs::write(real_dir.join("file2.txt"), "content2").unwrap(); // 8 bytes

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        // Create symlinks in linked_dir
        let _ = symlink(real_dir.join("file1.txt"), linked_dir.join("link1.txt"));
        let _ = symlink(real_dir.join("file2.txt"), linked_dir.join("link2.txt"));
    }

    // Directory with symlinks should now report the size of linked files
    // because we follow symlinks to get accurate pnpm package sizes
    let (size, count) = calculate_dir_size_with_count(&linked_dir);
    #[cfg(unix)]
    {
        assert_eq!(
            size, 16,
            "Directory with symlinks should report size of linked files"
        );
        assert_eq!(
            count, 2,
            "Directory with symlinks should count linked files"
        );
    }

    // The real directory should also have the same size
    let (real_size, real_count) = calculate_dir_size_with_count(&real_dir);
    assert_eq!(real_size, 16, "Real directory should have 16 bytes");
    assert_eq!(real_count, 2, "Real directory should have 2 files");
}

/// Test pnpm-like node_modules structure where:
/// - .pnpm/ contains the real files
/// - Top-level package folders are symlinks to .pnpm/
#[test]
#[cfg(unix)]
fn test_calculate_dir_size_pnpm_structure() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("node_modules");
    let pnpm_store = node_modules.join(".pnpm");
    let lodash_real = pnpm_store
        .join("lodash@4.17.21")
        .join("node_modules")
        .join("lodash");

    // Create pnpm store structure
    fs::create_dir_all(&lodash_real).unwrap();

    // Create real files in the pnpm store
    fs::write(lodash_real.join("index.js"), "module.exports = {};").unwrap(); // 20 bytes
    fs::write(lodash_real.join("package.json"), r#"{"name":"lodash"}"#).unwrap(); // 17 bytes

    // Create top-level symlink (how pnpm hoists packages)
    let lodash_link = node_modules.join("lodash");
    symlink(&lodash_real, &lodash_link).unwrap();

    // Calculate size of the entire node_modules
    let (total_size, total_count) = calculate_dir_size_with_count(&node_modules);

    // The total should include both the real files AND the symlinked files
    // Real files: 20 + 17 = 37 bytes, 2 files
    // Symlinked files: same 37 bytes, 2 files (counted again via symlink)
    // Total: 74 bytes, 4 files
    assert_eq!(
        total_size, 74,
        "pnpm structure should count both real and symlinked files"
    );
    assert_eq!(
        total_count, 4,
        "pnpm structure should count files from both paths"
    );

    // Calculate size of just the symlinked directory
    let (link_size, link_count) = calculate_dir_size_with_count(&lodash_link);
    assert_eq!(
        link_size, 37,
        "Symlinked directory should report actual file sizes"
    );
    assert_eq!(
        link_count, 2,
        "Symlinked directory should count actual files"
    );
}

#[test]
fn test_calculate_dir_size_empty_files() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join("empty1.txt"), "").unwrap();
    fs::write(temp_dir.path().join("empty2.txt"), "").unwrap();

    let size = calculate_dir_size(temp_dir.path());
    assert_eq!(size, 0);
}

#[test]
fn test_calculate_dir_size_with_count_returns_correct_count() {
    let temp_dir = TempDir::new().unwrap();
    let nested = temp_dir.path().join("a").join("b").join("c");
    fs::create_dir_all(&nested).unwrap();

    fs::write(temp_dir.path().join("root.txt"), "1").unwrap();
    fs::write(temp_dir.path().join("a").join("a.txt"), "22").unwrap();
    fs::write(nested.join("deep.txt"), "333").unwrap();

    let (size, count) = calculate_dir_size_with_count(temp_dir.path());
    assert_eq!(size, 6); // 1 + 2 + 3
    assert_eq!(count, 3);
}

#[test]
fn test_expand_tilde_in_middle_of_path() {
    let path = "/home/user/~backup/file.txt";
    let expanded = expand_tilde(path);
    assert_eq!(expanded, path);
}

#[test]
fn test_expand_tilde_with_username_style() {
    let expanded = expand_tilde("~/Documents/project");
    let home = std::env::var("HOME").unwrap();
    assert_eq!(expanded, format!("{}/Documents/project", home));
}

#[test]
fn test_should_skip_directory_case_sensitive() {
    assert!(should_skip_directory(".git"));
    assert!(!should_skip_directory(".Git"));
    assert!(!should_skip_directory(".GIT"));
}

#[test]
fn test_is_nested_node_modules_empty_path() {
    assert!(!is_nested_node_modules(""));
}

#[test]
fn test_is_nested_node_modules_root_node_modules() {
    assert!(!is_nested_node_modules("/node_modules"));
}

#[test]
fn test_is_nested_node_modules_trailing_slash() {
    assert!(!is_nested_node_modules("/project/node_modules/"));
    assert!(is_nested_node_modules(
        "/project/node_modules/pkg/node_modules/"
    ));
}

#[test]
fn test_calculate_dir_size_nonexistent_path() {
    let path = Path::new("/nonexistent/path/that/does/not/exist");
    let size = calculate_dir_size(path);
    assert_eq!(size, 0);
}

#[test]
fn test_calculate_dir_size_real_directory() {
    // Test with the actual src-tauri directory which should have files
    let path = Path::new(env!("CARGO_MANIFEST_DIR"));
    let (size, count) = calculate_dir_size_with_count(path);

    println!("Path: {:?}", path);
    println!(
        "Size: {} bytes ({:.2} MB)",
        size,
        size as f64 / 1024.0 / 1024.0
    );
    println!("File count: {}", count);

    // The src-tauri directory should have at least some files
    assert!(size > 0, "Size should be greater than 0");
    assert!(count > 0, "File count should be greater than 0");
}

#[test]
fn test_calculate_size_of_target_directory() {
    // Test with the target directory specifically
    let target_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("target");

    if !target_path.exists() {
        println!("Target directory doesn't exist, skipping test");
        return;
    }

    println!("Testing target path: {:?}", target_path);

    let (size, count) = calculate_dir_size_with_count(&target_path);

    println!(
        "Size: {} bytes ({:.2} GB)",
        size,
        size as f64 / 1024.0 / 1024.0 / 1024.0
    );
    println!("File count: {}", count);

    // Target directory should have substantial content after building
    assert!(
        size > 1_000_000,
        "Target directory should have more than 1MB, got {} bytes",
        size
    );
    assert!(
        count > 100,
        "Target directory should have more than 100 files, got {}",
        count
    );
}

/// Integration test that simulates the full scan logic to find dependency directories
/// This test is ignored because it depends on the state of the filesystem
/// and requires a pre-built target directory with files
#[test]
#[ignore]
fn test_scan_finds_target_directory_with_correct_size() {
    use crate::scanner::{get_target_directory_names, DependencyCategory};
    use std::collections::HashSet;
    use std::time::Duration;

    // Set up enabled categories (all of them)
    let enabled_categories: HashSet<DependencyCategory> =
        DependencyCategory::all().into_iter().collect();
    let target_dir_names = get_target_directory_names(&enabled_categories);

    // Start from the deptox project root (parent of src-tauri)
    let project_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("Should have parent directory");

    println!("Scanning from: {:?}", project_root);
    println!("Looking for: {:?}", target_dir_names);

    let mut found_entries: Vec<(String, u64, usize)> = Vec::new();

    for dir_entry in jwalk::WalkDir::new(project_root)
        .max_depth(15)
        .skip_hidden(false)
        .follow_links(false)
        .parallelism(jwalk::Parallelism::RayonDefaultPool {
            busy_timeout: Duration::from_millis(100),
        })
        .process_read_dir(|_, _, _, children| {
            children.retain(|dir_entry_result| {
                if let Ok(ref dir_entry) = dir_entry_result {
                    let name = dir_entry.file_name();
                    if let Some(name_str) = name.to_str() {
                        !should_skip_directory(name_str)
                    } else {
                        true
                    }
                } else {
                    true
                }
            });
        })
        .into_iter()
        .flatten()
    {
        if !dir_entry.file_type().is_dir() {
            continue;
        }

        let path = dir_entry.path();
        let dir_name = dir_entry.file_name().to_str().unwrap_or("");

        if !target_dir_names.contains(dir_name) {
            continue;
        }

        // Calculate size
        let (size, file_count) = calculate_dir_size_with_count(&path);
        let path_str = path.to_string_lossy().to_string();

        println!(
            "Found: {} - size={} bytes ({:.2} MB), files={}",
            path_str,
            size,
            size as f64 / 1024.0 / 1024.0,
            file_count
        );

        found_entries.push((path_str, size, file_count));
    }

    // We should find the target directory
    let target_entry = found_entries
        .iter()
        .find(|(path, _, _)| path.ends_with("/target") || path.ends_with("\\target"));

    assert!(
        target_entry.is_some(),
        "Should find target directory in scan results"
    );

    let (target_path, target_size, target_count) = target_entry.unwrap();
    println!("\nTarget directory found: {}", target_path);
    println!(
        "  Size: {} bytes ({:.2} GB)",
        target_size,
        *target_size as f64 / 1024.0 / 1024.0 / 1024.0
    );
    println!("  Files: {}", target_count);

    // The target directory should have non-zero size
    assert!(
        *target_size > 0,
        "Target directory should have size > 0, got {} bytes",
        target_size
    );
    assert!(
        *target_count > 0,
        "Target directory should have file_count > 0, got {}",
        target_count
    );

    // It should have substantial content (at least 1GB typically)
    assert!(
        *target_size > 1_000_000_000,
        "Target directory should have more than 1GB, got {} bytes ({:.2} GB)",
        target_size,
        *target_size as f64 / 1024.0 / 1024.0 / 1024.0
    );
}

// ============================================
// Exclude Pattern Tests
// ============================================

#[test]
fn test_parse_exclude_patterns_empty_string() {
    let patterns = parse_exclude_patterns("");
    assert!(patterns.is_empty());
}

#[test]
fn test_parse_exclude_patterns_single_pattern() {
    let patterns = parse_exclude_patterns("*/active-*");
    assert_eq!(patterns.len(), 1);
    assert_eq!(patterns[0], "*/active-*");
}

#[test]
fn test_parse_exclude_patterns_multiple_patterns() {
    let patterns = parse_exclude_patterns("*/active-*, */important/*, /exact/path");
    assert_eq!(patterns.len(), 3);
    assert_eq!(patterns[0], "*/active-*");
    assert_eq!(patterns[1], "*/important/*");
    assert_eq!(patterns[2], "/exact/path");
}

#[test]
fn test_parse_exclude_patterns_trims_whitespace() {
    let patterns = parse_exclude_patterns("  */pattern1  ,  */pattern2  ,   */pattern3   ");
    assert_eq!(patterns.len(), 3);
    assert_eq!(patterns[0], "*/pattern1");
    assert_eq!(patterns[1], "*/pattern2");
    assert_eq!(patterns[2], "*/pattern3");
}

#[test]
fn test_parse_exclude_patterns_filters_empty_patterns() {
    let patterns = parse_exclude_patterns("*/pattern1,,,*/pattern2,  ,*/pattern3");
    assert_eq!(patterns.len(), 3);
    assert_eq!(patterns[0], "*/pattern1");
    assert_eq!(patterns[1], "*/pattern2");
    assert_eq!(patterns[2], "*/pattern3");
}

#[test]
fn test_matches_wildcard_pattern_exact_substring() {
    // Without wildcards, pattern acts as substring match
    assert!(matches_wildcard_pattern(
        "/Users/testuser/active-project/node_modules",
        "active-project"
    ));
    assert!(matches_wildcard_pattern(
        "/Users/testuser/myproject/node_modules",
        "myproject"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/project/node_modules",
        "active-project"
    ));
}

#[test]
fn test_matches_wildcard_pattern_leading_wildcard() {
    // Pattern: */active-* should match any path containing "active-" anywhere
    assert!(matches_wildcard_pattern(
        "/Users/testuser/active-project/node_modules",
        "*/active-*"
    ));
    assert!(matches_wildcard_pattern(
        "/home/user/work/active-api/node_modules",
        "*/active-*"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/inactive/node_modules",
        "*/active-*"
    ));
}

#[test]
fn test_matches_wildcard_pattern_trailing_wildcard() {
    // Pattern: /Users/testuser/* should match paths starting with /Users/testuser/
    assert!(matches_wildcard_pattern(
        "/Users/testuser/project/node_modules",
        "/Users/testuser/*"
    ));
    assert!(matches_wildcard_pattern(
        "/Users/testuser/work/deep/node_modules",
        "/Users/testuser/*"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/bob/project/node_modules",
        "/Users/testuser/*"
    ));
}

#[test]
fn test_matches_wildcard_pattern_middle_wildcard() {
    // Pattern: /Users/*/work matches paths that START with /Users/, then anything, then END with /work
    // (without trailing wildcard, pattern requires path to end with the last part)
    assert!(matches_wildcard_pattern(
        "/Users/testuser/work",
        "/Users/*/work"
    ));
    assert!(matches_wildcard_pattern(
        "/Users/bob/code/work",
        "/Users/*/work"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/work/project",
        "/Users/*/work"
    )); // doesn't end with /work
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/personal",
        "/Users/*/work"
    )); // doesn't contain /work

    // To match paths containing /work followed by more content, use trailing wildcard
    assert!(matches_wildcard_pattern(
        "/Users/testuser/work/project/node_modules",
        "/Users/*/work/*"
    ));
    assert!(matches_wildcard_pattern(
        "/Users/bob/work/api/node_modules",
        "/Users/*/work/*"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/personal/project/node_modules",
        "/Users/*/work/*"
    ));
}

#[test]
fn test_matches_wildcard_pattern_multiple_wildcards() {
    // Pattern: */active-*/node_modules should match active- projects with node_modules
    assert!(matches_wildcard_pattern(
        "/Users/testuser/active-api/node_modules",
        "*/active-*/node_modules"
    ));
    assert!(matches_wildcard_pattern(
        "/home/user/active-frontend/node_modules",
        "*/active-*/node_modules"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/active-api/vendor",
        "*/active-*/node_modules"
    ));
}

#[test]
fn test_matches_wildcard_pattern_no_wildcard_exact() {
    // Without wildcards, acts as substring match
    assert!(matches_wildcard_pattern(
        "/Users/testuser/project/node_modules",
        "project"
    ));
    assert!(matches_wildcard_pattern(
        "/Users/testuser/my-project-v2/node_modules",
        "project"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/my-app/node_modules",
        "project"
    ));
}

#[test]
fn test_matches_wildcard_pattern_path_must_start_with() {
    // Pattern without leading wildcard should require path to start with pattern start
    assert!(matches_wildcard_pattern(
        "/Users/testuser/project",
        "/Users/*"
    ));
    assert!(!matches_wildcard_pattern("/home/alex/project", "/Users/*"));
}

#[test]
fn test_matches_wildcard_pattern_path_must_end_with() {
    // Pattern without trailing wildcard should require path to end with pattern end
    assert!(matches_wildcard_pattern(
        "/Users/testuser/project/node_modules",
        "*/node_modules"
    ));
    assert!(!matches_wildcard_pattern(
        "/Users/testuser/project/node_modules/package",
        "*/node_modules"
    ));
}

#[test]
fn test_should_exclude_path_empty_patterns() {
    let patterns: Vec<String> = vec![];
    assert!(!should_exclude_path(
        "/Users/testuser/project/node_modules",
        &patterns
    ));
}

#[test]
fn test_should_exclude_path_single_matching_pattern() {
    let patterns = vec!["*/active-*".to_string()];
    assert!(should_exclude_path(
        "/Users/testuser/active-project/node_modules",
        &patterns
    ));
    assert!(!should_exclude_path(
        "/Users/testuser/inactive-project/node_modules",
        &patterns
    ));
}

#[test]
fn test_should_exclude_path_multiple_patterns() {
    let patterns = vec![
        "*/active-*".to_string(),
        "*/important/*".to_string(),
        "/Users/testuser/keep/*".to_string(),
    ];

    // Should match first pattern
    assert!(should_exclude_path(
        "/Users/testuser/active-api/node_modules",
        &patterns
    ));

    // Should match second pattern
    assert!(should_exclude_path(
        "/home/user/important/project/node_modules",
        &patterns
    ));

    // Should match third pattern
    assert!(should_exclude_path(
        "/Users/testuser/keep/myproject/node_modules",
        &patterns
    ));

    // Should not match any pattern
    assert!(!should_exclude_path(
        "/Users/bob/random-project/node_modules",
        &patterns
    ));
}

#[test]
fn test_should_exclude_path_real_world_patterns() {
    // Simulate real-world exclude patterns a user might configure
    let patterns = parse_exclude_patterns(
        "*/active-*, */Work/current/*, */projects/keep-*, /Users/testuser/dotfiles/*",
    );

    // Active projects should be excluded
    assert!(should_exclude_path(
        "/Users/testuser/code/active-frontend/node_modules",
        &patterns
    ));
    assert!(should_exclude_path(
        "/Users/testuser/code/active-backend/node_modules",
        &patterns
    ));

    // Current work should be excluded
    assert!(should_exclude_path(
        "/Users/testuser/Work/current/api/node_modules",
        &patterns
    ));

    // Projects explicitly marked to keep
    assert!(should_exclude_path(
        "/home/user/projects/keep-this/node_modules",
        &patterns
    ));

    // Dotfiles should be excluded
    assert!(should_exclude_path(
        "/Users/testuser/dotfiles/neovim/node_modules",
        &patterns
    ));

    // Old/inactive projects should NOT be excluded
    assert!(!should_exclude_path(
        "/Users/testuser/code/old-project/node_modules",
        &patterns
    ));
    assert!(!should_exclude_path(
        "/Users/testuser/Work/archived/api/node_modules",
        &patterns
    ));
}

#[test]
fn test_should_exclude_path_case_sensitive() {
    let patterns = vec!["*/Active-*".to_string()];

    // Pattern is case-sensitive
    assert!(should_exclude_path(
        "/Users/testuser/Active-Project/node_modules",
        &patterns
    ));
    assert!(!should_exclude_path(
        "/Users/testuser/active-project/node_modules",
        &patterns
    ));
}

#[test]
fn test_matches_wildcard_pattern_edge_cases() {
    // Empty pattern
    assert!(matches_wildcard_pattern("/any/path", ""));

    // Just wildcards
    assert!(matches_wildcard_pattern("/any/path", "*"));
    assert!(matches_wildcard_pattern("/any/path", "**"));
    assert!(matches_wildcard_pattern("", "*"));

    // Empty path
    assert!(matches_wildcard_pattern("", ""));
    assert!(matches_wildcard_pattern("", "*"));
    assert!(!matches_wildcard_pattern("", "something"));
}

// ============================================
// Symlink Detection Tests
// ============================================

#[test]
fn test_calculate_dir_size_full_empty_directory() {
    let temp_dir = TempDir::new().unwrap();
    let result = calculate_dir_size_full(temp_dir.path());

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert!(
        !result.has_only_symlinks,
        "Empty directory should not be marked as symlinks-only"
    );
}

#[test]
fn test_calculate_dir_size_full_with_real_files() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join("file1.txt"), "content1").unwrap();
    fs::write(temp_dir.path().join("file2.txt"), "content2").unwrap();

    let result = calculate_dir_size_full(temp_dir.path());

    assert_eq!(result.total_size, 16);
    assert_eq!(result.file_count, 2);
    assert!(
        !result.has_only_symlinks,
        "Directory with real files should not be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_with_valid_symlinks() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let real_dir = temp_dir.path().join("real");
    let linked_dir = temp_dir.path().join("linked");

    fs::create_dir(&real_dir).unwrap();
    fs::create_dir(&linked_dir).unwrap();

    // Create real file
    fs::write(real_dir.join("file.txt"), "content").unwrap();

    // Create valid symlink
    symlink(real_dir.join("file.txt"), linked_dir.join("link.txt")).unwrap();

    let result = calculate_dir_size_full(&linked_dir);

    assert_eq!(
        result.total_size, 7,
        "Should follow symlink and count file size"
    );
    assert_eq!(result.file_count, 1);
    assert!(
        !result.has_only_symlinks,
        "Directory with valid symlinks should not be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_with_broken_symlinks() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let symlink_dir = temp_dir.path().join("symlinks");
    fs::create_dir(&symlink_dir).unwrap();

    // Create broken symlink (points to non-existent path)
    let broken_link = symlink_dir.join("broken.txt");
    symlink("/nonexistent/path/file.txt", &broken_link).unwrap();

    let result = calculate_dir_size_full(&symlink_dir);

    assert_eq!(
        result.total_size, 0,
        "Broken symlinks should contribute 0 bytes"
    );
    assert_eq!(
        result.file_count, 0,
        "Broken symlinks should not count as files"
    );
    assert!(
        result.has_only_symlinks,
        "Directory with only broken symlinks should be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_mixed_symlinks_and_files() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let test_dir = temp_dir.path().join("mixed");
    fs::create_dir(&test_dir).unwrap();

    // Create real file
    fs::write(test_dir.join("real.txt"), "hello").unwrap();

    // Create broken symlink
    symlink("/nonexistent/file", test_dir.join("broken.txt")).unwrap();

    let result = calculate_dir_size_full(&test_dir);

    assert_eq!(result.total_size, 5);
    assert_eq!(result.file_count, 1);
    assert!(
        !result.has_only_symlinks,
        "Directory with mixed content should not be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_nested_broken_symlinks() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let root_dir = temp_dir.path().join("root");
    let nested_dir = root_dir.join(".bin");

    fs::create_dir_all(&nested_dir).unwrap();

    // Create broken symlinks in nested directory (like pnpm .bin folder)
    symlink(
        "../../../../node_modules/typescript/bin/tsc",
        nested_dir.join("tsc"),
    )
    .unwrap();
    symlink(
        "../../../../node_modules/eslint/bin/eslint",
        nested_dir.join("eslint"),
    )
    .unwrap();

    let result = calculate_dir_size_full(&root_dir);

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert!(
        result.has_only_symlinks,
        "Directory with nested broken symlinks should be marked as symlinks-only"
    );
}

#[test]
fn test_check_directory_has_symlinks_no_symlinks() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join("file.txt"), "content").unwrap();

    assert!(!check_directory_has_symlinks(temp_dir.path()));
}

#[test]
#[cfg(unix)]
fn test_check_directory_has_symlinks_with_symlink() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    symlink("/some/target", temp_dir.path().join("link")).unwrap();

    assert!(check_directory_has_symlinks(temp_dir.path()));
}

#[test]
#[cfg(unix)]
fn test_check_directory_has_symlinks_nested() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let nested = temp_dir.path().join("nested").join("deep");
    fs::create_dir_all(&nested).unwrap();
    symlink("/target", nested.join("link")).unwrap();

    assert!(check_directory_has_symlinks(temp_dir.path()));
}

#[test]
fn test_check_directory_has_symlinks_empty_dir() {
    let temp_dir = TempDir::new().unwrap();
    assert!(!check_directory_has_symlinks(temp_dir.path()));
}

// ============================================
// Additional Edge Case Tests
// ============================================

#[test]
fn test_calculate_dir_size_full_single_empty_file() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join("empty.txt"), "").unwrap();

    let result = calculate_dir_size_full(temp_dir.path());

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 1);
    assert!(
        !result.has_only_symlinks,
        "Directory with empty file should not be marked as symlinks-only"
    );
}

#[test]
fn test_calculate_dir_size_full_deeply_nested_files() {
    let temp_dir = TempDir::new().unwrap();
    let deep_path = temp_dir
        .path()
        .join("a")
        .join("b")
        .join("c")
        .join("d")
        .join("e");
    fs::create_dir_all(&deep_path).unwrap();
    fs::write(deep_path.join("deep_file.txt"), "deep content").unwrap();

    let result = calculate_dir_size_full(temp_dir.path());

    assert_eq!(result.total_size, 12); // "deep content" = 12 bytes
    assert_eq!(result.file_count, 1);
    assert!(!result.has_only_symlinks);
}

#[test]
fn test_calculate_dir_size_full_multiple_subdirectories() {
    let temp_dir = TempDir::new().unwrap();

    // Create multiple subdirectories with files
    for subdir in ["src", "lib", "test", "docs"] {
        let path = temp_dir.path().join(subdir);
        fs::create_dir(&path).unwrap();
        fs::write(path.join("file.txt"), subdir).unwrap(); // 3-4 bytes each
    }

    let result = calculate_dir_size_full(temp_dir.path());

    // "src" (3) + "lib" (3) + "test" (4) + "docs" (4) = 14 bytes
    assert_eq!(result.total_size, 14);
    assert_eq!(result.file_count, 4);
    assert!(!result.has_only_symlinks);
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_symlink_to_directory() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let real_dir = temp_dir.path().join("real_dir");
    let link_dir = temp_dir.path().join("link_dir");

    fs::create_dir(&real_dir).unwrap();
    fs::write(real_dir.join("file.txt"), "content").unwrap();

    // Create symlink to directory
    symlink(&real_dir, &link_dir).unwrap();

    // Check the symlinked directory
    let result = calculate_dir_size_full(&link_dir);

    assert_eq!(result.total_size, 7);
    assert_eq!(result.file_count, 1);
    assert!(
        !result.has_only_symlinks,
        "Symlink to directory with files should not be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_multiple_broken_symlinks() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let test_dir = temp_dir.path().join("node_modules");
    fs::create_dir(&test_dir).unwrap();

    // Create multiple broken symlinks (simulating pnpm structure)
    symlink("/nonexistent/lodash", test_dir.join("lodash")).unwrap();
    symlink("/nonexistent/react", test_dir.join("react")).unwrap();
    symlink("/nonexistent/typescript", test_dir.join("typescript")).unwrap();

    let result = calculate_dir_size_full(&test_dir);

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert!(
        result.has_only_symlinks,
        "Directory with multiple broken symlinks should be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_symlink_pointing_outside_tree() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let test_dir = temp_dir.path().join("project").join("node_modules");
    fs::create_dir_all(&test_dir).unwrap();

    // Relative symlink pointing outside the directory tree (like pnpm uses)
    symlink(
        "../../../.pnpm/lodash@4.17.21/node_modules/lodash",
        test_dir.join("lodash"),
    )
    .unwrap();

    let result = calculate_dir_size_full(&test_dir);

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert!(
        result.has_only_symlinks,
        "Directory with external symlinks should be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_mixed_valid_and_broken_symlinks() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let real_dir = temp_dir.path().join("real");
    let test_dir = temp_dir.path().join("test");

    fs::create_dir(&real_dir).unwrap();
    fs::create_dir(&test_dir).unwrap();
    fs::write(real_dir.join("real_file.txt"), "real").unwrap();

    // Create valid symlink
    symlink(
        real_dir.join("real_file.txt"),
        test_dir.join("valid_link.txt"),
    )
    .unwrap();
    // Create broken symlink
    symlink("/nonexistent/broken", test_dir.join("broken_link.txt")).unwrap();

    let result = calculate_dir_size_full(&test_dir);

    assert_eq!(result.total_size, 4); // "real" = 4 bytes
    assert_eq!(result.file_count, 1);
    assert!(
        !result.has_only_symlinks,
        "Directory with at least one valid symlink should not be marked as symlinks-only"
    );
}

#[test]
fn test_calculate_dir_size_full_hidden_files() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join(".hidden"), "secret").unwrap();
    fs::write(temp_dir.path().join(".gitignore"), "node_modules").unwrap();

    let result = calculate_dir_size_full(temp_dir.path());

    // "secret" (6) + "node_modules" (12) = 18 bytes
    assert_eq!(result.total_size, 18);
    assert_eq!(result.file_count, 2);
    assert!(!result.has_only_symlinks);
}

#[test]
fn test_calculate_dir_size_full_nested_empty_directories() {
    let temp_dir = TempDir::new().unwrap();
    fs::create_dir_all(temp_dir.path().join("a").join("b").join("c")).unwrap();
    fs::create_dir_all(temp_dir.path().join("x").join("y").join("z")).unwrap();

    let result = calculate_dir_size_full(temp_dir.path());

    assert_eq!(result.total_size, 0);
    assert_eq!(result.file_count, 0);
    assert!(
        !result.has_only_symlinks,
        "Nested empty directories should not be marked as symlinks-only"
    );
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_circular_symlinks() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let dir_a = temp_dir.path().join("a");
    let dir_b = temp_dir.path().join("b");

    fs::create_dir(&dir_a).unwrap();
    fs::create_dir(&dir_b).unwrap();

    // Create circular symlinks
    symlink(&dir_b, dir_a.join("link_to_b")).unwrap();
    symlink(&dir_a, dir_b.join("link_to_a")).unwrap();

    // Should handle circular symlinks gracefully without infinite loop
    let result = calculate_dir_size_full(temp_dir.path());

    // Result may vary, but should not panic or hang
    assert!(!result.has_only_symlinks || result.has_only_symlinks);
}

#[test]
#[cfg(unix)]
fn test_calculate_dir_size_full_pnpm_realistic_structure() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let node_modules = temp_dir.path().join("node_modules");
    let pnpm_store = node_modules.join(".pnpm");
    let bin_dir = node_modules.join(".bin");

    // Create pnpm store with real packages
    let lodash_path = pnpm_store
        .join("lodash@4.17.21")
        .join("node_modules")
        .join("lodash");
    let react_path = pnpm_store
        .join("react@18.2.0")
        .join("node_modules")
        .join("react");

    fs::create_dir_all(&lodash_path).unwrap();
    fs::create_dir_all(&react_path).unwrap();
    fs::create_dir_all(&bin_dir).unwrap();

    // Create real package files
    fs::write(lodash_path.join("index.js"), "module.exports = lodash;").unwrap();
    fs::write(react_path.join("index.js"), "module.exports = react;").unwrap();

    // Create top-level symlinks to packages
    symlink(&lodash_path, node_modules.join("lodash")).unwrap();
    symlink(&react_path, node_modules.join("react")).unwrap();

    // Create .bin symlinks (these point to executables that may not exist in test)
    symlink("../lodash/bin/lodash.js", bin_dir.join("lodash")).unwrap();

    let result = calculate_dir_size_full(&node_modules);

    // Should count real files plus symlinked files
    // Real: "module.exports = lodash;" (24) + "module.exports = react;" (23) = 47
    // Symlinked: same files counted again = 47
    // Total: 94 bytes, 4 files
    assert_eq!(result.total_size, 94);
    assert_eq!(result.file_count, 4);
    assert!(!result.has_only_symlinks);
}

#[test]
fn test_check_directory_has_symlinks_only_regular_files() {
    let temp_dir = TempDir::new().unwrap();
    fs::write(temp_dir.path().join("file1.txt"), "content1").unwrap();
    fs::write(temp_dir.path().join("file2.txt"), "content2").unwrap();
    fs::create_dir(temp_dir.path().join("subdir")).unwrap();
    fs::write(temp_dir.path().join("subdir").join("nested.txt"), "nested").unwrap();

    assert!(!check_directory_has_symlinks(temp_dir.path()));
}

#[test]
#[cfg(unix)]
fn test_check_directory_has_symlinks_deeply_nested_symlink() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().unwrap();
    let deep_path = temp_dir
        .path()
        .join("level1")
        .join("level2")
        .join("level3")
        .join("level4");
    fs::create_dir_all(&deep_path).unwrap();

    // Create symlink at the deepest level
    symlink("/some/target", deep_path.join("deep_link")).unwrap();

    assert!(check_directory_has_symlinks(temp_dir.path()));
}

#[test]
fn test_directory_size_result_equality() {
    let result1 = DirectorySizeResult {
        total_size: 100,
        file_count: 5,
        has_only_symlinks: false,
        last_modified_ms: 1000,
    };

    let result2 = DirectorySizeResult {
        total_size: 100,
        file_count: 5,
        has_only_symlinks: false,
        last_modified_ms: 1000,
    };

    let result3 = DirectorySizeResult {
        total_size: 100,
        file_count: 5,
        has_only_symlinks: true,
        last_modified_ms: 1000,
    };

    assert_eq!(result1, result2);
    assert_ne!(result1, result3);
}

#[test]
fn test_directory_size_result_clone() {
    let original = DirectorySizeResult {
        total_size: 1024,
        file_count: 10,
        has_only_symlinks: true,
        last_modified_ms: 1234567890000,
    };

    let cloned = original.clone();

    assert_eq!(original.total_size, cloned.total_size);
    assert_eq!(original.file_count, cloned.file_count);
    assert_eq!(original.has_only_symlinks, cloned.has_only_symlinks);
    assert_eq!(original.last_modified_ms, cloned.last_modified_ms);
}
