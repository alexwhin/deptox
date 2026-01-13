use super::*;

#[test]
fn test_fixture_creates_temp_directory() {
    let fixture = TestFixture::new();
    assert!(fixture.path().exists());
    assert!(fixture.path().is_dir());
}

#[test]
fn test_create_node_modules() {
    let fixture = TestFixture::new();
    let node_modules = fixture.create_node_modules("test-project", 3, 100);

    assert!(node_modules.exists());
    assert!(node_modules.is_dir());
    assert_eq!(node_modules.file_name().unwrap(), "node_modules");

    let files: Vec<_> = fs::read_dir(&node_modules)
        .unwrap()
        .filter_map(|entry| entry.ok())
        .collect();
    assert_eq!(files.len(), 3);
}

#[test]
fn test_create_node_modules_with_correct_size() {
    let fixture = TestFixture::new();
    let bytes_per_file = 1000;
    let file_count = 5;
    let node_modules = fixture.create_node_modules("sized-project", file_count, bytes_per_file);

    let actual_size = calculate_actual_directory_size(&node_modules);
    let expected_size = (file_count * bytes_per_file) as u64;
    assert_eq!(actual_size, expected_size);
}

#[test]
fn test_create_nested_structure() {
    let fixture = TestFixture::new();
    let paths = fixture.create_nested_structure();

    assert_eq!(paths.len(), 3);
    for path in &paths {
        assert!(path.exists());
        assert_eq!(path.file_name().unwrap(), "node_modules");
    }
}

#[test]
fn test_create_nested_node_modules() {
    let fixture = TestFixture::new();
    let outer_node_modules = fixture.create_nested_node_modules();

    assert!(outer_node_modules.exists());
    let inner_node_modules = outer_node_modules.join("some-package").join("node_modules");
    assert!(inner_node_modules.exists());
}
