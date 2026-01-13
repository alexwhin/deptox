use crate::config;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::{debug, error, info, instrument, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub is_licensed: bool,
    pub license_key: Option<String>,
    pub licensed_email: Option<String>,
    /// Indicates whether the license status is from cache due to network failure.
    /// When true, the is_licensed field reflects the last known state, not a fresh validation.
    #[serde(default)]
    pub is_cached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredLicense {
    license_key: String,
    licensed_email: Option<String>,
    validated: bool,
}

#[derive(Debug, Deserialize)]
struct GumroadResponse {
    success: bool,
    message: Option<String>,
    purchase: Option<GumroadPurchase>,
}

#[derive(Debug, Deserialize)]
struct GumroadPurchase {
    email: Option<String>,
    product_id: Option<String>,
    /// The license key that was validated - should match what we sent
    license_key: Option<String>,
}

/// Validates that the Gumroad API response is authentic and matches our product.
/// Returns an error message if validation fails, None if valid.
fn validate_gumroad_response(
    response: &GumroadResponse,
    expected_license_key: &str,
) -> Option<String> {
    if !response.success {
        return None;
    }

    let purchase = match &response.purchase {
        Some(purchase) => purchase,
        None => {
            return Some("Invalid response: missing purchase data".to_string());
        }
    };

    match &purchase.product_id {
        Some(product_id) if product_id == config::gumroad::PRODUCT_ID => {}
        Some(product_id) => {
            warn!(
                expected = config::gumroad::PRODUCT_ID,
                received = %product_id,
                "Product ID mismatch in license response"
            );
            return Some("Invalid license: product mismatch".to_string());
        }
        None => {
            warn!("Missing product_id in license response");
            return Some("Invalid response: missing product verification".to_string());
        }
    }

    match &purchase.license_key {
        Some(response_key) if response_key == expected_license_key => {}
        Some(response_key) => {
            warn!(
                expected = %expected_license_key,
                received = %response_key,
                "License key mismatch in response"
            );
            return Some("Invalid response: license key mismatch".to_string());
        }
        None => {
            warn!("Missing license_key in license response");
            return Some("Invalid response: missing license verification".to_string());
        }
    }

    None
}

fn get_license_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Failed to determine config directory".to_string())?
        .join(config::app::APP_CONFIG_DIR);

    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("Failed to create config directory: {error}"))?;

    Ok(config_dir.join(config::app::LICENSE_FILENAME))
}

fn load_stored_license() -> Option<StoredLicense> {
    let license_path = get_license_path().ok()?;

    if !license_path.exists() {
        return None;
    }

    let content = fs::read_to_string(&license_path).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_stored_license(license: &StoredLicense) -> Result<(), String> {
    let license_path = get_license_path()?;

    let content = serde_json::to_string_pretty(license)
        .map_err(|error| format!("Failed to serialize license: {error}"))?;

    fs::write(&license_path, content)
        .map_err(|error| format!("Failed to write license file: {error}"))?;

    debug!(?license_path, "License saved");
    Ok(())
}

fn delete_stored_license() -> Result<(), String> {
    let license_path = get_license_path()?;

    if license_path.exists() {
        fs::remove_file(&license_path)
            .map_err(|error| format!("Failed to delete license file: {error}"))?;
        info!(?license_path, "License file deleted");
    }

    Ok(())
}

#[tauri::command]
#[instrument(skip_all)]
pub async fn get_license_info() -> Result<LicenseInfo, String> {
    debug!("Getting license info");

    match load_stored_license() {
        Some(stored) if stored.validated => {
            debug!(email = ?stored.licensed_email, "Found valid stored license");
            Ok(LicenseInfo {
                is_licensed: true,
                license_key: Some(mask_license_key(&stored.license_key)),
                licensed_email: stored.licensed_email,
                is_cached: false,
            })
        }
        Some(_) => {
            debug!("Found stored license but not validated");
            Ok(LicenseInfo {
                is_licensed: false,
                license_key: None,
                licensed_email: None,
                is_cached: false,
            })
        }
        None => {
            debug!("No stored license found");
            Ok(LicenseInfo {
                is_licensed: false,
                license_key: None,
                licensed_email: None,
                is_cached: false,
            })
        }
    }
}

#[tauri::command]
#[instrument(skip_all)]
pub async fn activate_license(license_key: String) -> Result<LicenseInfo, String> {
    info!("Attempting to activate license");

    let trimmed_key = license_key.trim().to_string();

    if trimmed_key.is_empty() {
        return Err("License key cannot be empty".to_string());
    }

    let client = reqwest::Client::new();

    let response = client
        .post(config::gumroad::API_URL)
        .form(&[
            ("product_id", config::gumroad::PRODUCT_ID),
            ("license_key", &trimmed_key),
            ("increment_uses_count", "false"),
        ])
        .send()
        .await
        .map_err(|error| {
            error!(%error, "Failed to connect to Gumroad API");
            format!("Failed to verify license: {error}")
        })?;

    let gumroad_response: GumroadResponse = response.json().await.map_err(|error| {
        error!(%error, "Failed to parse Gumroad response");
        format!("Failed to parse license response: {error}")
    })?;

    if !gumroad_response.success {
        let message = gumroad_response
            .message
            .unwrap_or_else(|| "Invalid license key".to_string());
        warn!(%message, "License validation failed");
        return Err(message);
    }

    if let Some(validation_error) = validate_gumroad_response(&gumroad_response, &trimmed_key) {
        error!(%validation_error, "Gumroad response validation failed");
        return Err(validation_error);
    }

    let email = gumroad_response
        .purchase
        .and_then(|purchase| purchase.email);

    info!(email = ?email, "License validated successfully");

    let stored_license = StoredLicense {
        license_key: trimmed_key.clone(),
        licensed_email: email.clone(),
        validated: true,
    };

    save_stored_license(&stored_license)?;

    Ok(LicenseInfo {
        is_licensed: true,
        license_key: Some(mask_license_key(&trimmed_key)),
        licensed_email: email,
        is_cached: false,
    })
}

#[tauri::command]
#[instrument(skip_all)]
pub async fn revalidate_license() -> Result<LicenseInfo, String> {
    info!("Revalidating stored license");

    let stored = match load_stored_license() {
        Some(license) => license,
        None => {
            debug!("No stored license to revalidate");
            return Ok(LicenseInfo {
                is_licensed: false,
                license_key: None,
                licensed_email: None,
                is_cached: false,
            });
        }
    };

    let client = reqwest::Client::new();

    let response = client
        .post(config::gumroad::API_URL)
        .form(&[
            ("product_id", config::gumroad::PRODUCT_ID),
            ("license_key", stored.license_key.as_str()),
            ("increment_uses_count", "false"),
        ])
        .send()
        .await;

    let response = match response {
        Ok(response) => response,
        Err(error) => {
            warn!(%error, "Network error during revalidation, returning cached state");
            return Ok(LicenseInfo {
                is_licensed: stored.validated,
                license_key: Some(mask_license_key(&stored.license_key)),
                licensed_email: stored.licensed_email,
                is_cached: true,
            });
        }
    };

    let gumroad_response: GumroadResponse = match response.json().await {
        Ok(response) => response,
        Err(error) => {
            warn!(%error, "Failed to parse revalidation response, returning cached state");
            return Ok(LicenseInfo {
                is_licensed: stored.validated,
                license_key: Some(mask_license_key(&stored.license_key)),
                licensed_email: stored.licensed_email,
                is_cached: true,
            });
        }
    };

    if gumroad_response.success {
        if let Some(validation_error) =
            validate_gumroad_response(&gumroad_response, &stored.license_key)
        {
            error!(%validation_error, "Gumroad revalidation response validation failed");
            return Err(validation_error);
        }

        debug!("License revalidation successful");
        Ok(LicenseInfo {
            is_licensed: true,
            license_key: Some(mask_license_key(&stored.license_key)),
            licensed_email: stored.licensed_email,
            is_cached: false,
        })
    } else {
        let message = gumroad_response
            .message
            .unwrap_or_else(|| "License expired or invalid".to_string());
        warn!(%message, "License revalidation failed");

        let invalid_license = StoredLicense {
            license_key: stored.license_key.clone(),
            licensed_email: stored.licensed_email,
            validated: false,
        };
        let _ = save_stored_license(&invalid_license);

        Err(message)
    }
}

#[tauri::command]
#[instrument(skip_all)]
pub async fn deactivate_license() -> Result<(), String> {
    info!("Deactivating license");
    delete_stored_license()?;
    Ok(())
}

fn mask_license_key(key: &str) -> String {
    let char_count = key.chars().count();

    if char_count <= 8 {
        return "*".repeat(char_count);
    }

    let first: String = key.chars().take(4).collect();
    let last: String = key.chars().skip(char_count - 4).collect();
    format!("{first}...{last}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_license_key() {
        assert_eq!(mask_license_key("ABCD-1234-EFGH-5678"), "ABCD...5678");
        assert_eq!(mask_license_key("SHORT"), "*****");
        assert_eq!(mask_license_key("12345678"), "********");
        assert_eq!(mask_license_key("123456789"), "1234...6789");
    }

    #[test]
    fn test_validate_gumroad_response_success_with_valid_data() {
        let response = GumroadResponse {
            success: true,
            message: None,
            purchase: Some(GumroadPurchase {
                email: Some("user@example.com".to_string()),
                product_id: Some(config::gumroad::PRODUCT_ID.to_string()),
                license_key: Some("TEST-LICENSE-KEY".to_string()),
            }),
        };

        let result = validate_gumroad_response(&response, "TEST-LICENSE-KEY");
        assert!(result.is_none(), "Valid response should pass validation");
    }

    #[test]
    fn test_validate_gumroad_response_failed_response_skips_validation() {
        let response = GumroadResponse {
            success: false,
            message: Some("Invalid license".to_string()),
            purchase: None,
        };

        let result = validate_gumroad_response(&response, "ANY-KEY");
        assert!(result.is_none(), "Failed responses should skip validation");
    }

    #[test]
    fn test_validate_gumroad_response_missing_purchase() {
        let response = GumroadResponse {
            success: true,
            message: None,
            purchase: None,
        };

        let result = validate_gumroad_response(&response, "TEST-KEY");
        assert!(result.is_some(), "Missing purchase should fail validation");
        assert!(result.unwrap().contains("missing purchase data"));
    }

    #[test]
    fn test_validate_gumroad_response_wrong_product_id() {
        let response = GumroadResponse {
            success: true,
            message: None,
            purchase: Some(GumroadPurchase {
                email: Some("user@example.com".to_string()),
                product_id: Some("WRONG-PRODUCT-ID".to_string()),
                license_key: Some("TEST-KEY".to_string()),
            }),
        };

        let result = validate_gumroad_response(&response, "TEST-KEY");
        assert!(result.is_some(), "Wrong product ID should fail validation");
        assert!(result.unwrap().contains("product mismatch"));
    }

    #[test]
    fn test_validate_gumroad_response_missing_product_id() {
        let response = GumroadResponse {
            success: true,
            message: None,
            purchase: Some(GumroadPurchase {
                email: Some("user@example.com".to_string()),
                product_id: None,
                license_key: Some("TEST-KEY".to_string()),
            }),
        };

        let result = validate_gumroad_response(&response, "TEST-KEY");
        assert!(
            result.is_some(),
            "Missing product ID should fail validation"
        );
        assert!(result.unwrap().contains("missing product verification"));
    }

    #[test]
    fn test_validate_gumroad_response_wrong_license_key() {
        let response = GumroadResponse {
            success: true,
            message: None,
            purchase: Some(GumroadPurchase {
                email: Some("user@example.com".to_string()),
                product_id: Some(config::gumroad::PRODUCT_ID.to_string()),
                license_key: Some("DIFFERENT-KEY".to_string()),
            }),
        };

        let result = validate_gumroad_response(&response, "EXPECTED-KEY");
        assert!(result.is_some(), "Wrong license key should fail validation");
        assert!(result.unwrap().contains("license key mismatch"));
    }

    #[test]
    fn test_validate_gumroad_response_missing_license_key() {
        let response = GumroadResponse {
            success: true,
            message: None,
            purchase: Some(GumroadPurchase {
                email: Some("user@example.com".to_string()),
                product_id: Some(config::gumroad::PRODUCT_ID.to_string()),
                license_key: None,
            }),
        };

        let result = validate_gumroad_response(&response, "TEST-KEY");
        assert!(
            result.is_some(),
            "Missing license key should fail validation"
        );
        assert!(result.unwrap().contains("missing license verification"));
    }
}
