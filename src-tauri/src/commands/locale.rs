use tracing::{info, instrument};

#[tauri::command]
#[instrument]
pub fn get_system_locale() -> Result<String, String> {
    info!("Getting system locale");

    let locale = std::env::var("LANG")
        .or_else(|_| std::env::var("LC_ALL"))
        .or_else(|_| std::env::var("LC_MESSAGES"))
        .unwrap_or_else(|_| "en_US.UTF-8".to_string());

    let language_code = locale.split('_').next().unwrap_or("en").to_lowercase();

    info!(locale = %language_code, "System locale detected");
    Ok(language_code)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_system_locale() {
        let result = get_system_locale();
        assert!(result.is_ok());
        let locale = result.unwrap();
        // Should return a non-empty locale string
        assert!(!locale.is_empty());
        // Should be at least 2 characters (language code)
        assert!(locale.len() >= 2);
    }
}
