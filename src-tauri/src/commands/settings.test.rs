use super::*;
use crate::config;
use tempfile::TempDir;

/// Test helper: Loads settings from a specific path
fn load_settings_from_path(path: &PathBuf) -> Result<AppSettings, String> {
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let content =
        fs::read_to_string(path).map_err(|error| format!("Failed to read settings: {}", error))?;

    serde_json::from_str(&content).map_err(|error| format!("Failed to parse settings: {}", error))
}

/// Test helper: Saves settings to a specific path
fn save_settings_to_path(settings: &AppSettings, path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create config directory: {}", error))?;
    }

    let content = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Failed to serialize settings: {}", error))?;

    fs::write(path, content).map_err(|error| format!("Failed to write settings: {}", error))?;

    Ok(())
}

#[test]
fn test_app_settings_default() {
    let settings = AppSettings::default();
    assert_eq!(settings.threshold_bytes, config::defaults::THRESHOLD_BYTES);
    assert!(!settings.root_directory.is_empty());
    assert_eq!(settings.min_size_bytes, 0);
    assert!(!settings.permanent_delete);
    assert!(settings.exclude_paths.is_empty());
    assert_eq!(settings.rescan_interval, RescanInterval::OneDay);
    assert!(settings.confirm_before_delete);
    assert!(settings.notify_on_threshold_exceeded);
    assert_eq!(settings.font_size, FontSize::Default);
    // All categories enabled by default
    assert_eq!(settings.enabled_categories.len(), 8);
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::NodeModules));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::Composer));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::Bundler));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::Pods));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::PythonVenv));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::ElixirDeps));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::DartTool));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::GoMod));
}

#[test]
fn test_app_settings_serialization_camel_case() {
    let mut enabled = HashSet::new();
    enabled.insert(DependencyCategory::NodeModules);
    enabled.insert(DependencyCategory::Composer);

    let settings = AppSettings {
        threshold_bytes: 2_147_483_648,
        root_directory: "/Users/test".to_string(),
        enabled_categories: enabled,
        min_size_bytes: 1_048_576,
        permanent_delete: true,
        exclude_paths: "*/active-*, */important/*".to_string(),
        rescan_interval: RescanInterval::OneWeek,
        confirm_before_delete: true,
        notify_on_threshold_exceeded: false,
        font_size: FontSize::Large,
    };

    let json = serde_json::to_string(&settings).unwrap();
    assert!(json.contains("\"thresholdBytes\":2147483648"));
    assert!(json.contains("\"rootDirectory\":\"/Users/test\""));
    assert!(json.contains("\"enabledCategories\""));
    assert!(json.contains("\"minSizeBytes\":1048576"));
    assert!(json.contains("\"permanentDelete\":true"));
    assert!(json.contains("\"excludePaths\":\"*/active-*, */important/*\""));
    assert!(json.contains("\"rescanInterval\":\"ONE_WEEK\""));
    assert!(json.contains("\"confirmBeforeDelete\":true"));
    assert!(json.contains("\"notifyOnThresholdExceeded\":false"));
    assert!(json.contains("\"fontSize\":\"LARGE\""));
}

#[test]
fn test_app_settings_deserialization() {
    let json = r#"{"thresholdBytes":5368709120,"rootDirectory":"/home/user","enabledCategories":["NODE_MODULES","COMPOSER"],"minSizeBytes":524288,"permanentDelete":true,"excludePaths":"*/skip/*","rescanInterval":"ONE_HOUR","confirmBeforeDelete":true,"notifyOnThresholdExceeded":false}"#;
    let settings: AppSettings = serde_json::from_str(json).unwrap();

    assert_eq!(settings.threshold_bytes, 5_368_709_120);
    assert_eq!(settings.root_directory, "/home/user");
    assert_eq!(settings.enabled_categories.len(), 2);
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::NodeModules));
    assert!(settings
        .enabled_categories
        .contains(&DependencyCategory::Composer));
    assert_eq!(settings.min_size_bytes, 524_288);
    assert!(settings.permanent_delete);
    assert_eq!(settings.exclude_paths, "*/skip/*");
    assert_eq!(settings.rescan_interval, RescanInterval::OneHour);
    assert!(settings.confirm_before_delete);
    assert!(!settings.notify_on_threshold_exceeded);
}

#[test]
fn test_app_settings_deserialization_without_optional_fields_uses_defaults() {
    // Old settings format without optional fields should use defaults
    let json = r#"{"thresholdBytes":5368709120,"rootDirectory":"/home/user"}"#;
    let settings: AppSettings = serde_json::from_str(json).unwrap();

    assert_eq!(settings.threshold_bytes, 5_368_709_120);
    assert_eq!(settings.root_directory, "/home/user");
    // Should default to all categories
    assert_eq!(settings.enabled_categories.len(), 8);
    // Should default to 0 for min_size_bytes
    assert_eq!(settings.min_size_bytes, 0);
    // Should default to false for permanent_delete
    assert!(!settings.permanent_delete);
    // Should default to empty string for exclude_paths
    assert!(settings.exclude_paths.is_empty());
    // Should default to OneDay for rescan_interval
    assert_eq!(settings.rescan_interval, RescanInterval::OneDay);
    // Should default to true for confirm_before_delete
    assert!(settings.confirm_before_delete);
    // Should default to true for notify_on_threshold_exceeded
    assert!(settings.notify_on_threshold_exceeded);
    // Should default to Default for font_size
    assert_eq!(settings.font_size, FontSize::Default);
}

#[test]
fn test_load_settings_from_nonexistent_path() {
    let temp_dir = TempDir::new().unwrap();
    let settings_path = temp_dir.path().join("nonexistent").join("settings.json");

    let result = load_settings_from_path(&settings_path);
    assert!(result.is_ok());

    let settings = result.unwrap();
    assert_eq!(settings.threshold_bytes, config::defaults::THRESHOLD_BYTES);
}

#[test]
fn test_save_and_load_settings() {
    let temp_dir = TempDir::new().unwrap();
    let settings_path = temp_dir.path().join("config").join("settings.json");

    let mut enabled = HashSet::new();
    enabled.insert(DependencyCategory::NodeModules);
    enabled.insert(DependencyCategory::Pods);

    let original = AppSettings {
        threshold_bytes: 3_221_225_472,
        root_directory: "/custom/path".to_string(),
        enabled_categories: enabled,
        min_size_bytes: 10_485_760,
        permanent_delete: true,
        exclude_paths: "*/Work/active-*, */important-project/*".to_string(),
        rescan_interval: RescanInterval::OneHour,
        confirm_before_delete: true,
        notify_on_threshold_exceeded: false,
        font_size: FontSize::ExtraLarge,
    };

    save_settings_to_path(&original, &settings_path).unwrap();
    let loaded = load_settings_from_path(&settings_path).unwrap();

    assert_eq!(loaded.threshold_bytes, original.threshold_bytes);
    assert_eq!(loaded.root_directory, original.root_directory);
    assert_eq!(loaded.enabled_categories, original.enabled_categories);
    assert_eq!(loaded.min_size_bytes, original.min_size_bytes);
    assert_eq!(loaded.permanent_delete, original.permanent_delete);
    assert_eq!(loaded.exclude_paths, original.exclude_paths);
    assert_eq!(loaded.rescan_interval, original.rescan_interval);
    assert_eq!(loaded.confirm_before_delete, original.confirm_before_delete);
    assert_eq!(
        loaded.notify_on_threshold_exceeded,
        original.notify_on_threshold_exceeded
    );
    assert_eq!(loaded.font_size, original.font_size);
}

#[test]
fn test_save_settings_creates_parent_directories() {
    let temp_dir = TempDir::new().unwrap();
    let settings_path = temp_dir
        .path()
        .join("deep")
        .join("nested")
        .join("config")
        .join("settings.json");

    let settings = AppSettings::default();
    let result = save_settings_to_path(&settings, &settings_path);

    assert!(result.is_ok());
    assert!(settings_path.exists());
}

#[test]
fn test_load_settings_with_invalid_json() {
    let temp_dir = TempDir::new().unwrap();
    let settings_path = temp_dir.path().join("settings.json");

    fs::write(&settings_path, "invalid json content").unwrap();

    let result = load_settings_from_path(&settings_path);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Failed to parse settings"));
}

#[test]
fn test_settings_roundtrip_preserves_values() {
    let temp_dir = TempDir::new().unwrap();
    let settings_path = temp_dir.path().join("settings.json");

    let values = [
        (0_u64, "~"),
        (config::defaults::THRESHOLD_BYTES, "/Users/testuser"),
        (10_737_418_240, "/home/user/projects"),
        (u64::MAX, "/"),
    ];

    for (threshold, root) in values {
        let original = AppSettings {
            threshold_bytes: threshold,
            root_directory: root.to_string(),
            enabled_categories: default_enabled_categories(),
            min_size_bytes: default_min_size_bytes(),
            permanent_delete: default_permanent_delete(),
            exclude_paths: default_exclude_paths(),
            rescan_interval: default_rescan_interval(),
            confirm_before_delete: default_confirm_before_delete(),
            notify_on_threshold_exceeded: default_notify_on_threshold_exceeded(),
            font_size: default_font_size(),
        };

        save_settings_to_path(&original, &settings_path).unwrap();
        let loaded = load_settings_from_path(&settings_path).unwrap();

        assert_eq!(
            loaded.threshold_bytes, original.threshold_bytes,
            "Threshold mismatch for value {}",
            threshold
        );
        assert_eq!(
            loaded.root_directory, original.root_directory,
            "Root directory mismatch for value {}",
            root
        );
    }
}

#[test]
fn test_settings_error_display() {
    let error = SettingsError::NoConfigDir;
    assert_eq!(error.to_string(), "Failed to determine config directory");
}

#[test]
fn test_settings_error_display_all_variants() {
    let no_config = SettingsError::NoConfigDir;
    assert!(no_config.to_string().contains("config directory"));

    let create_error = SettingsError::CreateDir(std::io::Error::new(
        std::io::ErrorKind::PermissionDenied,
        "test",
    ));
    assert!(create_error.to_string().contains("create"));

    let read_error = SettingsError::Read(std::io::Error::new(std::io::ErrorKind::NotFound, "test"));
    assert!(read_error.to_string().contains("read"));

    let write_error = SettingsError::Write(std::io::Error::new(
        std::io::ErrorKind::PermissionDenied,
        "test",
    ));
    assert!(write_error.to_string().contains("write"));
}

#[test]
fn test_rescan_interval_serialization() {
    assert_eq!(
        serde_json::to_string(&RescanInterval::OneHour).unwrap(),
        "\"ONE_HOUR\""
    );
    assert_eq!(
        serde_json::to_string(&RescanInterval::OneDay).unwrap(),
        "\"ONE_DAY\""
    );
    assert_eq!(
        serde_json::to_string(&RescanInterval::OneWeek).unwrap(),
        "\"ONE_WEEK\""
    );
    assert_eq!(
        serde_json::to_string(&RescanInterval::OneMonth).unwrap(),
        "\"ONE_MONTH\""
    );
    assert_eq!(
        serde_json::to_string(&RescanInterval::Never).unwrap(),
        "\"NEVER\""
    );
}

#[test]
fn test_rescan_interval_deserialization() {
    assert_eq!(
        serde_json::from_str::<RescanInterval>("\"ONE_HOUR\"").unwrap(),
        RescanInterval::OneHour
    );
    assert_eq!(
        serde_json::from_str::<RescanInterval>("\"ONE_DAY\"").unwrap(),
        RescanInterval::OneDay
    );
    assert_eq!(
        serde_json::from_str::<RescanInterval>("\"ONE_WEEK\"").unwrap(),
        RescanInterval::OneWeek
    );
    assert_eq!(
        serde_json::from_str::<RescanInterval>("\"ONE_MONTH\"").unwrap(),
        RescanInterval::OneMonth
    );
    assert_eq!(
        serde_json::from_str::<RescanInterval>("\"NEVER\"").unwrap(),
        RescanInterval::Never
    );
}

#[test]
fn test_default_functions() {
    assert_eq!(default_enabled_categories().len(), 8);
    assert_eq!(default_min_size_bytes(), 0);
    assert!(!default_permanent_delete());
    assert!(default_exclude_paths().is_empty());
    assert_eq!(default_rescan_interval(), RescanInterval::OneDay);
    assert!(default_confirm_before_delete());
    assert!(default_notify_on_threshold_exceeded());
    assert_eq!(default_font_size(), FontSize::Default);
}

#[test]
fn test_get_settings_path_creates_directory() {
    let result = get_settings_path();
    assert!(result.is_ok());

    let path = result.unwrap();
    assert!(path.ends_with("settings.json"));
    assert!(path.parent().unwrap().exists());
}

#[tokio::test]
async fn test_get_settings_async() {
    let result = get_settings().await;
    assert!(result.is_ok());
}

#[test]
fn test_get_settings_sync_returns_valid_settings() {
    let result = get_settings_sync();
    assert!(result.is_ok());

    let settings = result.unwrap();
    assert!(!settings.root_directory.is_empty());
    assert!(settings.threshold_bytes > 0);
}

#[test]
fn test_rescan_interval_equality() {
    assert_eq!(RescanInterval::OneHour, RescanInterval::OneHour);
    assert_ne!(RescanInterval::OneHour, RescanInterval::Never);
}

#[test]
fn test_rescan_interval_clone() {
    let original = RescanInterval::OneWeek;
    let cloned = original.clone();
    assert_eq!(original, cloned);
}

#[test]
fn test_rescan_interval_copy() {
    let original = RescanInterval::OneHour;
    let copied = original;
    assert_eq!(original, copied);
}

#[test]
fn test_app_settings_clone() {
    let original = AppSettings::default();
    let cloned = original.clone();
    assert_eq!(cloned.threshold_bytes, original.threshold_bytes);
    assert_eq!(cloned.root_directory, original.root_directory);
}

#[tokio::test]
async fn test_save_and_reset_settings_async() {
    let original_settings = get_settings().await.unwrap_or_default();
    let test_threshold = original_settings.threshold_bytes + 1000;

    let new_settings = AppSettings {
        threshold_bytes: test_threshold,
        ..original_settings.clone()
    };

    let save_result = save_settings(new_settings.clone()).await;
    assert!(save_result.is_ok(), "save_settings should succeed");

    let loaded = get_settings().await.unwrap();
    assert_eq!(
        loaded.threshold_bytes, test_threshold,
        "Settings should be saved"
    );

    let reset_result = reset_settings().await;
    assert!(reset_result.is_ok(), "reset_settings should succeed");

    let after_reset = get_settings().await.unwrap();
    assert_eq!(
        after_reset.threshold_bytes,
        config::defaults::THRESHOLD_BYTES,
        "Should use defaults after reset"
    );
}

#[test]
fn test_settings_error_parse() {
    let error = SettingsError::Parse(serde_json::from_str::<AppSettings>("invalid").unwrap_err());
    assert!(error.to_string().contains("parse"));
}

#[test]
fn test_font_size_serialization() {
    assert_eq!(
        serde_json::to_string(&FontSize::Default).unwrap(),
        "\"DEFAULT\""
    );
    assert_eq!(
        serde_json::to_string(&FontSize::Large).unwrap(),
        "\"LARGE\""
    );
    assert_eq!(
        serde_json::to_string(&FontSize::ExtraLarge).unwrap(),
        "\"EXTRA_LARGE\""
    );
}

#[test]
fn test_font_size_deserialization() {
    assert_eq!(
        serde_json::from_str::<FontSize>("\"DEFAULT\"").unwrap(),
        FontSize::Default
    );
    assert_eq!(
        serde_json::from_str::<FontSize>("\"LARGE\"").unwrap(),
        FontSize::Large
    );
    assert_eq!(
        serde_json::from_str::<FontSize>("\"EXTRA_LARGE\"").unwrap(),
        FontSize::ExtraLarge
    );
}

#[test]
fn test_font_size_equality() {
    assert_eq!(FontSize::Default, FontSize::Default);
    assert_ne!(FontSize::Default, FontSize::Large);
    assert_ne!(FontSize::Large, FontSize::ExtraLarge);
}

#[test]
fn test_font_size_clone() {
    let original = FontSize::Large;
    let cloned = original.clone();
    assert_eq!(original, cloned);
}

#[test]
fn test_font_size_copy() {
    let original = FontSize::ExtraLarge;
    let copied = original;
    assert_eq!(original, copied);
}
