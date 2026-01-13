pub mod app {
    pub const APP_CONFIG_DIR: &str = "deptox";
    pub const SETTINGS_FILENAME: &str = "settings.json";
    pub const LICENSE_FILENAME: &str = "license.json";
}

pub mod gumroad {
    pub const PRODUCT_ID: &str = "-I6OpIuv1ULHDdhOvkCs5g==";
    pub const API_URL: &str = "https://api.gumroad.com/v2/licenses/verify";
}

pub mod defaults {
    pub const THRESHOLD_BYTES: u64 = 5_368_709_120;
    pub const BACKGROUND_THRESHOLD_BYTES: u64 = 1_073_741_824;
}

pub mod scanner {
    use std::time::Duration;

    pub const MAX_SCAN_DEPTH: usize = 15;
    pub const SIZE_POOL_THREADS: usize = 8;
    pub const EMIT_THROTTLE: Duration = Duration::from_millis(50);
    pub const JWALK_BUSY_TIMEOUT: Duration = Duration::from_millis(100);
    pub const PREVIOUS_SCAN_TIMEOUT: Duration = Duration::from_secs(2);
    pub const MAX_TIMEOUT_RETRIES: usize = 3;
}

pub mod background {
    pub const SCAN_INTERVAL_MINUTES: u64 = 30;
}

pub mod delete {
    pub const MAX_CONCURRENT_DELETES: usize = 4;
}

pub mod largest_files {
    pub const MAX_FILES: usize = 8;
}

pub mod window {
    pub const SIZES: [(&str, f64, f64); 3] = [
        ("DEFAULT", 475.0, 607.0),
        ("LARGE", 490.0, 628.0),
        ("EXTRA_LARGE", 505.0, 650.0),
    ];
    pub const DEFAULT_WIDTH: f64 = 475.0;
    pub const DEFAULT_HEIGHT: f64 = 607.0;
}

pub mod bytes {
    pub const KB: f64 = 1024.0;
    pub const MB: f64 = KB * 1024.0;
    pub const GB: f64 = MB * 1024.0;
    pub const TB: f64 = GB * 1024.0;
}

pub mod exclude_patterns {
    pub const MAX_PATTERN_LENGTH: usize = 500;
    pub const MAX_PATTERN_COUNT: usize = 50;
    pub const MAX_TOTAL_LENGTH: usize = 10_000;
    pub const MAX_WILDCARDS_PER_PATTERN: usize = 10;
}
