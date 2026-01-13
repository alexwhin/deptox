use super::*;

#[test]
fn test_format_bytes_compact_bytes() {
    assert_eq!(format_bytes_compact(0), "0.00B");
    assert_eq!(format_bytes_compact(512), "512.00B");
    assert_eq!(format_bytes_compact(1023), "1023.00B");
}

#[test]
fn test_format_bytes_compact_kilobytes() {
    assert_eq!(format_bytes_compact(1024), "1.00KB");
    assert_eq!(format_bytes_compact(2048), "2.00KB");
    assert_eq!(format_bytes_compact(1024 * 500), "500.00KB");
}

#[test]
fn test_format_bytes_compact_megabytes() {
    assert_eq!(format_bytes_compact(1024 * 1024), "1.00MB");
    assert_eq!(format_bytes_compact(1024 * 1024 * 50), "50.00MB");
    assert_eq!(format_bytes_compact(1024 * 1024 * 999), "999.00MB");
}

#[test]
fn test_format_bytes_compact_gigabytes() {
    assert_eq!(format_bytes_compact(1024 * 1024 * 1024), "1.00GB");
    assert_eq!(format_bytes_compact(1024 * 1024 * 1024 * 5), "5.00GB");
    assert_eq!(format_bytes_compact(1024 * 1024 * 1024 * 18), "18.00GB");
}

#[test]
fn test_format_bytes_compact_terabytes() {
    assert_eq!(format_bytes_compact(1024 * 1024 * 1024 * 1024), "1.00TB");
    assert_eq!(
        format_bytes_compact(1024 * 1024 * 1024 * 1024 * 3),
        "3.00TB"
    );
}

#[test]
fn test_format_bytes_compact_with_decimals() {
    let gb_value = 1024 * 1024 * 1024 + (512 * 1024 * 1024);
    assert_eq!(format_bytes_compact(gb_value), "1.50GB");

    let gb_value_2 = (1024 * 1024 * 1024 * 2) + (768 * 1024 * 1024);
    assert_eq!(format_bytes_compact(gb_value_2), "2.75GB");

    let mb_value = 1024 * 1024 + (256 * 1024);
    assert_eq!(format_bytes_compact(mb_value), "1.25MB");
}
