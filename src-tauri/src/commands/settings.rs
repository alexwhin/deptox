use crate::config;
use crate::scanner::DependencyCategory;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use thiserror::Error;
use tracing::{debug, info, instrument, warn};

/// Validates exclude patterns for length and complexity limits
fn validate_exclude_patterns(exclude_paths: &str) -> Result<(), SettingsError> {
    if exclude_paths.len() > config::exclude_patterns::MAX_TOTAL_LENGTH {
        return Err(SettingsError::InvalidExcludePatterns(format!(
            "Total exclude patterns length exceeds {} characters",
            config::exclude_patterns::MAX_TOTAL_LENGTH
        )));
    }

    let patterns: Vec<&str> = exclude_paths
        .split(',')
        .map(|pattern| pattern.trim())
        .filter(|pattern| !pattern.is_empty())
        .collect();

    if patterns.len() > config::exclude_patterns::MAX_PATTERN_COUNT {
        return Err(SettingsError::InvalidExcludePatterns(format!(
            "Too many exclude patterns (max {})",
            config::exclude_patterns::MAX_PATTERN_COUNT
        )));
    }

    for pattern in patterns {
        if pattern.len() > config::exclude_patterns::MAX_PATTERN_LENGTH {
            return Err(SettingsError::InvalidExcludePatterns(format!(
                "Pattern exceeds {} characters: {}...",
                config::exclude_patterns::MAX_PATTERN_LENGTH,
                &pattern[..50.min(pattern.len())]
            )));
        }

        let wildcard_count = pattern
            .chars()
            .filter(|character| *character == '*')
            .count();
        if wildcard_count > config::exclude_patterns::MAX_WILDCARDS_PER_PATTERN {
            return Err(SettingsError::InvalidExcludePatterns(format!(
                "Pattern has too many wildcards (max {}): {}...",
                config::exclude_patterns::MAX_WILDCARDS_PER_PATTERN,
                &pattern[..50.min(pattern.len())]
            )));
        }
    }

    Ok(())
}

#[derive(Debug, Error)]
pub enum SettingsError {
    #[error("Failed to determine config directory")]
    NoConfigDir,
    #[error("Failed to create config directory: {0}")]
    CreateDir(#[source] std::io::Error),
    #[error("Failed to read settings: {0}")]
    Read(#[source] std::io::Error),
    #[error("Failed to write settings: {0}")]
    Write(#[source] std::io::Error),
    #[error("Failed to parse settings: {0}")]
    Parse(#[source] serde_json::Error),
    #[error("Failed to serialize settings: {0}")]
    Serialize(#[source] serde_json::Error),
    #[error("Invalid exclude patterns: {0}")]
    InvalidExcludePatterns(String),
}

fn default_enabled_categories() -> HashSet<DependencyCategory> {
    DependencyCategory::all().into_iter().collect()
}

fn default_min_size_bytes() -> u64 {
    0
}

fn default_permanent_delete() -> bool {
    false
}

fn default_exclude_paths() -> String {
    String::new()
}

fn default_rescan_interval() -> RescanInterval {
    RescanInterval::OneDay
}

fn default_confirm_before_delete() -> bool {
    true
}

fn default_notify_on_threshold_exceeded() -> bool {
    true
}

fn default_font_size() -> FontSize {
    FontSize::Default
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FontSize {
    Default,
    Large,
    ExtraLarge,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RescanInterval {
    OneHour,
    OneDay,
    OneWeek,
    OneMonth,
    Never,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub threshold_bytes: u64,
    pub root_directory: String,
    #[serde(default = "default_enabled_categories")]
    pub enabled_categories: HashSet<DependencyCategory>,
    #[serde(default = "default_min_size_bytes")]
    pub min_size_bytes: u64,
    #[serde(default = "default_permanent_delete")]
    pub permanent_delete: bool,
    #[serde(default = "default_exclude_paths")]
    pub exclude_paths: String,
    #[serde(default = "default_rescan_interval")]
    pub rescan_interval: RescanInterval,
    #[serde(default = "default_confirm_before_delete")]
    pub confirm_before_delete: bool,
    #[serde(default = "default_notify_on_threshold_exceeded")]
    pub notify_on_threshold_exceeded: bool,
    #[serde(default = "default_font_size")]
    pub font_size: FontSize,
}

impl Default for AppSettings {
    fn default() -> Self {
        let home = dirs::home_dir()
            .map(|path| path.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".to_string());

        Self {
            threshold_bytes: config::defaults::THRESHOLD_BYTES,
            root_directory: home,
            enabled_categories: default_enabled_categories(),
            min_size_bytes: default_min_size_bytes(),
            permanent_delete: default_permanent_delete(),
            exclude_paths: default_exclude_paths(),
            rescan_interval: default_rescan_interval(),
            confirm_before_delete: default_confirm_before_delete(),
            notify_on_threshold_exceeded: default_notify_on_threshold_exceeded(),
            font_size: default_font_size(),
        }
    }
}

fn get_settings_path() -> Result<PathBuf, SettingsError> {
    let config_dir = dirs::config_dir()
        .ok_or(SettingsError::NoConfigDir)?
        .join(config::app::APP_CONFIG_DIR);

    fs::create_dir_all(&config_dir).map_err(SettingsError::CreateDir)?;

    Ok(config_dir.join(config::app::SETTINGS_FILENAME))
}

#[instrument(skip_all)]
pub fn get_settings_sync() -> Result<AppSettings, String> {
    let settings_path = get_settings_path().map_err(|error| error.to_string())?;

    if !settings_path.exists() {
        debug!("Settings file not found, using defaults");
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|error| SettingsError::Read(error).to_string())?;

    serde_json::from_str(&content).map_err(|error| {
        warn!(%error, "Failed to parse settings, using defaults");
        SettingsError::Parse(error).to_string()
    })
}

#[tauri::command]
pub async fn get_settings() -> Result<AppSettings, String> {
    get_settings_sync()
}

#[tauri::command]
#[instrument(skip_all)]
pub async fn save_settings(settings: AppSettings) -> Result<(), String> {
    validate_exclude_patterns(&settings.exclude_paths).map_err(|error| error.to_string())?;

    let settings_path = get_settings_path().map_err(|error| error.to_string())?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|error| SettingsError::Serialize(error).to_string())?;

    fs::write(&settings_path, content).map_err(|error| SettingsError::Write(error).to_string())?;

    debug!(?settings_path, "Settings saved");
    Ok(())
}

#[tauri::command]
#[instrument(skip_all)]
pub async fn reset_settings() -> Result<(), String> {
    info!("Resetting settings to defaults");

    let settings_path = get_settings_path().map_err(|error| error.to_string())?;

    if settings_path.exists() {
        fs::remove_file(&settings_path).map_err(|error| {
            warn!(%error, "Failed to delete settings file");
            format!("Failed to delete settings: {error}")
        })?;
        info!(?settings_path, "Settings file deleted");
    }

    Ok(())
}

#[cfg(test)]
#[path = "settings.test.rs"]
mod tests;
